import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { ContentError } from "./content-errors.mjs";

export const LIMITS = {
  maxUploadBytes: 30 * 1024 * 1024,
  maxEdge: 12000,
  maxPixels: 40_000_000,
  derivedMaxEdge: 1680,
  maxDerivedImageBytes: 8 * 1024 * 1024,
  maxDerivedVideoBytes: 32 * 1024 * 1024,
  maxPosterBytes: 2 * 1024 * 1024,
  stagingQuotaBytes: 2 * 1024 * 1024 * 1024,
  queueLimit: 100,
  videoMaxDuration: 180,
  videoMaxWidth: 3840,
  videoMaxHeight: 2160,
  sessionAbsoluteMs: 8 * 60 * 60 * 1000,
  sessionIdleMs: 30 * 60 * 1000,
  loginIpLimit: 5,
  loginGlobalLimit: 30,
  loginWindowMs: 15 * 60 * 1000,
  maxSessions: 5,
  backupDaily: 7,
  backupWeekly: 4,
  workerLeaseMs: 60_000,
  workerHeartbeatMs: 15_000,
};

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function readFileSyncHash(full) {
  try {
    const data = readFileSync(full);
    return { sha: sha256(data), bytes: data.length, data };
  } catch {
    return null;
  }
}

const HASH_CHUNK = 64 * 1024;

export async function hashFileBounded(full, expectedBytes) {
  const cap = Math.max(
    LIMITS.maxDerivedImageBytes,
    LIMITS.maxDerivedVideoBytes,
    LIMITS.maxPosterBytes,
  );
  if (!Number.isInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > cap) return null;
  let handle;
  try {
    handle = await open(full, "r");
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== expectedBytes) return null;
    const hash = createHash("sha256");
    const buf = Buffer.alloc(HASH_CHUNK);
    let offset = 0;
    while (offset < expectedBytes) {
      const length = Math.min(buf.length, expectedBytes - offset);
      const { bytesRead } = await handle.read(buf, 0, length, offset);
      if (bytesRead <= 0) return null;
      hash.update(buf.subarray(0, bytesRead));
      offset += bytesRead;
    }
    return { sha: hash.digest("hex"), bytes: offset };
  } catch {
    return null;
  } finally {
    if (handle) await handle.close().catch(() => undefined);
  }
}

export function hashesEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  if (!/^[0-9a-f]+$/i.test(left) || left.length % 2 !== 0) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function storageError(check) {
  const reason = check?.reason || "io_error";
  const message =
    reason === "marker_mismatch"
      ? "存储标记与本站不一致，已停止这项操作。"
      : "存储暂时不可用，已停止这项操作。";
  return new ContentError(503, message, "storage_unavailable");
}

export function readStoreMarker(directory, storeId) {
  try {
    const marker = join(directory, ".syyh-store-id");
    const stat = lstatSync(marker);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return { ok: false, reason: "marker_missing" };
    }
    const text = readFileSync(marker, "utf8").replace(/\r?\n$/, "");
    if (text !== storeId) return { ok: false, reason: "marker_mismatch" };
    const root = lstatSync(directory);
    if (root.isSymbolicLink() || (!root.isDirectory() && !root.isFile())) {
      return { ok: false, reason: "io_error" };
    }
    return { ok: true };
  } catch (error) {
    if (error?.code === "ENOENT") return { ok: false, reason: "marker_missing" };
    return { ok: false, reason: "io_error" };
  }
}

export function checkDerivedStore(derivedRoot, storeId) {
  return readStoreMarker(derivedRoot, storeId);
}

export function checkWorkerStore(cosSiteRoot, storeId) {
  const root = readStoreMarker(cosSiteRoot, storeId);
  if (!root.ok) return root;
  return readStoreMarker(join(cosSiteRoot, "derived"), storeId);
}

export function containedPath(root, relativePosix) {
  if (typeof relativePosix !== "string" || relativePosix.length === 0 || relativePosix.includes("\0")) {
    return null;
  }
  if (isAbsolute(relativePosix)) return null;
  const parts = relativePosix.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === "." || part === "..")) return null;
  const rootResolved = resolve(root);
  const full = resolve(rootResolved, ...parts);
  const rel = relative(rootResolved, full);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  return full;
}

export function describeRegularFile(root, relativePosix) {
  const full = containedPath(root, relativePosix);
  if (!full) return null;
  let stat;
  try {
    stat = lstatSync(full);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) return null;
  try {
    const realRoot = realpathSync(root);
    const realFile = realpathSync(full);
    const rel = relative(realRoot, realFile);
    if (rel.startsWith("..") || isAbsolute(rel)) return null;
  } catch {
    return null;
  }
  return { full, size: stat.size };
}

export function directoryUsage(root) {
  let total = 0;
  let entries = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = join(root, entry.name);
    if (entry.isFile()) total += statSync(full).size;
    else if (entry.isDirectory()) total += directoryUsage(full);
  }
  return total;
}

export function writeNewObject(root, directoryRel, extension, bytes) {
  const name = `${randomBytes(16).toString("hex")}${extension}`;
  const rel = `${String(directoryRel).replaceAll("\\", "/")}/${name}`.replaceAll("//", "/");
  const full = containedPath(root, rel);
  if (!full) throw new ContentError(500, "派生路径无效。", "storage_unavailable");
  const rootReal = realpathSync(root);
  mkdirSync(dirname(full), { recursive: true });
  const parentReal = realpathSync(dirname(full));
  const parentRel = relative(rootReal, parentReal);
  if (parentRel.startsWith("..") || isAbsolute(parentRel)) {
    throw new ContentError(503, "存储路径越界，已停止写入。", "storage_unavailable");
  }
  const handle = openSync(full, "wx", 0o600);
  try {
    writeSync(handle, bytes);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  let read;
  try {
    read = readFileSync(full);
  } catch {
    removeQuiet(full);
    throw new ContentError(503, "读回校验失败，已停止发布这份文件。", "readback_failed");
  }
  const expected = sha256(bytes);
  const actual = sha256(read);
  const stat = lstatSync(full);
  if (
    read.length !== bytes.length ||
    !hashesEqual(expected, actual) ||
    !stat.isFile() ||
    stat.isSymbolicLink()
  ) {
    removeQuiet(full);
    throw new ContentError(503, "读回校验失败，已停止发布这份文件。", "readback_failed");
  }
  return { rel, sha: actual, bytes: read.length, full };
}

export function removeQuiet(full) {
  try {
    unlinkSync(full);
  } catch {
    /* A failed new object should not block the original error. */
  }
}
