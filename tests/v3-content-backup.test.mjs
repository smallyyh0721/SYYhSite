import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createBackup, restoreBackup } from "../services/guestbook/content-backup.mjs";
import { openContentStore } from "../services/guestbook/content-store.mjs";

const WORK_SQL =
  "SELECT id, slug, revision, published_revision AS publishedRevision, status FROM works ORDER BY slug";
const ASSET_SQL =
  `SELECT id, status, kind, bytes, original_sha256 AS originalSha256,
          derived_sha256 AS derivedSha256, derived_bytes AS derivedBytes,
          poster_sha256 AS posterSha256, poster_bytes AS posterBytes
   FROM assets ORDER BY created_at`;

function insertWork(db, id, slug, stamp) {
  db.prepare(
    `INSERT INTO works(
       id, slug, revision, published_revision, status, draft_json, snapshot_json, created_at, updated_at
     ) VALUES(?, ?, 1, NULL, 'draft', '{}', NULL, ?, ?)`,
  ).run(id, slug, stamp, stamp);
}

function insertAsset(db, id, stamp) {
  db.prepare(
    `INSERT INTO assets(
       id, filename, ext, status, kind, bytes, staging_name,
       original_sha256, derived_sha256, derived_bytes, created_at, updated_at
     ) VALUES(?, 'kept.png', 'png', 'ready', 'image', 12, 'staging-kept',
              'abc', 'def', 8, ?, ?)`,
  ).run(id, stamp, stamp);
}

test("backup manifest matches the frozen copy when the live database changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "syyh-v3-backup-"));
  const dbPath = join(dir, "content.sqlite");
  const outDir = join(dir, "out");
  const live = openContentStore(dbPath);
  try {
    insertWork(live, "work-kept", "kept-work", "2026-10-16T00:00:00.000Z");
    insertAsset(live, "asset-kept", "2026-10-16T00:00:00.000Z");
    live.prepare(
      `INSERT INTO sessions(id, csrf_token, created_at, last_seen_at, expires_at, revoked_at)
       VALUES('live-session', 'csrf-secret-token', 10, 10, 4102444800000, NULL)`,
    ).run();
  } finally {
    live.close();
  }

  const created = await createBackup({
    contentDbPath: dbPath,
    outDir,
    storeId: "store-test-0001",
    afterSnapshot: () => {
      const writer = new DatabaseSync(dbPath);
      writer.exec("PRAGMA busy_timeout = 5000");
      try {
        insertWork(writer, "work-late", "after-snapshot", "2026-10-16T00:00:02.000Z");
        insertAsset(writer, "asset-late", "2026-10-16T00:00:02.000Z");
      } finally {
        writer.close();
      }
    },
  });

  const manifest = JSON.parse(readFileSync(join(outDir, created.manifest), "utf8"));
  const copy = new DatabaseSync(join(outDir, created.contentBackup), { readOnly: true });
  const liveAfter = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const copyWorks = copy.prepare(WORK_SQL).all();
    const copyAssets = copy.prepare(ASSET_SQL).all();
    const liveWorks = liveAfter.prepare(WORK_SQL).all();
    const liveAssets = liveAfter.prepare(ASSET_SQL).all();
    assert.deepEqual(manifest.works, JSON.parse(JSON.stringify(copyWorks)));
    assert.deepEqual(manifest.assets, JSON.parse(JSON.stringify(copyAssets)));
    assert.deepEqual(
      manifest.works.map((work) => work.slug),
      ["kept-work"],
    );
    assert.equal(liveWorks.some((work) => work.slug === "after-snapshot"), true);
    assert.equal(manifest.works.some((work) => work.slug === "after-snapshot"), false);
    assert.equal(copyWorks.some((work) => work.slug === "after-snapshot"), false);
    assert.equal(liveAssets.length, copyAssets.length + 1);
    assert.equal(manifest.storeId, "store-test-0001");
    const text = JSON.stringify(manifest);
    assert.equal(text.includes("csrf-secret-token"), false);
    assert.equal(text.includes("after-snapshot"), false);
    assert.equal(text.includes(dir), false);
    assert.equal(copy.prepare("SELECT revoked_at FROM sessions WHERE id = 'live-session'").get().revoked_at, null);
    assert.equal(
      liveAfter.prepare("SELECT revoked_at FROM sessions WHERE id = 'live-session'").get().revoked_at,
      null,
    );
  } finally {
    copy.close();
    liveAfter.close();
  }

  const restoredPath = join(dir, "restored.sqlite");
  const restored = await restoreBackup({
    backupFile: join(outDir, created.contentBackup),
    destination: restoredPath,
  });
  assert.equal(restored.sessionsRevoked, 1);
  const restoredDb = new DatabaseSync(restoredPath, { readOnly: true });
  const liveStill = new DatabaseSync(dbPath, { readOnly: true });
  const copyStill = new DatabaseSync(join(outDir, created.contentBackup), { readOnly: true });
  try {
    assert.equal(restoredDb.prepare("SELECT slug FROM works").all().map((row) => row.slug).join(), "kept-work");
    assert.notEqual(
      restoredDb.prepare("SELECT revoked_at FROM sessions WHERE id = 'live-session'").get().revoked_at,
      null,
    );
    assert.equal(
      liveStill.prepare("SELECT revoked_at FROM sessions WHERE id = 'live-session'").get().revoked_at,
      null,
    );
    assert.equal(
      copyStill.prepare("SELECT revoked_at FROM sessions WHERE id = 'live-session'").get().revoked_at,
      null,
    );
  } finally {
    restoredDb.close();
    liveStill.close();
    copyStill.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
