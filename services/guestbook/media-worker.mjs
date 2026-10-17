import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { workerConfigFromEnv } from "./content-config.mjs";
import { processClaimedAsset } from "./content-media.mjs";
import { immediate, iso, openContentStore } from "./content-store.mjs";
import { LIMITS, checkWorkerStore } from "./content-storage.mjs";

const chains = new Map();

export function runWorkerOnce(options = {}) {
  const normalized = options.dbPath ? options : workerConfigFromEnv(options);
  const key = normalized.dbPath;
  const previous = chains.get(key) || Promise.resolve();
  const run = previous.then(
    () => once(normalized),
    () => once(normalized),
  );
  chains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function once(options) {
  const storage = checkWorkerStore(options.cosSiteRoot, options.storeId);
  if (!storage.ok) return { processed: false, storage: storage.reason };
  const db = openContentStore(options.dbPath);
  let stopHeartbeat = () => {};
  try {
    const now = options.now || (() => Date.now());
    const claimed = claim(db, now());
    if (!claimed) return { processed: false };
    stopHeartbeat = heartbeat(db, claimed, now);
    await processClaimedAsset(db, claimed, { ...options, now });
    const row = db.prepare("SELECT status FROM assets WHERE id = ?").get(claimed.id);
    return { processed: true, id: claimed.id, status: row?.status || "error" };
  } finally {
    stopHeartbeat();
    db.close();
  }
}

function claim(db, nowMs) {
  return immediate(db, () => {
    const stamp = iso(nowMs);
    const leaseUntil = nowMs + LIMITS.workerLeaseMs;
    const claimToken = randomBytes(16).toString("hex");
    db.prepare(
      `UPDATE assets
       SET status = 'queued', claim_token = NULL, lease_until = NULL, updated_at = ?
       WHERE status = 'processing' AND (lease_until IS NULL OR lease_until <= ?)`,
    ).run(stamp, nowMs);
    const row = db
      .prepare(
        "SELECT * FROM assets WHERE status = 'queued' ORDER BY created_at ASC, rowid ASC LIMIT 1",
      )
      .get();
    if (!row) return null;
    const updated = db
      .prepare(
        `UPDATE assets
         SET status = 'processing', error = NULL, claim_token = ?, lease_until = ?, updated_at = ?
         WHERE id = ? AND status = 'queued'`,
      )
      .run(claimToken, leaseUntil, stamp, row.id);
    if (updated.changes !== 1) return null;
    return { ...row, status: "processing", claim_token: claimToken, lease_until: leaseUntil };
  });
}

function heartbeat(db, asset, now) {
  const timer = setInterval(() => {
    try {
      const at = now();
      db.prepare(
        `UPDATE assets SET lease_until = ?, updated_at = ?
         WHERE id = ? AND status = 'processing' AND claim_token = ?`,
      ).run(at + LIMITS.workerLeaseMs, iso(at), asset.id, asset.claim_token);
    } catch {
      /* The database may already be closed. */
    }
  }, LIMITS.workerHeartbeatMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

async function loop() {
  const options = workerConfigFromEnv();
  let stop = false;
  const halt = () => {
    stop = true;
  };
  process.on("SIGTERM", halt);
  process.on("SIGINT", halt);
  while (!stop) {
    const result = await runWorkerOnce(options);
    if (!result.processed) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await loop();
}
