import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { ContentError } from "./content-errors.mjs";
import { createWork, normalizeDraft } from "./content-works.mjs";
import { enqueueUpload } from "./content-media.mjs";
import { runWorkerOnce } from "./media-worker.mjs";

export async function importInbox({ db, config, inbox, manifest, worker }) {
  const root = assertDirectory(inbox);
  const manifestFile = resolveInside(root, manifest);
  const text = readStable(manifestFile);
  let parsed;
  try {
    parsed = JSON.parse(text.toString("utf8"));
  } catch {
    throw new ContentError(400, "导入清单不是有效的 JSON。", "invalid_manifest");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ContentError(400, "导入清单格式无效。", "invalid_manifest");
  }
  const draftInput = parsed.draft;
  if (!draftInput || typeof draftInput !== "object" || Array.isArray(draftInput)) {
    throw new ContentError(400, "导入清单缺少草稿。", "invalid_manifest");
  }
  normalizeDraft({ ...draftInput, media: [], processMedia: [], coverAssetId: null });
  const existing = db.prepare("SELECT id FROM works WHERE slug = ?").get(draftInput.slug);
  if (existing) {
    throw new ContentError(409, "这个地址已经有作品，不能覆盖。", "slug_conflict");
  }
  const files = parsed.files ?? [];
  if (!Array.isArray(files)) throw new ContentError(400, "导入文件列表无效。", "invalid_manifest");
  let cover = null;
  const media = [];
  const processMedia = [];
  const assetIds = [];
  for (const file of files) {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw new ContentError(400, "导入文件项无效。", "invalid_manifest");
    }
    if (file.role !== "media" && file.role !== "process") {
      throw new ContentError(400, "导入文件角色无效。", "invalid_manifest");
    }
    if (file.cover === true && !/\.(png|jpe?g|webp)$/i.test(String(file.filename || ""))) {
      throw new ContentError(400, "封面必须是图片。", "invalid_cover");
    }
    const source = resolveInside(root, file.filename);
    const bytes = readStable(source, siblingComplete(root, file.filename));
    const uploaded = await enqueueUpload(db, config, { filename: file.filename, body: bytes });
    assetIds.push(uploaded.id);
    const item = {
      assetId: uploaded.id,
      alt: typeof file.alt === "string" ? file.alt : "",
      caption: typeof file.caption === "string" ? file.caption : "",
    };
    if (file.role === "media") media.push(item);
    else processMedia.push(item);
    if (file.cover === true) {
      if (cover) throw new ContentError(400, "只能指定一个封面。", "invalid_manifest");
      cover = uploaded.id;
    }
  }
  const workerOptions = {
    dbPath: config.dbPath,
    stagingRoot: config.stagingRoot,
    cosSiteRoot: worker.cosSiteRoot,
    storeId: config.storeId,
    ffmpegPath: worker.ffmpegPath || "",
    ffprobePath: worker.ffprobePath || "",
    now: config.now,
  };
  for (let index = 0; index < assetIds.length + 2; index += 1) {
    const result = await runWorkerOnce(workerOptions);
    if (!result.processed) {
      if (result.storage) {
        throw new ContentError(503, "存储暂时不可用，已停止导入。", "storage_unavailable");
      }
      break;
    }
  }
  const rows = assetIds.map((id) => db.prepare("SELECT status, error FROM assets WHERE id = ?").get(id));
  const failed = rows.find((row) => !row || row.status !== "ready");
  if (failed) {
    throw new ContentError(
      400,
      failed?.error || "导入的文件没有全部处理完成，未创建草稿。",
      "import_failed",
    );
  }
  const work = createWork(
    db,
    {
      ...draftInput,
      media,
      processMedia,
      coverAssetId: cover,
    },
    config.now(),
  );
  if (work.status !== "draft" || work.publishedRevision != null) {
    throw new ContentError(500, "导入不能直接发布。", "import_failed");
  }
  return { workId: work.id, slug: work.slug, assetIds, published: false };
}

function assertDirectory(inbox) {
  let stat;
  try {
    stat = lstatSync(inbox);
  } catch {
    throw new ContentError(400, "待导入目录不存在。", "invalid_inbox");
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new ContentError(400, "待导入目录不能是符号链接。", "symlink");
  }
  return realpathSync(inbox);
}

function resolveInside(root, relativeName) {
  if (typeof relativeName !== "string" || relativeName.length === 0 || relativeName.length > 240) {
    throw new ContentError(400, "导入路径无效。", "path_rejected");
  }
  if (relativeName.includes("\0") || isAbsolute(relativeName)) {
    throw new ContentError(400, "不接受绝对路径。", "path_rejected");
  }
  const parts = relativeName.split(/[\\/]+/);
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new ContentError(400, "不接受越界路径。", "path_rejected");
  }
  let cursor = root;
  for (const part of parts) {
    cursor = resolve(cursor, part);
    const rel = relative(root, cursor);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
      throw new ContentError(400, "不接受越界路径。", "path_rejected");
    }
    let stat;
    try {
      stat = lstatSync(cursor);
    } catch {
      throw new ContentError(400, "导入文件不存在。", "missing_file");
    }
    if (stat.isSymbolicLink()) throw new ContentError(400, "不接受符号链接。", "symlink");
  }
  const stat = lstatSync(cursor);
  if (!stat.isFile()) throw new ContentError(400, "导入项必须是普通文件。", "invalid_file");
  const realRoot = realpathSync(root);
  const realFile = realpathSync(cursor);
  const rel = relative(realRoot, realFile);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new ContentError(400, "不接受越界路径。", "path_rejected");
  }
  return cursor;
}

function siblingComplete(root, filename) {
  if (typeof filename !== "string" || filename.includes("..") || isAbsolute(filename)) return null;
  const markerName = `${filename}.complete`;
  try {
    return resolveInside(root, markerName);
  } catch {
    return null;
  }
}

function readStable(full, completeFile = null) {
  const before = lstatSync(full);
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new ContentError(400, "导入项必须是普通文件。", "invalid_file");
  }
  const bytes = readFileSync(full);
  const after = lstatSync(full);
  const stable =
    after.isFile() &&
    !after.isSymbolicLink() &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    bytes.length === before.size;
  if (stable) return bytes;
  let marked = false;
  if (completeFile) {
    const marker = lstatSync(completeFile);
    marked = marker.isFile() && !marker.isSymbolicLink();
  }
  if (marked && bytes.length === after.size) return bytes;
  throw new ContentError(400, "文件仍在写入或大小不稳定。", "unstable_file");
}
