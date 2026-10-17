import { createReadStream, mkdirSync } from "node:fs";
import { ContentError } from "./content-errors.mjs";
import {
  enqueueUpload,
  getAssetView,
  listAssetViews,
  parseSingleRange,
  queueCounts,
  retryAsset,
} from "./content-media.mjs";
import { openContentStore } from "./content-store.mjs";
import {
  checkDerivedStore,
  describeRegularFile,
  directoryUsage,
  hashFileBounded,
  hashesEqual,
} from "./content-storage.mjs";
import {
  createWork,
  getAdmin,
  getPublic,
  isPublishedAsset,
  listAdmin,
  listPublic,
  previewWork,
  publishWork,
  unpublishWork,
  updateWork,
} from "./content-works.mjs";
import { readPasswordFile, verifyPassword } from "./owner-password.mjs";
import {
  assertBoundary,
  assertCsrf,
  clientSource,
  cookieHeader,
  createSession,
  finishLoginSuccess,
  keepLoginFailure,
  readCookie,
  readSession,
  releaseLoginReservation,
  requireSession,
  reserveLoginAttempt,
  revokeAllSessions,
  revokeToken,
  sessionCookieName,
} from "./owner-session.mjs";

const ASSET_ID = /^[0-9a-f]{32}$/;
const JSON_LIMIT = 512 * 1024;

