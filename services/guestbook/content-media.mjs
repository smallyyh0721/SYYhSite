import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { delimiter, join } from "node:path";
import sharp from "sharp";
import { ContentError, MediaError, safeMessage } from "./content-errors.mjs";
import { immediate, iso } from "./content-store.mjs";
import {
  LIMITS,
  checkDerivedStore,
  checkWorkerStore,
  containedPath,
  describeRegularFile,
  directoryUsage,
  removeQuiet,
  storageError,
  writeNewObject,
} from "./content-storage.mjs";

const ASSET_ID = /^[0-9a-f]{32}$/;

export function parseDisplayFilename(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 180 || trimmed !== name.trim()) return null;
  if (/[\\/\0\r\n]/.test(trimmed) || trimmed.includes("..") || trimmed.startsWith(".")) return null;
  const ext = trimmed.split(".").pop()?.toLowerCase();
  const map = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", mp4: "mp4" };
  if (!ext || !map[ext] || trimmed.length === ext.length + 1) return null;
  return { filename: trimmed, ext: map[ext] };
}

export function sniff(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") return null;
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    return null;
  }
  const head = buf.subarray(0, 64).toString("utf8").trimStart().toLowerCase();
  if (
    head.startsWith("<svg") ||
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.startsWith("<?xml")
  ) {
    return null;
  }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") return "mp4";
  return null;
}

export async function enqueueUpload(db, config, { filename, body }) {
  const parsed = parseDisplayFilename(filename);
  if (!parsed) throw new ContentError(400, "文件名或扩展名不被接受。", "unsupported_type");
  if (!Buffer.isBuffer(body) || body.length < 1) {
    throw new ContentError(400, "上传内容是空的。", "invalid_body");
  }
  if (body.length > config.maxUploadBytes) {
    throw new ContentError(413, "文件超过大小上限。", "too_large");
  }
  const marker = checkDerivedStore(config.derivedRoot, config.storeId);
  if (!marker.ok) throw storageError(marker);
  mkdirSync(config.stagingRoot, { recursive: true });
  const id = randomBytes(16).toString("hex");
  const stagingName = randomBytes(16).toString("hex");
  const full = containedPath(config.stagingRoot, stagingName);
  if (!full) throw new ContentError(503, "暂存路径无效。", "storage_unavailable");
  let stored = false;
  try {
    immediate(db, () => {
      const queued = db
        .prepare("SELECT COUNT(*) AS n FROM assets WHERE status IN ('queued', 'processing')")
        .get().n;
      if (queued >= config.queueLimit) {
        throw new ContentError(503, "上传队列已满，请稍后再试。", "queue_full");
      }
      if (directoryUsage(config.stagingRoot) + body.length > config.stagingQuotaBytes) {
        throw new ContentError(503, "暂存空间不足，已停止上传。", "staging_quota");
      }
      const handle = openSync(full, "wx", 0o600);
      stored = true;
      try {
        writeSync(handle, body);
        fsyncSync(handle);
      } finally {
        closeSync(handle);
      }
      const stamp = iso(config.now());
      db.prepare(
        `INSERT INTO assets(
           id, filename, ext, status, kind, error, bytes, staging_name, created_at, updated_at
         ) VALUES(?, ?, ?, 'queued', NULL, NULL, ?, ?, ?, ?)`,
      ).run(id, parsed.filename, parsed.ext, body.length, stagingName, stamp, stamp);
    });
  } catch (error) {
    if (stored) removeQuiet(full);
    throw error;
  }
  return { id, status: "queued" };
}

export function retryAsset(db, config, id) {
  if (typeof id !== "string" || !ASSET_ID.test(id)) {
    throw new ContentError(404, "没有找到对应的内容。", "not_found");
  }
  const marker = checkDerivedStore(config.derivedRoot, config.storeId);
  if (!marker.ok) throw storageError(marker);
  const row = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
  if (!row) throw new ContentError(404, "没有找到对应的内容。", "not_found");
  if (row.status !== "error") {
    throw new ContentError(409, "只有失败的素材可以重试。", "not_retryable");
  }
  const staging = describeRegularFile(config.stagingRoot, row.staging_name);
  if (!staging || staging.size < 1 || staging.size > config.maxUploadBytes) {
    throw new ContentError(409, "原暂存已不在，无法重试。", "staging_missing");
  }
  const queued = db
    .prepare("SELECT COUNT(*) AS n FROM assets WHERE status IN ('queued', 'processing')")
    .get().n;
  if (queued >= config.queueLimit) {
    throw new ContentError(503, "上传队列已满，请稍后再试。", "queue_full");
  }
  const changed = db
    .prepare(
      `UPDATE assets SET status = 'queued', error = NULL, bytes = ?, claim_token = NULL,
              lease_until = NULL, updated_at = ?
       WHERE id = ? AND status = 'error'`,
    )
    .run(staging.size, iso(config.now()), id);
  if (changed.changes !== 1) {
    throw new ContentError(409, "只有失败的素材可以重试。", "not_retryable");
  }
  return assetView(db.prepare("SELECT * FROM assets WHERE id = ?").get(id));
}

