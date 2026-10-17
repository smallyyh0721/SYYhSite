import { randomBytes } from "node:crypto";
import { ContentError } from "./content-errors.mjs";
import { immediate, isUniqueConstraint, iso } from "./content-store.mjs";
import {
  checkDerivedStore,
  describeRegularFile,
  hashesEqual,
  readFileSyncHash,
  storageError,
} from "./content-storage.mjs";

const THEMES = new Set(["sky", "ancient", "apocalypse", "home"]);
const RESERVED = new Set([
  "themes",
  "view",
  "owner",
  "api",
  "media",
  "assets",
  "uploads",
  "new",
  "edit",
  "preview",
  "admin",
  "login",
  "session",
  "works",
  "health",
  "messages",
  "storage",
  "backup",
  "import",
]);
const ASSET_ID = /^[0-9a-f]{32}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOOSE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const STRICT_CONTROL = /[\u0000-\u001f\u007f]/;
const TEXT = {
  title: 100,
  subtitle: 200,
  category: 80,
  description: 2000,
  alt: 300,
  caption: 300,
};

export function normalizeDraft(input, { existingSlug = null } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ContentError(400, "草稿格式无效。", "invalid_draft");
  }
  const slug = existingSlug ?? parseSlug(input.slug);
  if (input.slug != null && input.slug !== slug) {
    throw new ContentError(400, "作品地址创建后不能修改。", "slug_immutable");
  }
  if (!THEMES.has(input.themeId)) {
    throw new ContentError(400, "主题无效。", "invalid_draft");
  }
  const media = normalizeItems(input.media ?? [], 60, "正文素材");
  const processMedia = normalizeItems(input.processMedia ?? [], 20, "过程素材");
  const seen = new Set(media.map((item) => item.assetId));
  for (const item of processMedia) {
    if (seen.has(item.assetId)) {
      throw new ContentError(400, "同一素材不能同时放在正文和过程里。", "invalid_draft");
    }
  }
  let coverAssetId = null;
  if (input.coverAssetId != null) {
    if (typeof input.coverAssetId !== "string" || !ASSET_ID.test(input.coverAssetId)) {
      throw new ContentError(400, "封面编号格式无效。", "invalid_cover");
    }
    coverAssetId = input.coverAssetId;
  }
  return {
    slug,
    themeId: input.themeId,
    title: requireText(input.title, TEXT.title, "标题"),
    subtitle: requireText(input.subtitle ?? "", TEXT.subtitle, "副标题", { allowEmpty: true }),
    category: requireText(input.category ?? "", TEXT.category, "分类", { allowEmpty: true }),
    description: requireText(input.description ?? "", TEXT.description, "简介", {
      allowEmpty: true,
      allowNewlines: true,
    }),
    sortOrder: parseSort(input.sortOrder),
    coverAssetId,
    media,
    processMedia,
  };
}

function parseSlug(value) {
  if (typeof value !== "string" || !SLUG.test(value) || value.length < 2 || value.length > 80) {
    throw new ContentError(400, "作品地址需要 2–80 位小写字母、数字或连字符。", "invalid_draft");
  }
  if (RESERVED.has(value)) {
    throw new ContentError(400, "这个作品地址是保留名称。", "invalid_draft");
  }
  return value;
}

function parseSort(value) {
  if (value == null) return 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 9999) {
    throw new ContentError(400, "排序需要是 0–9999 的整数。", "invalid_draft");
  }
  return value;
}

function requireText(value, max, label, { allowEmpty = false, allowNewlines = false } = {}) {
  if (typeof value !== "string") {
    throw new ContentError(400, `${label}需要是文本。`, "invalid_draft");
  }
  if ((allowNewlines ? LOOSE_CONTROL : STRICT_CONTROL).test(value)) {
    throw new ContentError(400, `${label}包含不支持的控制字符。`, "invalid_draft");
  }
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  if (length > max || (!allowEmpty && length < 1)) {
    throw new ContentError(400, `${label}长度无效。`, "invalid_draft");
  }
  return trimmed;
}

