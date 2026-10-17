import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { ContentError } from "./content-errors.mjs";

const scryptAsync = promisify(scrypt);
const PARAMS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let scryptTail = Promise.resolve();

function withScrypt(work) {
  const run = scryptTail.then(work, work);
  scryptTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function parsePasswordHash(encoded) {
  if (typeof encoded !== "string") return null;
  const parts = encoded.trim().split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (N !== PARAMS.N || r !== PARAMS.r || p !== PARAMS.p) return null;
  let salt;
  let key;
  try {
    salt = Buffer.from(parts[4], "base64url");
    key = Buffer.from(parts[5], "base64url");
  } catch {
    return null;
  }
  if (salt.length < 16 || key.length !== 32) return null;
  return { N, r, p, salt, key };
}

export async function hashPassword(password) {
  assertPasswordPolicy(password);
  const salt = randomBytes(16);
  const key = await withScrypt(() =>
    scryptAsync(password, salt, 32, PARAMS),
  );
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const parsed = parsePasswordHash(encoded);
  if (!parsed) {
    throw new ContentError(503, "站主口令配置无效。", "owner_unconfigured");
  }
  if (typeof password !== "string" || password.length < 1 || password.length > 200) {
    return false;
  }
  const actual = await withScrypt(() =>
    scryptAsync(password, parsed.salt, parsed.key.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: PARAMS.maxmem,
    }),
  );
  return timingSafeEqual(actual, parsed.key);
}

export function assertPasswordPolicy(password) {
  if (typeof password !== "string" || /[\r\n\0]/.test(password)) {
    throw new ContentError(400, "口令需要 12–200 个字符。", "invalid_password");
  }
  const length = Array.from(password).length;
  if (length < 12 || password.length > 200) {
    throw new ContentError(400, "口令需要 12–200 个字符。", "invalid_password");
  }
}

export function readPasswordFile(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    throw new ContentError(503, "站主口令尚未配置。", "owner_unconfigured");
  }
}

export function writePasswordFile(file, encoded) {
  writeFileSync(file, `${encoded}\n`, { mode: 0o600 });
}