export function assetView(row) {
  if (!row) return null;
  const view = {
    id: row.id,
    status: row.status,
    filename: row.filename,
    kind: row.kind,
    bytes: row.bytes,
    createdAt: row.created_at,
  };
  if (row.error) view.error = row.error;
  if (row.status === "ready") {
    view.src = `/api/media/${row.id}`;
    if (row.kind === "video") view.poster = `/api/media/${row.id}/poster`;
  }
  return view;
}

export function listAssetViews(db) {
  return db
    .prepare("SELECT * FROM assets ORDER BY created_at DESC, rowid DESC LIMIT 500")
    .all()
    .map(assetView);
}

export function getAssetView(db, id) {
  if (typeof id !== "string" || !ASSET_ID.test(id)) {
    throw new ContentError(404, "没有找到对应的内容。", "not_found");
  }
  const row = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
  if (!row) throw new ContentError(404, "没有找到对应的内容。", "not_found");
  return assetView(row);
}

export async function processClaimedAsset(db, asset, options) {
  const created = [];
  try {
    const staging = describeRegularFile(options.stagingRoot, asset.staging_name);
    if (!staging) throw new MediaError("暂存文件不可用。", "staging");
    const bytes = readFileSync(staging.full);
    if (bytes.length !== asset.bytes || bytes.length < 1 || bytes.length > LIMITS.maxUploadBytes) {
      throw new MediaError("暂存文件与记录不一致。", "staging");
    }
    const marker = checkWorkerStore(options.cosSiteRoot, options.storeId);
    if (!marker.ok) throw new MediaError("存储不可用，原件已保留，可稍后重试。", "storage");
    const kind = sniff(bytes);
    if (!kind || kind !== asset.ext) {
      throw new MediaError(kind ? "文件类型与扩展名不一致。" : "不支持的文件类型。", "type");
    }
    const outcome =
      kind === "mp4" ? await processVideo(options, asset) : await processImage(bytes, kind);
    const derivedRoot = join(options.cosSiteRoot, "derived");
    const original = writeNewObject(
      options.cosSiteRoot,
      `originals/${asset.id}`,
      extensionFor(kind),
      bytes,
    );
    created.push(original.full);
    const derived = writeNewObject(
      derivedRoot,
      asset.id,
      kind === "mp4" ? ".mp4" : ".webp",
      outcome.derived,
    );
    created.push(derived.full);
    let poster = null;
    if (outcome.poster) {
      poster = writeNewObject(derivedRoot, asset.id, ".webp", outcome.poster);
      created.push(poster.full);
    }
    immediate(db, () => {
      const changed = db.prepare(
        `UPDATE assets SET
           status = 'ready', kind = ?, error = NULL,
           original_rel = ?, derived_rel = ?, poster_rel = ?,
           original_sha256 = ?, original_bytes = ?,
           derived_sha256 = ?, derived_bytes = ?,
           poster_sha256 = ?, poster_bytes = ?,
           width = ?, height = ?, duration_ms = ?,
           claim_token = NULL, lease_until = NULL, updated_at = ?
         WHERE id = ? AND status = 'processing' AND claim_token = ?`,
      ).run(
        outcome.kind,
        original.rel,
        derived.rel,
        poster?.rel || null,
        original.sha,
        original.bytes,
        derived.sha,
        derived.bytes,
        poster?.sha || null,
        poster?.bytes || null,
        outcome.width,
        outcome.height,
        outcome.durationMs,
        iso(options.now()),
        asset.id,
        asset.claim_token,
      );
      if (changed.changes !== 1) throw new MediaError("素材状态已变化。", "state");
    });
    removeQuiet(staging.full);
  } catch (error) {
    for (const full of created) removeQuiet(full);
    db.prepare(
      `UPDATE assets SET status = 'error', error = ?, claim_token = NULL, lease_until = NULL, updated_at = ?
       WHERE id = ? AND status = 'processing' AND claim_token = ?`,
    ).run(safeMessage(error), iso(options.now()), asset.id, asset.claim_token);
  }
}

