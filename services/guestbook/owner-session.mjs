import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ContentError } from "./content-errors.mjs";
import { immediate, iso } from "./content-store.mjs";

export const COOKIE_NAME = "__Host-syyh_owner";
export const DEV_COOKIE_NAME = "syyh_owner";

export function sessionCookieName(config) {
  return String(config.publicOrigin).startsWith("https:") ? COOKIE_NAME : DEV_COOKIE_NAME;
}

export function tokensEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function readCookie(req, name) {
  if (typeof name !== "string" || name.length === 0) return null;
  const raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

export function cookieHeader(token, config, { clear = false } = {}) {
  const name = sessionCookieName(config);
  const parts = [
    `${name}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (name === COOKIE_NAME) parts.push("Secure");
  parts.push(clear ? "Max-Age=0" : `Max-Age=${Math.floor(config.sessionAbsoluteMs / 1000)}`);
  return parts.join("; ");
}

export function assertBoundary(req, config, { originRequired = false } = {}) {
  const expected = new URL(config.publicOrigin);
  const host = req.headers.host;
  if (typeof host !== "string" || host !== expected.host) {
    throw new ContentError(403, "请求主机不被接受。", "host_rejected");
  }
  const forwardedHost = req.headers["x-forwarded-host"];
  if (forwardedHost != null) {
    const value = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    if (typeof value !== "string" || value.split(",")[0].trim() !== expected.host) {
      throw new ContentError(403, "请求主机不被接受。", "host_rejected");
    }
  }
  const origin = req.headers.origin;
  if (originRequired || origin != null) {
    if (origin !== config.publicOrigin) {
      throw new ContentError(403, "请求来源不被接受。", "origin_rejected");
    }
  }
  if (expected.protocol === "https:" && requestProtocol(req) !== "https") {
    throw new ContentError(403, "管理操作需要安全连接。", "tls_required");
  }
}

function requestProtocol(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  if (Array.isArray(forwarded) || (typeof forwarded === "string" && forwarded.includes(","))) {
    return "invalid";
  }
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.trim().toLowerCase();
  if (req.raw?.socket?.encrypted || req.socket?.encrypted) return "https";
  return "http";
}

export function clientSource(req) {
  const ip = typeof req.ip === "string" ? req.ip : "unknown";
  return ip.slice(0, 80);
}

export function reserveLoginAttempt(db, source, now, config) {
  const since = now - config.loginWindowMs;
  const decision = immediate(db, () => {
    db.prepare("DELETE FROM login_attempts WHERE created_at < ?").run(since);
    const ipCount = db
      .prepare(
        "SELECT COUNT(*) AS n FROM login_attempts WHERE source_key = ? AND created_at >= ?",
      )
      .get(source, since).n;
    const globalCount = db
      .prepare(
        "SELECT COUNT(*) AS n FROM login_attempts WHERE source_key = '*' AND created_at >= ?",
      )
      .get(since).n;
    if (ipCount >= config.loginIpLimit || globalCount >= config.loginGlobalLimit) {
      const oldest = db
        .prepare(
          `SELECT MIN(created_at) AS t FROM login_attempts
           WHERE created_at >= ? AND (source_key = ? OR source_key = '*')`,
        )
        .get(since, source).t;
      const retryAfter = Number.isFinite(oldest)
        ? Math.max(1, Math.ceil((oldest + config.loginWindowMs - now) / 1000))
        : Math.max(1, Math.ceil(config.loginWindowMs / 1000));
      return { limited: true, retryAfter };
    }
    const insert = db.prepare(
      "INSERT INTO login_attempts(source_key, created_at) VALUES(?, ?)",
    );
    return {
      limited: false,
      sourceId: Number(insert.run(source, now).lastInsertRowid),
      globalId: Number(insert.run("*", now).lastInsertRowid),
    };
  });
  if (decision.limited) {
    throw new ContentError(429, "登录尝试过多，请稍后再来。", "rate_limited", {
      retryAfter: decision.retryAfter,
    });
  }
  return decision;
}

export function releaseLoginReservation(db, reservation) {
  if (!reservation) return;
  db.prepare("DELETE FROM login_attempts WHERE id = ? OR id = ?").run(
    reservation.sourceId,
    reservation.globalId,
  );
}

export function finishLoginSuccess(db, source, reservation) {
  immediate(db, () => {
    db.prepare("DELETE FROM login_attempts WHERE id = ?").run(reservation.globalId);
    db.prepare("DELETE FROM login_attempts WHERE source_key = ?").run(source);
  });
}

export function keepLoginFailure(db, source, now, reservation) {
  if (!db.prepare("SELECT 1 AS ok FROM login_attempts WHERE id = ?").get(reservation.sourceId)) {
    db.prepare("INSERT INTO login_attempts(source_key, created_at) VALUES(?, ?)").run(source, now);
  }
  if (!db.prepare("SELECT 1 AS ok FROM login_attempts WHERE id = ?").get(reservation.globalId)) {
    db.prepare("INSERT INTO login_attempts(source_key, created_at) VALUES('*', ?)").run(now);
  }
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(db, config, now, previousToken) {
  if (previousToken) revokeToken(db, previousToken, now);
  const token = randomBytes(32).toString("base64url");
  const id = tokenHash(token);
  const csrf = randomBytes(32).toString("base64url");
  const expiresAt = now + config.sessionAbsoluteMs;
  immediate(db, () => {
    const active = db
      .prepare(
        `SELECT id FROM sessions
         WHERE revoked_at IS NULL AND expires_at > ? AND last_seen_at + ? > ?
         ORDER BY created_at ASC`,
      )
      .all(now, config.sessionIdleMs, now);
    const overflow = active.length - (config.maxSessions - 1);
    if (overflow > 0) {
      const revoke = db.prepare(
        "UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
      );
      for (let index = 0; index < overflow; index += 1) revoke.run(now, active[index].id);
    }
    db.prepare(
      `INSERT INTO sessions(id, csrf_token, created_at, last_seen_at, expires_at, revoked_at)
       VALUES(?, ?, ?, ?, ?, NULL)`,
    ).run(id, csrf, now, now, expiresAt);
  });
  return {
    token,
    csrfToken: csrf,
    expiresAt: iso(Math.min(expiresAt, now + config.sessionIdleMs)),
  };
}

export function readSession(db, token, config, now) {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(tokenHash(token));
  if (!row || row.revoked_at != null) return null;
  if (now >= row.expires_at || now >= row.last_seen_at + config.sessionIdleMs) return null;
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(now, row.id);
  return {
    id: row.id,
    csrfToken: row.csrf_token,
    expiresAt: iso(Math.min(row.expires_at, now + config.sessionIdleMs)),
  };
}

export function requireSession(db, req, config) {
  const session = readSession(db, readCookie(req, sessionCookieName(config)), config, config.now());
  if (!session) throw new ContentError(401, "需要站主登录。", "unauthenticated");
  return session;
}

export function assertCsrf(req, session) {
  const header = req.headers["x-csrf-token"];
  if (typeof header !== "string" || !tokensEqual(header, session.csrfToken)) {
    throw new ContentError(403, "缺少或无效的安全校验。", "csrf_invalid");
  }
}

export function revokeToken(db, token, now) {
  if (typeof token !== "string" || token.length === 0) return;
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(
    now,
    tokenHash(token),
  );
}

export function revokeAllSessions(db, now) {
  return Number(
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL").run(now).changes,
  );
}