function normalizeItems(items, limit, label) {
  if (!Array.isArray(items)) {
    throw new ContentError(400, `${label}格式无效。`, "invalid_draft");
  }
  if (items.length > limit) {
    throw new ContentError(400, `${label}数量超过上限。`, "invalid_draft");
  }
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContentError(400, `${label}格式无效。`, "invalid_draft");
    }
    if (typeof item.assetId !== "string" || !ASSET_ID.test(item.assetId)) {
      throw new ContentError(400, "素材编号格式无效。", "invalid_draft");
    }
    if (seen.has(item.assetId)) continue;
    seen.add(item.assetId);
    result.push({
      assetId: item.assetId,
      alt: requireText(item.alt ?? "", TEXT.alt, `${label}说明`, { allowEmpty: true }),
      caption: requireText(item.caption ?? "", TEXT.caption, `${label}配文`, { allowEmpty: true }),
    });
  }
  return result;
}

function mustWork(db, id) {
  if (typeof id !== "string" || !ASSET_ID.test(id)) {
    throw new ContentError(404, "没有找到对应的内容。", "not_found");
  }
  const row = db.prepare("SELECT * FROM works WHERE id = ?").get(id);
  if (!row) throw new ContentError(404, "没有找到对应的内容。", "not_found");
  return row;
}

function collectIds(draft) {
  return [
    ...draft.media.map((item) => item.assetId),
    ...draft.processMedia.map((item) => item.assetId),
  ];
}

function loadAssets(db, ids) {
  const map = new Map();
  const select = db.prepare("SELECT * FROM assets WHERE id = ?");
  for (const id of ids) {
    const row = select.get(id);
    if (!row) throw new ContentError(400, "草稿引用了不存在的素材。", "asset_missing");
    map.set(id, row);
  }
  return map;
}

function assertCover(draft, assets) {
  if (!draft.coverAssetId) return;
  const cover = assets.get(draft.coverAssetId);
  const members = new Set(collectIds(draft));
  if (!cover || !members.has(draft.coverAssetId)) {
    throw new ContentError(400, "封面必须属于正文或过程素材。", "invalid_cover");
  }
  if (cover.status !== "ready" || cover.kind !== "image") {
    throw new ContentError(400, "封面必须是已就绪的图片。", "invalid_cover");
  }
}

function assertRefs(db, draft) {
  const ids = collectIds(draft);
  if (draft.coverAssetId) ids.push(draft.coverAssetId);
  const assets = loadAssets(db, [...new Set(ids)]);
  assertCover(draft, assets);
  return assets;
}

function assertPublishable(draft, assets) {
  if (Array.from(draft.description).length < 1) {
    throw new ContentError(409, "发布前需要填写简介。", "not_ready");
  }
  if (Array.from(draft.category).length < 1) {
    throw new ContentError(409, "发布前需要填写分类。", "not_ready");
  }
  if (!draft.media.length) {
    throw new ContentError(409, "发布前至少需要一项已就绪的正文素材。", "not_ready");
  }
  if (!draft.coverAssetId) {
    throw new ContentError(409, "发布前需要封面。", "not_ready");
  }
  assertCover(draft, assets);
  for (const id of collectIds(draft)) {
    const asset = assets.get(id);
    if (!asset || asset.status !== "ready") {
      throw new ContentError(409, "还有素材未处理完成。", "not_ready");
    }
    if (asset.kind === "video" && !asset.poster_rel) {
      throw new ContentError(409, "视频还没有封面帧。", "not_ready");
    }
  }
}

function snapshotFrom(draft, assets) {
  const packed = {};
  for (const id of new Set(collectIds(draft))) {
    const asset = assets.get(id);
    packed[id] = {
      kind: asset.kind || "image",
      derivedRel: asset.derived_rel,
      posterRel: asset.poster_rel,
      derivedSha256: asset.derived_sha256,
      derivedBytes: asset.derived_bytes,
      posterSha256: asset.poster_sha256,
      posterBytes: asset.poster_bytes,
    };
  }
  return { ...draft, assets: packed };
}