async function processImage(bytes, kind) {
  if (kind === "png" && pngAnimated(bytes)) throw new MediaError("不接受多帧图片。", "multi_frame");
  if (kind === "webp" && webpAnimated(bytes)) throw new MediaError("不接受多帧图片。", "multi_frame");
  let meta;
  try {
    meta = await sharp(bytes, {
      animated: false,
      failOn: "error",
      limitInputPixels: LIMITS.maxPixels,
    }).metadata();
  } catch (error) {
    if (/pixel limit|exceeds pixel/i.test(String(error?.message || ""))) {
      throw new MediaError("图片尺寸或像素超过上限。", "dimensions");
    }
    throw new MediaError("图片无法解码。", "decode");
  }
  if ((meta.pages || 1) > 1) throw new MediaError("不接受多帧图片。", "multi_frame");
  if (meta.format !== kind) throw new MediaError("文件类型与内容不一致。", "type");
  if (
    !meta.width ||
    !meta.height ||
    meta.width > LIMITS.maxEdge ||
    meta.height > LIMITS.maxEdge ||
    meta.width * meta.height > LIMITS.maxPixels
  ) {
    throw new MediaError("图片尺寸或像素超过上限。", "dimensions");
  }
  let derived = await renderWebp(bytes, 80);
  if (derived.length > LIMITS.maxDerivedImageBytes) derived = await renderWebp(bytes, 60);
  if (derived.length > LIMITS.maxDerivedImageBytes) {
    throw new MediaError("派生图片超过大小上限。", "derived_size");
  }
  const out = await sharp(derived).metadata();
  if (
    out.format !== "webp" ||
    (out.pages || 1) > 1 ||
    out.width > LIMITS.derivedMaxEdge ||
    out.height > LIMITS.derivedMaxEdge
  ) {
    throw new MediaError("派生图片未能通过校验。", "derived");
  }
  return {
    derived,
    poster: null,
    width: meta.width,
    height: meta.height,
    durationMs: null,
    kind: "image",
  };
}

function renderWebp(bytes, quality) {
  return sharp(bytes, {
    animated: false,
    pages: 1,
    failOn: "error",
    limitInputPixels: LIMITS.maxPixels,
  })
    .rotate()
    .resize({
      width: LIMITS.derivedMaxEdge,
      height: LIMITS.derivedMaxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

async function processVideo(options, asset) {
  const ffprobe = findTool("ffprobe", options.ffprobePath);
  const ffmpeg = findTool("ffmpeg", options.ffmpegPath);
  if (!ffprobe || !ffmpeg) throw new MediaError("视频处理程序不可用。", "video_tool");
  const input = describeRegularFile(options.stagingRoot, asset.staging_name)?.full;
  if (!input) throw new MediaError("暂存文件不可用。", "staging");
  const probeRaw = await runTool(
    ffprobe,
    [
      "-hide_banner",
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      input,
    ],
    20_000,
  );
  let info;
  try {
    info = JSON.parse(probeRaw.toString("utf8"));
  } catch {
    throw new MediaError("视频流不符合要求。", "video");
  }
  const formatName = String(info.format?.format_name || "");
  if (!formatName.split(",").includes("mp4")) {
    throw new MediaError("视频流不符合要求。", "video");
  }
  const streams = Array.isArray(info.streams) ? info.streams : [];
  const videos = streams.filter((item) => item.codec_type === "video");
  const audios = streams.filter((item) => item.codec_type === "audio");
  if (videos.length !== 1 || audios.length > 1) {
    throw new MediaError("视频流不符合要求。", "video");
  }
  const video = videos[0];
  const width = Number(video.width);
  const height = Number(video.height);
  const duration = Number(info.format?.duration ?? video.duration);
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(duration)) {
    throw new MediaError("视频流不符合要求。", "video");
  }
  if (
    duration <= 0 ||
    duration > LIMITS.videoMaxDuration ||
    width > LIMITS.videoMaxWidth ||
    height > LIMITS.videoMaxHeight ||
    width < 1 ||
    height < 1
  ) {
    throw new MediaError("视频时长或分辨率超过上限。", "video_limits");
  }
  const allowedVideo = new Set(["h264", "hevc", "vp9", "av1", "mpeg4"]);
  const allowedAudio = new Set(["aac", "mp3", "opus"]);
  if (!allowedVideo.has(video.codec_name)) throw new MediaError("视频流不符合要求。", "video");
  if (audios.length === 1 && !allowedAudio.has(audios[0].codec_name)) {
    throw new MediaError("视频流不符合要求。", "video");
  }
  const tempVideo = join(options.stagingRoot, `${randomBytes(16).toString("hex")}.mp4`);
  const tempPoster = join(options.stagingRoot, `${randomBytes(16).toString("hex")}.png`);
  try {
    await runTool(ffmpeg, transcodeArgs(input, tempVideo, audios.length === 1), 120_000);
    await runTool(ffmpeg, posterArgs(input, tempPoster), 30_000);
    const derived = readFileSync(tempVideo);
    const posterPng = readFileSync(tempPoster);
    if (derived.length < 1 || derived.length > LIMITS.maxDerivedVideoBytes || sniff(derived) !== "mp4") {
      throw new MediaError("派生视频未能通过校验。", "derived");
    }
    const poster = await sharp(posterPng, { failOn: "error", limitInputPixels: LIMITS.maxPixels })
      .rotate()
      .resize({
        width: LIMITS.derivedMaxEdge,
        height: LIMITS.derivedMaxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (poster.length < 1 || poster.length > LIMITS.maxPosterBytes) {
      throw new MediaError("视频海报超过大小上限。", "derived_size");
    }
    return {
      derived,
      poster,
      width,
      height,
      durationMs: Math.round(duration * 1000),
      kind: "video",
    };
  } finally {
    removeQuiet(tempVideo);
    removeQuiet(tempPoster);
  }
}

function transcodeArgs(input, output, hasAudio) {
  return [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-protocol_whitelist",
    "file,pipe",
    "-threads",
    "1",
    "-i",
    input,
    "-map",
    "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0"] : ["-an"]),
    "-sn",
    "-dn",
    "-map_metadata",
    "-1",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale=w=1280:h=720:force_original_aspect_ratio=decrease,fps=30",
    "-r",
    "30",
    "-filter_threads",
    "1",
    ...(hasAudio ? ["-c:a", "aac", "-ac", "2", "-b:a", "96k"] : []),
    "-movflags",
    "+faststart",
    "-f",
    "mp4",
    output,
  ];
}

function posterArgs(input, output) {
  return [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-protocol_whitelist",
    "file,pipe",
    "-threads",
    "1",
    "-ss",
    "0",
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    "scale=w=1280:h=720:force_original_aspect_ratio=decrease",
    "-map_metadata",
    "-1",
    "-an",
    "-sn",
    "-dn",
    "-f",
    "image2",
    output,
  ];
}

function findTool(name, override) {
  if (override) return existsSync(override) ? override : null;
  const fromEnv = name === "ffmpeg" ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : null;
  const extensions = process.platform === "win32" ? [".exe", ""] : [""];
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = join(dir, name + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function runTool(bin, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH || "",
        SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot || "",
        PATHEXT: process.env.PATHEXT || "",
        TEMP: process.env.TEMP || "",
        TMP: process.env.TMP || "",
      },
    });
    const out = [];
    let size = 0;
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new MediaError("视频处理超时，可稍后重试。", "video_timeout"));
    }, timeoutMs);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    }
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        child.kill("SIGKILL");
        finish(new MediaError("视频流不符合要求。", "video"));
        return;
      }
      out.push(chunk);
    });
    child.stderr.on("data", () => {});
    child.on("error", () => finish(new MediaError("视频处理程序不可用。", "video_tool")));
    child.on("close", (code) => {
      if (settled) return;
      if (code === 0) finish(null, Buffer.concat(out));
      else finish(new MediaError("视频转码失败，可稍后重试。", "video_failed"));
    });
  });
}

