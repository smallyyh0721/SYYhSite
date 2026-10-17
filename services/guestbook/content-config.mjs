import { LIMITS } from "./content-storage.mjs";

const REQUIRED = [
  ["dbPath", "CONTENT_DB_PATH"],
  ["publicOrigin", "PUBLIC_ORIGIN"],
  ["ownerPasswordFile", "OWNER_PASSWORD_FILE"],
  ["derivedRoot", "DERIVED_ROOT"],
  ["storeId", "STORE_ID"],
  ["stagingRoot", "STAGING_ROOT"],
];

export function resolveContentConfig(content) {
  if (content === false) return null;
  if (content == null) {
    if (!process.env.CONTENT_DB_PATH) return null;
    return normalizeContentConfig({
      dbPath: process.env.CONTENT_DB_PATH,
      publicOrigin: process.env.PUBLIC_ORIGIN,
      ownerPasswordFile: process.env.OWNER_PASSWORD_FILE,
      derivedRoot: process.env.DERIVED_ROOT,
      storeId: process.env.STORE_ID,
      stagingRoot: process.env.STAGING_ROOT,
      allowInsecureDev: process.env.ALLOW_INSECURE_DEV === "1",
      cosSiteRoot: process.env.COS_SITE_ROOT || null,
      guestbookDbPath: process.env.DB_PATH || null,
    });
  }
  return normalizeContentConfig({
    allowInsecureDev: process.env.ALLOW_INSECURE_DEV === "1",
    cosSiteRoot: process.env.COS_SITE_ROOT || null,
    guestbookDbPath: process.env.DB_PATH || null,
    ...content,
  });
}

export function normalizeContentConfig(input) {
  const missing = REQUIRED.filter(([key]) => !input?.[key]).map(([, env]) => env);
  if (missing.length) {
    throw new Error(`内容模块配置不完整：${missing.join("、")}`);
  }
  const allowInsecureDev = Boolean(input.allowInsecureDev);
  const publicOrigin = assertPublicOrigin(input.publicOrigin, allowInsecureDev);
  const storeId = String(input.storeId);
  if (!/^[\w.:-]{4,128}$/.test(storeId)) {
    throw new Error("STORE_ID 需要是 4–128 位字母、数字、点、下划线、冒号或连字符。");
  }
  return {
    dbPath: input.dbPath,
    publicOrigin,
    ownerPasswordFile: input.ownerPasswordFile,
    derivedRoot: input.derivedRoot,
    storeId,
    stagingRoot: input.stagingRoot,
    cosSiteRoot: input.cosSiteRoot || null,
    guestbookDbPath: input.guestbookDbPath || null,
    allowInsecureDev,
    now: typeof input.now === "function" ? input.now : () => Date.now(),
    maxUploadBytes: numberLimit(input.maxUploadBytes, LIMITS.maxUploadBytes),
    stagingQuotaBytes: numberLimit(input.stagingQuotaBytes, LIMITS.stagingQuotaBytes),
    queueLimit: numberLimit(input.queueLimit, LIMITS.queueLimit),
    maxSessions: numberLimit(input.maxSessions, LIMITS.maxSessions),
    loginIpLimit: numberLimit(input.loginIpLimit, LIMITS.loginIpLimit),
    loginGlobalLimit: numberLimit(input.loginGlobalLimit, LIMITS.loginGlobalLimit),
    loginWindowMs: numberLimit(input.loginWindowMs, LIMITS.loginWindowMs),
    sessionAbsoluteMs: numberLimit(input.sessionAbsoluteMs, LIMITS.sessionAbsoluteMs),
    sessionIdleMs: numberLimit(input.sessionIdleMs, LIMITS.sessionIdleMs),
  };
}

export function assertPublicOrigin(value, allowInsecureDev) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PUBLIC_ORIGIN 不是有效地址。");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("PUBLIC_ORIGIN 只能是不含路径的来源。");
  }
  const loopback =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && allowInsecureDev && loopback) return url.origin;
  throw new Error("PUBLIC_ORIGIN 必须是 HTTPS。只有显式开发模式的本机 HTTP 可以例外。");
}

function numberLimit(value, fallback) {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("内容模块的数值配置无效。");
  }
  return value;
}

export function workerConfigFromEnv(extra = {}) {
  const dbPath = extra.dbPath || process.env.CONTENT_DB_PATH;
  const stagingRoot = extra.stagingRoot || process.env.STAGING_ROOT;
  const cosSiteRoot = extra.cosSiteRoot || process.env.COS_SITE_ROOT;
  const storeId = extra.storeId || process.env.STORE_ID;
  const missing = [];
  if (!dbPath) missing.push("CONTENT_DB_PATH");
  if (!stagingRoot) missing.push("STAGING_ROOT");
  if (!cosSiteRoot) missing.push("COS_SITE_ROOT");
  if (!storeId) missing.push("STORE_ID");
  if (missing.length) throw new Error(`媒体处理配置不完整：${missing.join("、")}`);
  return {
    dbPath,
    stagingRoot,
    cosSiteRoot,
    storeId: String(storeId),
    ffmpegPath: extra.ffmpegPath || process.env.FFMPEG_PATH || "",
    ffprobePath: extra.ffprobePath || process.env.FFPROBE_PATH || "",
    now: extra.now || (() => Date.now()),
  };
}