export function registerContent(app, config) {
  const db = openContentStore(config.dbPath);
  mkdirSync(config.stagingRoot, { recursive: true });
  app.addHook("onClose", async () => {
    try {
      db.close();
    } catch {
      /* The store may already be closed. */
    }
  });
  app.addHook("onRequest", async (req, reply) => {
    const path = req.url.split("?")[0];
    if (
      path.startsWith("/api/works") ||
      path.startsWith("/api/owner") ||
      path.startsWith("/api/media")
    ) {
      reply.header("Cache-Control", "no-store");
      reply.header("X-Content-Type-Options", "nosniff");
    }
  });
  app.addContentTypeParser(
    "application/octet-stream",
    { bodyLimit: config.maxUploadBytes },
    (req, payload, done) => {
      collectUpload(config, req, payload, done);
    },
  );

  const guard = (req, { csrf = false } = {}) => {
    assertBoundary(req, config, { originRequired: csrf });
    const session = requireSession(db, req, config);
    if (csrf) assertCsrf(req, session);
    return session;
  };

  app.get("/api/works", async () => ({ works: listPublic(db) }));
  app.get("/api/works/:slug", async (req) => ({ work: getPublic(db, req.params.slug) }));

  app.post("/api/owner/session", async (req, reply) => {
    assertBoundary(req, config, { originRequired: true });
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.password !== "string") {
      throw new ContentError(400, "请提供口令。", "invalid_body");
    }
    if (body.password.length < 1 || body.password.length > 200) {
      throw new ContentError(400, "口令格式无效。", "invalid_body");
    }
    const now = config.now();
    const source = clientSource(req);
    const reservation = reserveLoginAttempt(db, source, now, config);
    let ok = false;
    try {
      ok = await verifyPassword(body.password, readPasswordFile(config.ownerPasswordFile));
    } catch (error) {
      releaseLoginReservation(db, reservation);
      throw error;
    }
    if (!ok) {
      keepLoginFailure(db, source, now, reservation);
      throw new ContentError(401, "口令不正确。", "invalid_password");
    }
    finishLoginSuccess(db, source, reservation);
    const session = createSession(db, config, now, readCookie(req, sessionCookieName(config)));
    reply.header("Set-Cookie", cookieHeader(session.token, config));
    return {
      authenticated: true,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  });

  app.get("/api/owner/session", async (req) => {
    assertBoundary(req, config);
    const session = readSession(db, readCookie(req, sessionCookieName(config)), config, config.now());
    if (!session) return { authenticated: false };
    return { authenticated: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt };
  });

  app.delete("/api/owner/session", async (req, reply) => {
    const session = guard(req, { csrf: true });
    revokeToken(db, readCookie(req, sessionCookieName(config)), config.now());
    reply.header("Set-Cookie", cookieHeader("", config, { clear: true }));
    return { authenticated: false };
  });

  app.post("/api/owner/revoke-sessions", async (req, reply) => {
    guard(req, { csrf: true });
    revokeAllSessions(db, config.now());
    reply.header("Set-Cookie", cookieHeader("", config, { clear: true }));
    return { authenticated: false, revoked: true };
  });

  app.get("/api/owner/works", async (req) => {
    guard(req);
    return { works: listAdmin(db) };
  });
  app.post("/api/owner/works", { bodyLimit: JSON_LIMIT }, async (req, reply) => {
    guard(req, { csrf: true });
    const work = createWork(db, req.body?.draft, config.now());
    return reply.code(201).send({ work });
  });
  app.get("/api/owner/works/:id", async (req) => {
    guard(req);
    return { work: getAdmin(db, req.params.id) };
  });
  app.put("/api/owner/works/:id", { bodyLimit: JSON_LIMIT }, async (req) => {
    guard(req, { csrf: true });
    return {
      work: updateWork(db, req.params.id, req.body?.revision, req.body?.draft, config.now()),
    };
  });
  app.post("/api/owner/works/:id/publish", async (req) => {
    guard(req, { csrf: true });
    return { work: publishWork(db, req.params.id, requireRevision(req.body), config) };
  });
  app.post("/api/owner/works/:id/unpublish", async (req) => {
    guard(req, { csrf: true });
    return { work: unpublishWork(db, req.params.id, requireRevision(req.body), config.now()) };
  });
  app.get("/api/owner/works/:id/preview", async (req) => {
    guard(req);
    return { work: previewWork(db, req.params.id) };
  });

  app.post(
    "/api/owner/uploads",
    {
      bodyLimit: config.maxUploadBytes,
      onRequest: async (req) => {
        guard(req, { csrf: true });
      },
    },
    async (req, reply) => {
    const type = String(req.headers["content-type"] || "").toLowerCase();
    if (type !== "application/octet-stream") {
      throw new ContentError(415, "上传只接受 application/octet-stream。", "unsupported_type");
    }
    const filename = req.query?.filename;
    if (typeof filename !== "string") {
      throw new ContentError(400, "需要提供文件名。", "invalid_filename");
    }
    const asset = await enqueueUpload(db, config, { filename, body: req.body });
    return reply.code(202).send({ asset });
  },
  );
  app.get("/api/owner/assets", async (req) => {
    guard(req);
    return { assets: listAssetViews(db) };
  });
  app.get("/api/owner/assets/:id", async (req) => {
    guard(req);
    return { asset: getAssetView(db, req.params.id) };
  });
  app.post("/api/owner/assets/:id/retry", async (req) => {
    guard(req, { csrf: true });
    return { asset: retryAsset(db, config, req.params.id) };
  });
  app.get("/api/owner/storage", async (req) => {
    guard(req);
    const marker = checkDerivedStore(config.derivedRoot, config.storeId);
    let stagingBytes = 0;
    try {
      stagingBytes = directoryUsage(config.stagingRoot);
    } catch {
      stagingBytes = -1;
    }
    return {
      available: marker.ok && stagingBytes >= 0,
      code: marker.ok ? (stagingBytes < 0 ? "io_error" : null) : marker.reason,
      queue: queueCounts(db),
      stagingBytes: Math.max(0, stagingBytes),
      stagingQuotaBytes: config.stagingQuotaBytes,
      queueLimit: config.queueLimit,
    };
  });

  app.route({
    method: ["GET", "HEAD"],
    url: "/api/media/:id",
    handler: (req, reply) => serveMedia(db, config, req, reply, false),
  });
  app.route({
    method: ["GET", "HEAD"],
    url: "/api/media/:id/poster",
    handler: (req, reply) => serveMedia(db, config, req, reply, true),
  });
  return { db };
}

function requireRevision(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !Number.isInteger(body.revision)) {
    throw new ContentError(400, "需要提供整数版本号。", "invalid_body");
  }
  return body.revision;
}