export function toAdmin(row) {
  return {
    id: row.id,
    slug: row.slug,
    revision: row.revision,
    publishedRevision: row.published_revision == null ? null : row.published_revision,
    status: row.status,
    draft: JSON.parse(row.draft_json),
    updatedAt: row.updated_at,
  };
}

export function toPublicWork(snapshot) {
  const work = {
    themeId: snapshot.themeId,
    slug: snapshot.slug,
    number: String(snapshot.sortOrder).padStart(2, "0"),
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    image: `/api/media/${snapshot.coverAssetId}`,
    category: snapshot.category,
    description: snapshot.description,
    media: snapshot.media.map((item) => mediaEntry(snapshot, item)),
  };
  if (snapshot.processMedia.length) {
    work.processMedia = snapshot.processMedia.map((item) => mediaEntry(snapshot, item));
  }
  return work;
}

function mediaEntry(snapshot, item) {
  const asset = snapshot.assets?.[item.assetId];
  const kind = asset?.kind === "video" ? "video" : "image";
  const entry = {
    src: `/api/media/${item.assetId}`,
    alt: item.alt,
    caption: item.caption,
    kind,
    assetId: item.assetId,
  };
  if (kind === "video") entry.poster = `/api/media/${item.assetId}/poster`;
  return entry;
}

