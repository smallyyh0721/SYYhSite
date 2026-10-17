import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { ContentError } from "./content-errors.mjs";
import { openContentStore } from "./content-store.mjs";
import { LIMITS } from "./content-storage.mjs";

export async function createBackup({
  contentDbPath,
  guestbookDbPath,
  outDir,
  storeId,
  afterSnapshot,
}) {
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const contentName = `content-${stamp}.sqlite`;
  const contentPath = join(outDir, contentName);
  if (existsSync(contentPath)) {
    throw new ContentError(409, "备份文件已存在，未覆盖。", "backup_exists");
  }
  const source = openContentStore(contentDbPath);
  try {
    await backup(source, contentPath);
    if (afterSnapshot) await afterSnapshot({ contentPath });
  } finally {
    source.close();
  }
  const manifest = manifestFromBackupCopy(contentPath, storeId);
  const manifestName = `content-${stamp}.manifest.json`;
  writeFileSync(join(outDir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  let guestbookName = null;
  if (guestbookDbPath && existsSync(guestbookDbPath)) {
    guestbookName = `guestbook-${stamp}.sqlite`;
    const guestbookPath = join(outDir, guestbookName);
    if (existsSync(guestbookPath)) {
      throw new ContentError(409, "留言备份文件已存在，未覆盖。", "backup_exists");
    }
    const guest = new DatabaseSync(guestbookDbPath);
    try {
      await backup(guest, guestbookPath);
    } finally {
      guest.close();
    }
  }
  const quota = retentionReport(outDir);
  return {
    contentBackup: contentName,
    guestbookBackup: guestbookName,
    manifest: manifestName,
    quota,
  };
}

export async function restoreBackup({ backupFile, destination }) {
  if (!existsSync(backupFile)) {
    throw new ContentError(400, "找不到要恢复的备份。", "missing_backup");
  }
  if (existsSync(destination)) {
    throw new ContentError(409, "恢复目标已存在，未覆盖。", "restore_exists");
  }
  const source = new DatabaseSync(backupFile, { readOnly: true });
  try {
    await backup(source, destination);
  } finally {
    source.close();
  }
  const restored = openContentStore(destination);
  try {
    const sessionsRevoked = Number(
      restored
        .prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL")
        .run(Date.now()).changes,
    );
    return { restored: basename(destination), sessionsRevoked };
  } finally {
    restored.close();
  }
}

function manifestFromBackupCopy(contentPath, storeId) {
  const copy = new DatabaseSync(contentPath, { readOnly: true });
  try {
    return buildManifest(copy, storeId);
  } finally {
    copy.close();
  }
}

function buildManifest(db, storeId) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    storeId: storeId || null,
    note: "恢复到独立数据库后会撤销其中的会话。此清单不含口令、会话或绝对路径。",
    works: db
      .prepare(
        "SELECT id, slug, revision, published_revision AS publishedRevision, status FROM works ORDER BY slug",
      )
      .all(),
    assets: db
      .prepare(
        `SELECT id, status, kind, bytes, original_sha256 AS originalSha256,
                derived_sha256 AS derivedSha256, derived_bytes AS derivedBytes,
                poster_sha256 AS posterSha256, poster_bytes AS posterBytes
         FROM assets ORDER BY created_at`,
      )
      .all(),
  };
}

export function retentionReport(outDir) {
  let names = [];
  try {
    names = readdirSync(outDir);
  } catch {
    names = [];
  }
  const days = new Set();
  const weeks = new Set();
  for (const name of names) {
    const match = /^content-(\d{4}-\d{2}-\d{2})/.exec(name);
    if (!match || !name.endsWith(".sqlite")) continue;
    days.add(match[1]);
    weeks.add(isoWeek(match[1]));
  }
  const quota = {
    daily: days.size,
    dailyMax: LIMITS.backupDaily,
    weekly: weeks.size,
    weeklyMax: LIMITS.backupWeekly,
    exceeded: days.size > LIMITS.backupDaily || weeks.size > LIMITS.backupWeekly,
    deleted: false,
  };
  return quota;
}

function isoWeek(day) {
  const date = new Date(`${day}T00:00:00Z`);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
