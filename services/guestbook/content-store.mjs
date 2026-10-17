import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY,
  source_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_source ON login_attempts(source_key, created_at);
CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL,
  published_revision INTEGER,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  draft_json TEXT NOT NULL,
  snapshot_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS works_status ON works(status, slug);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  ext TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'ready', 'error')),
  kind TEXT CHECK (kind IS NULL OR kind IN ('image', 'video')),
  error TEXT,
  bytes INTEGER NOT NULL,
  staging_name TEXT NOT NULL,
  original_rel TEXT,
  derived_rel TEXT,
  poster_rel TEXT,
  original_sha256 TEXT,
  original_bytes INTEGER,
  derived_sha256 TEXT,
  derived_bytes INTEGER,
  poster_sha256 TEXT,
  poster_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  claim_token TEXT,
  lease_until INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assets_queue ON assets(status, created_at);
CREATE TABLE IF NOT EXISTS publication_assets (
  work_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  PRIMARY KEY (work_id, asset_id)
);
CREATE INDEX IF NOT EXISTS publication_assets_asset ON publication_assets(asset_id);
`;

export function openContentStore(dbPath) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  const columns = db.prepare("PRAGMA table_info(assets)").all();
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("claim_token")) db.exec("ALTER TABLE assets ADD COLUMN claim_token TEXT");
  if (!names.has("lease_until")) db.exec("ALTER TABLE assets ADD COLUMN lease_until INTEGER");
  db.exec("PRAGMA user_version = 2");
  return db;
}

export function immediate(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* The transaction may already be closed. */
    }
    throw error;
  }
}

export function isUniqueConstraint(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  return text.includes("UNIQUE") || text.includes("constraint failed");
}

export function iso(ms) {
  return new Date(ms).toISOString();
}