export function createWork(db, input, nowMs) {
  const draft = normalizeDraft(input);
  assertRefs(db, draft);
  const id = randomBytes(16).toString("hex");
  const stamp = iso(nowMs);
  try {
    immediate(db, () => {
      db.prepare(
        `INSERT INTO works(id, slug, revision, published_revision, status, draft_json, snapshot_json, created_at, updated_at)
         VALUES(?, ?, 1, NULL, 'draft', ?, NULL, ?, ?)`,
      ).run(id, draft.slug, JSON.stringify(draft), stamp, stamp);
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new ContentError(409, "这个地址已经有作品，不能覆盖。", "slug_conflict");
    }
    throw error;
  }
  return toAdmin(mustWork(db, id));
}

export function updateWork(db, id, revision, input, nowMs) {
  const row = mustWork(db, id);
  if (!Number.isInteger(revision) || row.revision !== revision) {
    throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
  }
  const draft = normalizeDraft(input, { existingSlug: row.slug });
  assertRefs(db, draft);
  const changed = db
    .prepare(
      `UPDATE works SET revision = revision + 1, draft_json = ?, updated_at = ?
       WHERE id = ? AND revision = ?`,
    )
    .run(JSON.stringify(draft), iso(nowMs), id, revision);
  if (changed.changes !== 1) {
    throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
  }
  return toAdmin(mustWork(db, id));
}

export function publishWork(db, id, revision, env) {
  const row = mustWork(db, id);
  if (!Number.isInteger(revision) || row.revision !== revision) {
    throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
  }
  const draft = JSON.parse(row.draft_json);
  const assets = loadAssets(db, [...new Set(collectIds(draft))]);
  assertPublishable(draft, assets);
  const marker = checkDerivedStore(env.derivedRoot, env.storeId);
  if (!marker.ok) throw storageError(marker);
  for (const asset of assets.values()) verifyPublishedFile(env.derivedRoot, asset);
  const snapshot = snapshotFrom(draft, assets);
  const next = revision + 1;
  const stamp = iso(env.now());
  immediate(db, () => {
    const changed = db
      .prepare(
        `UPDATE works
         SET revision = ?, published_revision = ?, status = 'published', snapshot_json = ?, updated_at = ?
         WHERE id = ? AND revision = ?`,
      )
      .run(next, next, JSON.stringify(snapshot), stamp, id, revision);
    if (changed.changes !== 1) {
      throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
    }
    db.prepare("DELETE FROM publication_assets WHERE work_id = ?").run(id);
    const insert = db.prepare(
      "INSERT INTO publication_assets(work_id, asset_id) VALUES(?, ?)",
    );
    for (const assetId of new Set(collectIds(draft))) insert.run(id, assetId);
  });
  return toAdmin(mustWork(db, id));
}

function verifyPublishedFile(derivedRoot, asset) {
  const derived = describeRegularFile(derivedRoot, asset.derived_rel || "");
  if (!derived || derived.size !== asset.derived_bytes) {
    throw storageError({ reason: "io_error" });
  }
  const read = readFileSyncHash(derived.full);
  if (!read || read.bytes !== asset.derived_bytes || !hashesEqual(read.sha, asset.derived_sha256)) {
    throw storageError({ reason: "io_error" });
  }
  if (asset.kind === "video") {
    const poster = describeRegularFile(derivedRoot, asset.poster_rel || "");
    if (!poster || poster.size !== asset.poster_bytes) throw storageError({ reason: "io_error" });
    const posterRead = readFileSyncHash(poster.full);
    if (
      !posterRead ||
      posterRead.bytes !== asset.poster_bytes ||
      !hashesEqual(posterRead.sha, asset.poster_sha256)
    ) {
      throw storageError({ reason: "io_error" });
    }
  }
}

export function unpublishWork(db, id, revision, nowMs) {
  const row = mustWork(db, id);
  if (!Number.isInteger(revision) || row.revision !== revision) {
    throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
  }
  if (row.status !== "published" || row.snapshot_json == null) {
    throw new ContentError(409, "作品还没有发布。", "not_published");
  }
  const stamp = iso(nowMs);
  immediate(db, () => {
    const changed = db
      .prepare(
        `UPDATE works
         SET revision = revision + 1, published_revision = NULL, status = 'draft', snapshot_json = NULL, updated_at = ?
         WHERE id = ? AND revision = ? AND status = 'published'`,
      )
      .run(stamp, id, revision);
    if (changed.changes !== 1) {
      throw new ContentError(409, "这份草稿已被其他操作更新，请刷新后再保存。", "revision_conflict");
    }
    db.prepare("DELETE FROM publication_assets WHERE work_id = ?").run(id);
  });
  return toAdmin(mustWork(db, id));
}

export function listAdmin(db) {
  return db
    .prepare("SELECT * FROM works ORDER BY updated_at DESC, id ASC")
    .all()
    .map(toAdmin);
}

export function getAdmin(db, id) {
  return toAdmin(mustWork(db, id));
}

export function listPublic(db) {
  const rows = db
    .prepare(
      `SELECT id, snapshot_json FROM works
       WHERE status = 'published' AND snapshot_json IS NOT NULL`,
    )
    .all();
  return rows
    .map((row) => ({ id: row.id, snapshot: JSON.parse(row.snapshot_json) }))
    .sort(
      (left, right) =>
        left.snapshot.sortOrder - right.snapshot.sortOrder ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    )
    .map((row) => toPublicWork(row.snapshot));
}

export function getPublic(db, slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) {
    throw new ContentError(404, "没有找到对应的内容。", "not_found");
  }
  const row = db
    .prepare(
      `SELECT snapshot_json FROM works
       WHERE slug = ? AND status = 'published' AND snapshot_json IS NOT NULL`,
    )
    .get(slug);
  if (!row) throw new ContentError(404, "没有找到对应的内容。", "not_found");
  return toPublicWork(JSON.parse(row.snapshot_json));
}

export function previewWork(db, id) {
  const row = mustWork(db, id);
  const draft = JSON.parse(row.draft_json);
  const assets = loadAssets(db, [...new Set(collectIds(draft))]);
  assertPublishable(draft, assets);
  return toPublicWork(snapshotFrom(draft, assets));
}

export function isPublishedAsset(db, assetId) {
  return Boolean(
    db.prepare("SELECT 1 AS ok FROM publication_assets WHERE asset_id = ? LIMIT 1").get(assetId),
  );
}