function extensionFor(kind) {
  if (kind === "jpeg") return ".jpg";
  if (kind === "png") return ".png";
  if (kind === "webp") return ".webp";
  return ".mp4";
}

function pngAnimated(buf) {
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    if (length > buf.length) return false;
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    offset += 12 + length;
  }
  return false;
}

function webpAnimated(buf) {
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const type = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (type === "ANIM" || type === "ANMF") return true;
    if (type === "VP8X" && offset + 8 < buf.length && (buf[offset + 8] & 0x02) !== 0) return true;
    const step = 8 + size + (size % 2);
    if (step <= 0) return false;
    offset += step;
  }
  return false;
}

export function parseSingleRange(header, size) {
  if (header == null) return null;
  if (typeof header !== "string" || !header.startsWith("bytes=")) return { error: "invalid" };
  const spec = header.slice("bytes=".length).trim();
  if (spec.includes(",")) return { error: "invalid" };
  const match = /^(\d*)-(\d*)$/.exec(spec);
  if (!match) return { error: "invalid" };
  const [, startText, endText] = match;
  if (startText === "" && endText === "") return { error: "invalid" };
  if (size <= 0) return { error: "unsatisfiable" };
  if (startText === "") {
    const suffix = Number(endText);
    if (!Number.isInteger(suffix) || suffix <= 0) return { error: "unsatisfiable" };
    const length = Math.min(suffix, size);
    return { start: size - length, end: size - 1 };
  }
  const start = Number(startText);
  if (!Number.isInteger(start) || start < 0) return { error: "invalid" };
  if (start >= size) return { error: "unsatisfiable" };
  const end = endText === "" ? size - 1 : Number(endText);
  if (!Number.isInteger(end) || end < start) return { error: "unsatisfiable" };
  return { start, end: Math.min(end, size - 1) };
}

export function queueCounts(db) {
  const rows = db.prepare("SELECT status, COUNT(*) AS n FROM assets GROUP BY status").all();
  const counts = { queued: 0, processing: 0, ready: 0, error: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}