function collectUpload(config, req, payload, done) {
  const url = String(req.raw?.url || req.url || "").split("?")[0];
  if (url !== "/api/owner/uploads") {
    const error = new Error("unsupported media type");
    error.statusCode = 415;
    payload.resume();
    done(error);
    return;
  }
  const limit = config.maxUploadBytes;
  let settled = false;
  const finish = (error, body) => {
    if (settled) return;
    settled = true;
    payload.pause();
    payload.removeAllListeners("data");
    payload.removeAllListeners("end");
    payload.removeAllListeners("error");
    payload.removeAllListeners("aborted");
    if (error) {
      done(error);
      setImmediate(() => {
        if (!payload.destroyed) payload.destroy();
      });
      return;
    }
    done(null, body);
  };
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > limit) {
    finish(new ContentError(413, "文件超过大小上限。", "too_large"));
    return;
  }
  const chunks = [];
  let received = 0;
  payload.on("data", (chunk) => {
    if (settled) return;
    const size = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
    received += size;
    if (received > limit) {
      finish(new ContentError(413, "文件超过大小上限。", "too_large"));
      return;
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  payload.on("end", () => {
    finish(null, received === 0 ? Buffer.alloc(0) : Buffer.concat(chunks));
  });
  payload.on("error", () => {
    finish(new ContentError(400, "上传连接已中断。", "upload_aborted"));
  });
  payload.on("aborted", () => {
    finish(new ContentError(400, "上传连接已中断。", "upload_aborted"));
  });
}

async function serveMedia(db, config, req, reply, poster) {
  const id = req.params.id;
  if (typeof id !== "string" || !ASSET_ID.test(id)) return mediaError(reply, 404, "没有找到对应的内容。", "not_found");
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
  if (!asset || asset.status !== "ready") return mediaError(reply, 404, "没有找到对应的内容。", "not_found");
  const published = isPublishedAsset(db, id);
  if (!published && !ownerCanRead(db, config, req)) {
    return mediaError(reply, 404, "没有找到对应的内容。", "not_found");
  }
  const marker = checkDerivedStore(config.derivedRoot, config.storeId);
  if (!marker.ok) {
    return mediaError(reply, 503, "存储暂时不可用，暂时不能提供这个文件。", "storage_unavailable");
  }
  if (poster && asset.kind !== "video") return mediaError(reply, 404, "没有找到对应的内容。", "not_found");
  const relative = poster ? asset.poster_rel : asset.derived_rel;
  const file = relative ? describeRegularFile(config.derivedRoot, relative) : null;
  const expectSha = poster ? asset.poster_sha256 : asset.derived_sha256;
  const expectBytes = poster ? asset.poster_bytes : asset.derived_bytes;
  const hashed = file ? await hashFileBounded(file.full, expectBytes) : null;
  if (!hashed || !hashesEqual(hashed.sha, expectSha)) {
    return mediaError(reply, 503, "存储暂时不可用，暂时不能提供这个文件。", "media_unavailable");
  }
  const type = poster || asset.kind !== "video" ? "image/webp" : "video/mp4";
  const range = parseSingleRange(req.headers.range, hashed.bytes);
  if (range?.error) {
    reply.header("Content-Range", `bytes */${hashed.bytes}`);
    reply.header("Accept-Ranges", "bytes");
    reply.header("Cache-Control", "private, no-store");
    reply.code(416);
    if (req.method === "HEAD") return reply.send();
    return reply.send({ error: "请求的范围无效。", code: "range_not_satisfiable" });
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : hashed.bytes - 1;
  const length = end - start + 1;
  reply.header("Content-Type", type);
  reply.header("Content-Length", String(length));
  reply.header("Accept-Ranges", "bytes");
  reply.header("Cache-Control", "private, no-store");
  reply.header("X-Content-Type-Options", "nosniff");
  if (range) reply.header("Content-Range", `bytes ${start}-${end}/${hashed.bytes}`);
  reply.code(range ? 206 : 200);
  if (req.method === "HEAD") return reply.send();
  let stream;
  try {
    stream = createReadStream(file.full, { start, end, highWaterMark: 64 * 1024 });
  } catch {
    return mediaError(reply, 503, "存储暂时不可用，暂时不能提供这个文件。", "media_unavailable");
  }
  stream.on("error", () => {
    stream.destroy();
  });
  return reply.send(stream);
}

function ownerCanRead(db, config, req) {
  try {
    assertBoundary(req, config);
    return Boolean(readSession(db, readCookie(req, sessionCookieName(config)), config, config.now()));
  } catch {
    return false;
  }
}

function mediaError(reply, status, error, code) {
  reply.header("Cache-Control", "private, no-store");
  reply.header("X-Content-Type-Options", "nosniff");
  reply.code(status);
  if (reply.request?.method === "HEAD") return reply.send();
  return reply.send({ error, code });
}
