// Real v2 asset check. Missing official media stays pending.
// Fixture self-tests never count as the real visitor, film, or poster.
//
//   node scripts/verify-v2-assets.mjs --out docs/agent-work/evidence/P4-12/assets.json
//   node scripts/verify-v2-assets.mjs --ffmpeg <ffmpeg.exe> --allow-pending --out <file>
//
// ffmpeg is enough to decode one PNG frame. ffprobe only adds stream detail.
// --ffmpeg or FFMPEG_PATH overrides discovery. The project imageio binary is
// docs/agent-work/logs/media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe.
//
// Exit 0: no hard failures, and no pending (or --allow-pending).
// Exit 1: a present file failed, or the self-test failed.
// Exit 2: official files are still pending. This is not a pass.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";

const BUDGET_DOC = "docs/agent-work/background-next-version.md";
const ASSET_SOURCE = "src/lib/v2-assets.ts";
const MANIFEST = "public/media/v2/manifest.json";
const PROXY_GLB = "public/media/avatar-proxy.glb";
const STUB_MP4 = "docs/agent-work/evidence/P4-09/STUB-not-greeting.mp4";
const REQUIRED_BONES = ["Head", "Spine", "EyeL", "EyeR"];
const REQUIRED_MORPHS = ["Blink", "Smile"];
const PAGE_LOADER = "src/features/avatar/Avatar.tsx";

const IMAGES = [
  ["island-sky-day", "public/media/v2/islands/sky-day.webp", "foreground", "island-sky"],
  ["island-sky-night", "public/media/v2/islands/sky-night.webp", "foreground", "island-sky"],
  ["island-ancient-day", "public/media/v2/islands/ancient-day.webp", "foreground", "island-ancient"],
  ["island-ancient-night", "public/media/v2/islands/ancient-night.webp", "foreground", "island-ancient"],
  ["island-apocalypse-day", "public/media/v2/islands/apocalypse-day.webp", "foreground", "island-apocalypse"],
  ["island-apocalypse-night", "public/media/v2/islands/apocalypse-night.webp", "foreground", "island-apocalypse"],
  ["island-home-day", "public/media/v2/islands/home-day.webp", "foreground", "island-home"],
  ["island-home-night", "public/media/v2/islands/home-night.webp", "foreground", "island-home"],
  ["base-day-landscape", "public/media/v2/environment/day.webp", "plate", "base-landscape"],
  ["base-night-landscape", "public/media/v2/environment/night.webp", "plate", "base-landscape"],
  ["base-day-portrait", "public/media/v2/environment/day-portrait.webp", "plate", "base-portrait"],
  ["base-night-portrait", "public/media/v2/environment/night-portrait.webp", "plate", "base-portrait"],
  ["cloud-far-day", "public/media/v2/environment/cloud-far-day.webp", "foreground", "cloud-far"],
  ["cloud-far-night", "public/media/v2/environment/cloud-far-night.webp", "foreground", "cloud-far"],
  ["cloud-near-day", "public/media/v2/environment/cloud-near-day.webp", "foreground", "cloud-near"],
  ["cloud-near-night", "public/media/v2/environment/cloud-near-night.webp", "foreground", "cloud-near"],
].map(([id, file, role, pair]) => ({ id, file, role, pair }));

const GREETING_VARIANTS = [
  ["day", false],
  ["night", false],
  ["day", true],
  ["night", true],
];

function parseArgs(argv) {
  const args = { allowPending: false, out: "", root: process.cwd(), ffmpeg: "", ffprobe: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--allow-pending") args.allowPending = true;
    else if (token === "--out") args.out = argv[++i] || "";
    else if (token === "--root") args.root = argv[++i] || args.root;
    else if (token === "--ffmpeg") args.ffmpeg = argv[++i] || "";
    else if (token === "--ffprobe") args.ffprobe = argv[++i] || "";
    else if (token === "--help") args.help = true;
    else throw new Error("Unknown argument: " + token);
  }
  return args;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function budgetLimits(amount, unit) {
  if (amount == null || !unit) return null;
  const decimal = unit === "MB" ? amount * 1000 * 1000 : amount * 1000;
  const binary = unit === "MB" ? amount * 1024 * 1024 : amount * 1024;
  return { decimal, binary };
}

// The source document writes KB/MB without saying 1000 or 1024.
// A size inside that gap is unknown, not compliant.
function budgetStatus(actual, amount, unit) {
  const limits = budgetLimits(amount, unit);
  if (!limits || !Number.isFinite(actual)) {
    return { status: "unknown", amount, unit, limits, actual };
  }
  const low = Math.min(limits.decimal, limits.binary);
  const high = Math.max(limits.decimal, limits.binary);
  let status = "unknown";
  if (actual <= low) status = "within";
  else if (actual > high) status = "over";
  return { status, amount, unit, limits, actual };
}

function parseBudgets(text) {
  const lines = String(text || "").split(/\r?\n/);
  const find = (pred) => lines.find(pred) || "";
  const amount = (line, unit) => {
    if (!line) return null;
    const match = line.match(new RegExp("≤\\s*([0-9]+(?:\\.[0-9]+)?)\\s*" + unit, "i"));
    return match ? Number(match[1]) : null;
  };
  const base = (id) => {
    const line = find((item) => item.includes("`" + id + "`"));
    return { id, line, max: amount(line, "KB"), unit: "KB" };
  };
  const cloud = (id) => {
    const line = find((item) => item.includes(id + "-day") && item.includes(id + "-night"));
    return { id, line, max: amount(line, "KB"), unit: "KB" };
  };
  // Prefer the actual specification row. Progress prose above the table can also
  // mention MP4/WebM without containing the silence, opacity or byte contract.
  const greetingLine = find((item) => /^\|\s*视频\s*\|/.test(item) && item.includes("MP4") && item.includes("WebM"))
    || find((item) => item.includes("MP4") && item.includes("WebM") && item.includes("横") && /≤\s*[0-9.]+\s*MB/.test(item));
  const posterLine = find((item) => item.includes("伸手到达帧"));
  const duration = text.match(/动作预算\s*([0-9.]+)\s*[–-]\s*([0-9.]+)\s*秒/);
  const frame = text.match(/横屏母版预算\s*(\d+)\s*[x×]\s*(\d+)[，,]\s*竖屏\s*(\d+)\s*[x×]\s*(\d+)/);
  const eight = text.match(/四张底板与四张云层共八张，合计预算\s*≤\s*([0-9.]+)\s*MB/);
  const group = greetingLine.match(/超过\s*([0-9.]+)\s*MB/);
  const aboutLine = find((item) => /about/i.test(item) && /KB|MB/.test(item) && /≤/.test(item));
  const glbLine = find((item) => /\bGLB\b|\.glb/.test(item) && /≤/.test(item));
  return {
    source: BUDGET_DOC,
    bases: {
      "base-day-landscape": base("base-day-landscape"),
      "base-night-landscape": base("base-night-landscape"),
      "base-day-portrait": base("base-day-portrait"),
      "base-night-portrait": base("base-night-portrait"),
    },
    clouds: {
      "cloud-far": cloud("cloud-far"),
      "cloud-near": cloud("cloud-near"),
    },
    stillTotal: eight ? { amount: Number(eight[1]), unit: "MB", text: eight[0] } : null,
    greeting: {
      line: greetingLine,
      max: amount(greetingLine, "MB"),
      unit: "MB",
      groupOver: group ? { amount: Number(group[1]), unit: "MB" } : null,
      webmRequired: greetingLine.includes("MP4") && greetingLine.includes("WebM") ? true : "unknown",
      silent: greetingLine.includes("无声") ? true : "unknown",
      opaque: greetingLine.includes("无透明通道") ? true : "unknown",
    },
    greetingPoster: {
      line: posterLine,
      max: amount(posterLine, "KB"),
      unit: "KB",
    },
    duration: duration ? { min: Number(duration[1]), max: Number(duration[2]), text: duration[0] } : null,
    frame: frame
      ? {
          landscape: { width: Number(frame[1]), height: Number(frame[2]) },
          portrait: { width: Number(frame[3]), height: Number(frame[4]) },
          text: frame[0],
        }
      : null,
    aboutPoster: aboutLine ? { line: aboutLine, status: "parsed" } : { status: "unknown", line: "" },
    glb: glbLine ? { line: glbLine, status: "parsed" } : { status: "unknown", line: "" },
    loopVideoRequired: text.includes("只在分层静图没有通过下面的肉眼验收时制作") ? false : "unknown",
    alphaWebmRequired: text.includes("不作为承诺格式") ? false : "unknown",
  };
}

function imageBudget(budgets, id) {
  if (budgets.bases[id]) return budgetStatus(null, budgets.bases[id].max, budgets.bases[id].unit);
  if (id.startsWith("cloud-far")) return budgetStatus(null, budgets.clouds["cloud-far"].max, "KB");
  if (id.startsWith("cloud-near")) return budgetStatus(null, budgets.clouds["cloud-near"].max, "KB");
  return { status: "unknown", amount: null, unit: null, actual: null, reason: "background-next-version.md has no byte budget for this id" };
}

function runTool(file, args, options = {}) {
  return spawnSync(file, args, {
    windowsHide: true,
    encoding: options.binary ? "buffer" : "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120000,
  });
}

function toolWorks(file) {
  if (!file || !existsSync(file)) return false;
  const result = runTool(file, ["-version"]);
  return result.status === 0 && /ffmpeg version|ffprobe version/i.test(String(result.stdout || ""));
}

function registryFfmpegDirs() {
  if (process.platform !== "win32") return [];
  const key = "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe";
  const result = spawnSync("reg", ["query", key, "/v", "InstallLocation"], { encoding: "utf8", windowsHide: true });
  const match = String(result.stdout || "").match(/InstallLocation\s+REG_SZ\s+(.+)/i);
  return match ? [match[1].trim()] : [];
}

function discoverTools(root, options = {}) {
  const candidates = [];
  const add = (source, file) => {
    if (!file) return;
    candidates.push({ source, file, exists: existsSync(file), works: false });
  };
  if (options.ffmpeg) add("cli", options.ffmpeg);
  if (process.env.FFMPEG_PATH) add("FFMPEG_PATH", process.env.FFMPEG_PATH);
  if (options.ffprobe) add("cli", options.ffprobe);
  if (process.env.FFPROBE_PATH) add("FFPROBE_PATH", process.env.FFPROBE_PATH);
  const binDir = join(root, "docs/agent-work/logs/media-tools/imageio_ffmpeg/binaries");
  if (existsSync(binDir)) {
    for (const name of readdirSync(binDir)) {
      if (/^ffmpeg/i.test(name) && /\.exe$/i.test(name)) add("project-imageio", join(binDir, name));
    }
  }
  const where = process.platform === "win32" ? "where.exe" : "which";
  for (const name of ["ffmpeg", "ffprobe"]) {
    const found = spawnSync(where, [name], { encoding: "utf8", windowsHide: true });
    for (const line of String(found.stdout || "").split(/\r?\n/)) add(where + " " + name, line.trim());
  }
  for (const dir of String(process.env.PATH || "").split(process.platform === "win32" ? ";" : ":")) {
    if (!dir) continue;
    add("PATH", join(dir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"));
    add("PATH", join(dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe"));
  }
  for (const install of registryFfmpegDirs()) {
    add("registry", join(install, "ffmpeg.exe"));
    add("registry", join(install, "ffprobe.exe"));
    add("registry", join(install, "ffmpeg-8.1-full_build", "bin", "ffmpeg.exe"));
    add("registry", join(install, "ffmpeg-8.1-full_build", "bin", "ffprobe.exe"));
  }
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = item.source + "\n" + item.file.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.exists) item.works = toolWorks(item.file);
    unique.push(item);
  }
  const base = (file) => file.split(/[/\\]/).pop().toLowerCase();
  const pick = (kind) => unique.find((item) => item.works && base(item.file).startsWith(kind));
  const ffmpeg = pick("ffmpeg")?.file || null;
  if (ffmpeg) {
    const sibling = join(dirname(ffmpeg), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    add("ffmpeg-sibling", sibling);
    const last = candidates[candidates.length - 1];
    if (last && !unique.some((item) => item.file.toLowerCase() === last.file.toLowerCase())) {
      last.exists = existsSync(last.file);
      if (last.exists) last.works = toolWorks(last.file);
      unique.push(last);
    }
  }
  return {
    candidates: unique.filter((item) => item.exists || item.source === "cli" || item.source === "FFMPEG_PATH" || item.source === "FFPROBE_PATH" || item.source.startsWith("registry") || item.source.startsWith("where") || item.source === "project-imageio"),
    ffmpeg,
    ffprobe: unique.find((item) => item.works && base(item.file).startsWith("ffprobe"))?.file || null,
  };
}

function edgeStats(data, info) {
  const { width, height, channels } = info;
  let opaque = 0;
  let clear = 0;
  let border = 0;
  let borderClear = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha >= 200) opaque += 1;
      if (alpha <= 8) clear += 1;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        border += 1;
        if (alpha <= 8) borderClear += 1;
      }
    }
  }
  return { opaque, clear, border, borderClear };
}

async function decodeImage(buffer) {
  const image = sharp(buffer, { failOn: "error" });
  const meta = await image.metadata();
  const stats = await image.stats();
  const alpha = meta.hasAlpha && stats.channels.length >= 4 ? stats.channels[3] : null;
  let edge = null;
  if (meta.hasAlpha) {
    const raw = await sharp(buffer, { failOn: "error" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    edge = edgeStats(raw.data, raw.info);
  }
  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    hasAlpha: Boolean(meta.hasAlpha),
    alphaMin: alpha ? alpha.min : null,
    alphaMax: alpha ? alpha.max : null,
    edge,
  };
}

function foregroundVerdict(decoded) {
  if (!decoded.hasAlpha) return "fail";
  if (!decoded.edge || decoded.edge.opaque < 1) return "fail";
  if (decoded.edge.clear < 1 || decoded.alphaMin !== 0) return "fail";
  if (decoded.edge.borderClear < 1) return "fail";
  return "pass";
}

function plateVerdict(decoded) {
  if (!decoded.edge) return decoded.hasAlpha ? "fail" : "pass";
  const pixels = decoded.width * decoded.height;
  if (decoded.edge.clear > pixels * 0.5) return "fail";
  return "pass";
}

function pad(buffer, mod, fill) {
  const extra = (mod - (buffer.length % mod)) % mod;
  return extra ? Buffer.concat([buffer, Buffer.alloc(extra, fill)]) : buffer;
}

function makeGlb(json, bin = Buffer.from([0, 1, 2, 3])) {
  const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 4, 0x20);
  const binChunk = pad(Buffer.from(bin), 4, 0);
  const length = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.write("JSON", 4, "ascii");
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.write("BIN\0", 4, "ascii");
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

function fixtureModel(overrides = {}) {
  const mesh = {
    name: "VisitorBody",
    extras: { targetNames: ["Blink", "Smile"] },
    primitives: [{ attributes: {}, targets: [{}, {}] }],
  };
  const nodes = [
    { name: "Head" },
    { name: "Spine" },
    { name: "EyeL" },
    { name: "EyeR" },
    { name: "VisitorBody", mesh: 0, skin: 0 },
  ];
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 4 }],
    images: [{ bufferView: 0, mimeType: "image/png" }],
    meshes: [mesh],
    nodes,
    skins: [{ joints: [0, 1, 2, 3] }],
    scenes: [{ nodes: [0, 1, 2, 3, 4] }],
    scene: 0,
    ...overrides,
  };
  return json;
}

function parseGlb(buffer) {
  if (!buffer || buffer.length < 20) return { ok: false, error: "too small" };
  const magic = buffer.toString("ascii", 0, 4);
  if (magic !== "glTF") return { ok: false, error: "magic " + magic };
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  if (version !== 2) return { ok: false, error: "version " + version, version, length };
  if (length !== buffer.length) return { ok: false, error: "length " + length + " != " + buffer.length, version, length };
  let offset = 12;
  let json = null;
  let binLength = 0;
  const chunks = [];
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > buffer.length) return { ok: false, error: "chunk overrun", version, length };
    chunks.push({ type, length: chunkLength });
    if (type === "JSON") {
      try {
        json = JSON.parse(buffer.subarray(start, end).toString("utf8").replace(/\0+$/g, "").trim());
      } catch (error) {
        return { ok: false, error: "json " + error.message, version, length };
      }
    }
    if (type.startsWith("BIN")) binLength = chunkLength;
    offset = end;
  }
  if (!json) return { ok: false, error: "no JSON chunk", version, length, chunks };
  return { ok: true, version, length, json, binLength, chunks };
}

function loaderSupport(source) {
  return {
    meshopt: source.includes("setMeshoptDecoder"),
    draco: source.includes("DRACOLoader") || source.includes("setDRACOLoader"),
  };
}

function unsupportedExtensions(required, support) {
  const blocked = [];
  if (required.includes("EXT_meshopt_compression") && !support.meshopt) blocked.push("EXT_meshopt_compression");
  if (required.includes("KHR_draco_mesh_compression") && !support.draco) blocked.push("KHR_draco_mesh_compression");
  return blocked;
}

function inspectModel(parsed, support = { meshopt: false, draco: false }) {
  if (!parsed.ok) return { status: "fail", parsed, problems: [parsed.error] };
  const json = parsed.json;
  const problems = [];
  if (!json.asset || json.asset.version !== "2.0") problems.push("asset.version is not 2.0");
  const required = Array.isArray(json.extensionsRequired) ? json.extensionsRequired : [];
  const blocked = unsupportedExtensions(required, support);
  if (blocked.length) problems.push("extensionsRequired not supported by the page loader: " + blocked.join(","));
  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const skins = Array.isArray(json.skins) ? json.skins : [];
  if (!skins.length) problems.push("no skin");
  const bodies = [];
  meshes.forEach((mesh, meshIndex) => {
    const names = mesh.extras && Array.isArray(mesh.extras.targetNames) ? mesh.extras.targetNames : [];
    const primitives = Array.isArray(mesh.primitives) ? mesh.primitives : [];
    const targetCount = primitives.reduce((max, item) => Math.max(max, Array.isArray(item.targets) ? item.targets.length : 0), 0);
    nodes.forEach((node, nodeIndex) => {
      if (node.mesh !== meshIndex) return;
      const single = primitives.length === 1;
      const runtimeName = single && node.name ? node.name : mesh.name || "";
      const childName = primitives.length > 1 ? mesh.name || "" : "";
      if (runtimeName === "VisitorBody" || childName === "VisitorBody") {
        bodies.push({ meshIndex, nodeIndex, node, mesh, names, targetCount, primitives: primitives.length });
      }
    });
  });
  if (!bodies.length) problems.push("no runtime Mesh named VisitorBody");
  const body = bodies[0];
  if (body) {
    for (const name of REQUIRED_MORPHS) {
      if (!body.names.includes(name)) problems.push("morph " + name + " missing from mesh.extras.targetNames");
    }
    if (body.names.length && body.targetCount !== body.names.length) {
      problems.push("targetNames length " + body.names.length + " != primitive targets " + body.targetCount);
    }
    if (body.node.skin == null || !skins[body.node.skin]) problems.push("VisitorBody node has no skin");
    else {
      const joints = new Set(skins[body.node.skin].joints || []);
      for (const name of REQUIRED_BONES) {
        const indexes = nodes.map((node, index) => (node.name === name ? index : -1)).filter((index) => index >= 0);
        if (!indexes.length) problems.push("bone " + name + " missing");
        else if (!indexes.some((index) => joints.has(index))) problems.push("bone " + name + " is not a joint of the VisitorBody skin");
      }
    }
  } else {
    problems.push("skipped bone check because VisitorBody is missing");
  }
  const buffers = Array.isArray(json.buffers) ? json.buffers : [];
  const images = Array.isArray(json.images) ? json.images : [];
  const externalBuffers = buffers.filter((item) => item.uri && !String(item.uri).startsWith("data:"));
  const externalImages = images.filter((item) => item.uri && !String(item.uri).startsWith("data:"));
  if (externalBuffers.length) problems.push("external buffer uri");
  if (externalImages.length) problems.push("external image uri");
  if (!parsed.binLength && buffers.some((item) => !item.uri)) problems.push("GLB BIN chunk missing for embedded buffer");
  const embeddedImages = images.filter((item) => item.bufferView != null && !item.uri);
  return {
    status: problems.length ? "fail" : "pass",
    problems,
    bones: REQUIRED_BONES.map((name) => ({ name, present: nodes.some((node) => node.name === name) })),
    morphs: body ? REQUIRED_MORPHS.map((name) => ({ name, present: body.names.includes(name) })) : [],
    skins: skins.length,
    images: images.length,
    embeddedImages: embeddedImages.length,
    binLength: parsed.binLength,
    extensionsRequired: required,
  };
}

function judgeVideo(probe, budget, portrait) {
  const problems = [];
  if (!probe.decoded) problems.push("not decoded");
  if (budget.greeting.silent === true) {
    if (probe.audioStreams == null) problems.push("audio presence unknown");
    else if (probe.audioStreams > 0) problems.push("has audio");
  }
  if (budget.greeting.opaque === true) {
    if (probe.alpha == null) problems.push("alpha unknown");
    else if (probe.alpha) problems.push("has alpha");
  }
  const frame = portrait ? budget.frame?.portrait : budget.frame?.landscape;
  const dimension = !frame
    ? "unknown"
    : probe.width === frame.width && probe.height === frame.height
      ? "match"
      : "differs";
  const duration = !budget.duration || !Number.isFinite(probe.duration)
    ? "unknown"
    : probe.duration >= budget.duration.min && probe.duration <= budget.duration.max
      ? "within"
      : probe.duration < budget.duration.min
        ? "under"
        : "over";
  if (probe.decoded && (duration === "under" || duration === "over")) problems.push("duration " + duration);
  if (probe.decoded && budget.duration && !Number.isFinite(probe.duration)) problems.push("duration unknown");
  return {
    playable: probe.decoded === true && !problems.includes("not decoded"),
    problems,
    dimension,
    duration,
    bytes: budgetStatus(probe.bytes, budget.greeting.max, budget.greeting.unit),
  };
}

function textOf(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value || "");
}

function parseFfmpegReport(stderr) {
  const text = textOf(stderr);
  const cut = text.search(/\r?\n(?:Stream mapping:|Output #0)/);
  const input = cut >= 0 ? text.slice(0, cut) : text;
  const durationMatch = input.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : null;
  const streams = [];
  const streamRe = /Stream #\d+:\d+(?:\[[^\]]+\])?(?:\([^)]+\))?:\s*(Video|Audio):\s*([^\r\n]+)/g;
  let match = streamRe.exec(input);
  while (match) {
    streams.push({ type: match[1].toLowerCase(), rest: match[2] });
    match = streamRe.exec(input);
  }
  const video = streams.find((item) => item.type === "video");
  let codec = "";
  let pixFmt = "";
  let width = null;
  let height = null;
  let fps = null;
  if (video) {
    codec = video.rest.split(/[\s,]/)[0] || "";
    const size = video.rest.match(/(\d{2,5})x(\d{2,5})/);
    if (size) {
      width = Number(size[1]);
      height = Number(size[2]);
    }
    const fmt = video.rest.match(/\b(yuv[a-z0-9]+|rgb[a-z0-9]*|gray[a-z0-9]*|nv12|nv21|p010[a-z0-9]*)\b/i);
    pixFmt = fmt ? fmt[1] : "";
    const rate = video.rest.match(/(\d+(?:\.\d+)?)\s*fps/);
    if (rate) fps = Number(rate[1]);
  }
  const progress = text.match(/^frame=(\d+)$/m);
  const decodedFrames = progress ? Number(progress[1]) : null;
  const frames = duration != null && fps ? Math.round(duration * fps) : decodedFrames;
  return {
    duration,
    codec,
    pixFmt,
    width,
    height,
    fps,
    frames,
    decodedFrames,
    audioStreams: video ? streams.filter((item) => item.type === "audio").length : null,
    sawVideo: Boolean(video),
  };
}

function readFfprobe(file, ffprobe) {
  const probe = runTool(ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]);
  if (probe.status !== 0) return { error: textOf(probe.stderr || probe.stdout || "ffprobe failed") };
  try {
    const json = JSON.parse(probe.stdout || "{}");
    const video = (json.streams || []).find((item) => item.codec_type === "video") || {};
    const audioStreams = (json.streams || []).filter((item) => item.codec_type === "audio").length;
    return {
      duration: Number(json.format?.duration),
      width: Number(video.width) || null,
      height: Number(video.height) || null,
      audioStreams,
      pixFmt: String(video.pix_fmt || ""),
      codec: video.codec_name || "",
      frames: Number(video.nb_frames) || null,
    };
  } catch (error) {
    return { error: "ffprobe json " + error.message };
  }
}

async function decodeVideo(file, tools) {
  if (!tools.ffmpeg) {
    return { decoded: false, toolMissing: true, error: "ffmpeg not found", ffprobe: Boolean(tools.ffprobe), source: "none" };
  }
  const decoded = runTool(tools.ffmpeg, [
    "-hide_banner", "-nostdin", "-i", file,
    "-map", "0:v:0", "-frames:v", "1",
    "-f", "image2pipe", "-vcodec", "png",
    "-progress", "pipe:2", "pipe:1",
  ], { binary: true });
  const stderr = textOf(decoded.stderr);
  const report = parseFfmpegReport(stderr);
  const png = Buffer.isBuffer(decoded.stdout) ? decoded.stdout : Buffer.alloc(0);
  const signature = png.length >= 8 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  let sharpMeta = null;
  let sharpError = "";
  if (decoded.status === 0 && signature) {
    try {
      sharpMeta = await sharp(png).metadata();
    } catch (error) {
      sharpError = error.message;
    }
  }
  const width = sharpMeta?.width || null;
  const height = sharpMeta?.height || null;
  const frameOk = Boolean(width && height && sharpMeta.format === "png");
  let duration = report.duration;
  let audioStreams = report.audioStreams;
  let alpha = report.sawVideo ? /yuva|rgba|argb|bgra|gbra|ya8/i.test(report.pixFmt) : null;
  let codec = report.codec;
  let pixFmt = report.pixFmt;
  let frames = report.frames;
  let ffprobeError = "";
  if (tools.ffprobe) {
    const extra = readFfprobe(file, tools.ffprobe);
    if (extra.error) ffprobeError = extra.error;
    else {
      if (Number.isFinite(extra.duration)) duration = extra.duration;
      if (extra.audioStreams != null) audioStreams = extra.audioStreams;
      if (extra.pixFmt) {
        pixFmt = extra.pixFmt;
        alpha = /yuva|rgba|argb|bgra|gbra|ya8/i.test(extra.pixFmt);
      }
      if (extra.codec) codec = extra.codec;
      if (extra.frames) frames = extra.frames;
    }
  }
  return {
    decoded: frameOk,
    nonzero: frameOk,
    toolMissing: false,
    error: frameOk ? "" : (sharpError || stderr.slice(-500) || "ffmpeg produced no PNG frame"),
    duration,
    width,
    height,
    audioStreams,
    pixFmt,
    alpha,
    codec,
    frames,
    decodedFrames: report.decodedFrames,
    ffprobe: Boolean(tools.ffprobe) && !ffprobeError,
    ffprobeError,
    source: tools.ffprobe && !ffprobeError ? "ffmpeg+ffprobe" : "ffmpeg",
  };
}

async function tinyWebp(alphaOf) {
  const width = 8;
  const height = 8;
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      raw[offset] = 30;
      raw[offset + 1] = 80;
      raw[offset + 2] = 140;
      raw[offset + 3] = alphaOf(x, y);
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).webp().toBuffer();
}

async function selfTest(budgets, tools) {
  const checks = [];
  const pass = (name, detail) => checks.push({ name, kind: "fixture", status: "pass", detail });
  const fail = (name, detail) => checks.push({ name, kind: "fixture", status: "fail", detail });
  const expect = (name, ok, detail) => (ok ? pass(name, detail) : fail(name, detail));
  const emptyDoc = parseBudgets("no numbers here");
  expect("unknown budget stays unknown", emptyDoc.greeting.webmRequired === "unknown" && emptyDoc.greeting.max == null && emptyDoc.stillTotal == null, emptyDoc.greeting);
  expect("current doc requires greeting WebM", budgets.greeting.webmRequired === true, budgets.greeting.line);
  expect("current doc does not require alpha WebM", budgets.alphaWebmRequired === false, budgets.alphaWebmRequired);
  expect("current doc leaves about poster budget unknown", budgets.aboutPoster.status === "unknown", budgets.aboutPoster);
  expect("current doc leaves GLB budget unknown", budgets.glb.status === "unknown", budgets.glb);
  const ambiguous = budgetStatus(160356, 160, "KB");
  expect("KB unit gap is unknown", ambiguous.status === "unknown", ambiguous);
  expect("byte clearly over both units is over", budgetStatus(200000, 160, "KB").status === "over", true);
  expect("byte under both units is within", budgetStatus(1000, 160, "KB").status === "within", true);

  const clearEdge = await decodeImage(await tinyWebp((x, y) => (x === 0 || y === 0 || x === 7 || y === 7 ? 0 : 255)));
  expect("fixture transparent foreground passes", foregroundVerdict(clearEdge) === "pass", clearEdge.edge);
  const solid = await decodeImage(await tinyWebp(() => 255));
  expect("fixture solid image fails foreground", foregroundVerdict(solid) === "fail", { alphaMin: solid.alphaMin, edge: solid.edge });
  const blank = await decodeImage(await tinyWebp(() => 0));
  expect("fixture empty image fails foreground", foregroundVerdict(blank) === "fail", blank.edge);

  const good = inspectModel(parseGlb(makeGlb(fixtureModel())));
  expect("fixture GLB passes rig", good.status === "pass", good.problems);
  const nameless = fixtureModel();
  delete nameless.meshes[0].extras;
  const missingMorph = inspectModel(parseGlb(makeGlb(nameless)));
  expect("fixture GLB without morph names fails", missingMorph.status === "fail", missingMorph.problems);
  const external = fixtureModel({ buffers: [{ uri: "mesh.bin", byteLength: 4 }] });
  const externalResult = inspectModel(parseGlb(makeGlb(external)));
  expect("fixture external buffer fails", externalResult.status === "fail" && externalResult.problems.some((item) => item.includes("external")), externalResult.problems);
  const compressed = fixtureModel({ extensionsRequired: ["EXT_meshopt_compression"] });
  const withoutDecoder = inspectModel(parseGlb(makeGlb(compressed)), { meshopt: false, draco: false });
  const withDecoder = inspectModel(parseGlb(makeGlb(compressed)), { meshopt: true, draco: false });
  expect("fixture meshopt fails only when the page has no decoder", withoutDecoder.problems.some((item) => item.includes("EXT_meshopt")) && !withDecoder.problems.some((item) => item.includes("EXT_meshopt")), { withoutDecoder: withoutDecoder.problems, withDecoder: withDecoder.problems });
  expect("header-only video is not playable", judgeVideo({ decoded: false, audioStreams: 0, alpha: false, width: 1920, height: 1080, duration: 3, bytes: 1000 }, budgets, false).playable === false, true);
  const audible = judgeVideo({ decoded: true, audioStreams: 1, alpha: false, width: 1920, height: 1080, duration: 3, bytes: 1000 }, budgets, false);
  expect("fixture audio is not silent", audible.problems.includes("has audio"), audible.problems);
  const missingTool = await decodeVideo(join(tmpdir(), "p4-12-missing.mp4"), { ffmpeg: null, ffprobe: null });
  expect("missing ffmpeg stays pending and does not accept a header", missingTool.toolMissing === true && missingTool.decoded === false, missingTool);
  if (!tools.ffmpeg) {
    fail("fixture silent film decodes with ffmpeg only", "no working ffmpeg");
  } else {
    const dir = mkdtempSync(join(tmpdir(), "p4-12-ffmpeg-"));
    try {
      const pngPath = join(dir, "frame.png");
      const silentPath = join(dir, "silent.mp4");
      const audiblePath = join(dir, "audible.mp4");
      const headerPath = join(dir, "header.mp4");
      writeFileSync(pngPath, await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 210, g: 30, b: 40 } } }).png().toBuffer());
      writeFileSync(headerPath, Buffer.from("000000186674797069736f6d00000000", "hex"));
      const encoded = runTool(tools.ffmpeg, ["-y", "-hide_banner", "-loop", "1", "-i", pngPath, "-t", "0.4", "-r", "10", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", silentPath]);
      const silent = await decodeVideo(silentPath, { ffmpeg: tools.ffmpeg, ffprobe: null });
      expect("fixture silent film decodes with ffmpeg only", encoded.status === 0 && silent.decoded === true && silent.width === 64 && silent.height === 48 && silent.audioStreams === 0 && silent.alpha === false && silent.codec === "h264" && Math.abs(Number(silent.duration) - 0.4) < 0.05 && silent.frames === 4 && silent.ffprobe === false && silent.source === "ffmpeg", {
        encode: encoded.status,
        width: silent.width,
        height: silent.height,
        audioStreams: silent.audioStreams,
        codec: silent.codec,
        duration: silent.duration,
        frames: silent.frames,
        error: String(silent.error || "").slice(0, 240),
      });
      const header = await decodeVideo(headerPath, { ffmpeg: tools.ffmpeg, ffprobe: null });
      expect("fixture header is not playable", header.toolMissing === false && header.decoded === false, String(header.error || "").slice(0, 240));
      const withAudio = runTool(tools.ffmpeg, ["-y", "-hide_banner", "-loop", "1", "-i", pngPath, "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000:duration=0.4", "-t", "0.4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", audiblePath]);
      const audibleProbe = await decodeVideo(audiblePath, { ffmpeg: tools.ffmpeg, ffprobe: null });
      expect("fixture audio is detected from ffmpeg stderr", withAudio.status === 0 && audibleProbe.decoded === true && audibleProbe.audioStreams > 0, {
        encode: withAudio.status,
        audioStreams: audibleProbe.audioStreams,
        error: textOf(withAudio.stderr).slice(-240),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return { status: checks.some((item) => item.status === "fail") ? "fail" : "pass", checks };
}

function manifestIndex(json) {
  const map = new Map();
  for (const item of json.assets || []) {
    if (item.path) map.set(item.path, item);
  }
  return map;
}

function publicUrl(file) {
  return "/" + file.replace(/^public\//, "").replaceAll("\\", "/");
}

async function checkImages(root, budgets) {
  const manifest = manifestIndex(JSON.parse(await readFile(join(root, MANIFEST), "utf8")));
  const results = [];
  for (const item of IMAGES) {
    const absolute = join(root, item.file);
    const url = publicUrl(item.file);
    if (!existsSync(absolute)) {
      results.push({ id: item.id, kind: "real", role: item.role, pair: item.pair, file: item.file, status: "fail", problems: ["missing delivered runtime image"] });
      continue;
    }
    const buffer = await readFile(absolute);
    const problems = [];
    let decoded = null;
    try {
      decoded = await decodeImage(buffer);
    } catch (error) {
      problems.push("decode failed: " + error.message);
    }
    if (decoded) {
      if (decoded.format !== "webp") problems.push("format " + decoded.format);
      const visual = item.role === "foreground" ? foregroundVerdict(decoded) : plateVerdict(decoded);
      if (visual !== "pass") problems.push(item.role === "foreground" ? "transparent foreground or clear edge missing" : "plate is mostly transparent");
    }
    const recorded = manifest.get(url);
    const manifestCompare = !recorded
      ? { status: "unknown" }
      : {
          status: recorded.bytes === buffer.length && recorded.sha256 === sha256(buffer) && recorded.width === decoded?.width && recorded.height === decoded?.height ? "match" : "mismatch",
          recorded: { bytes: recorded.bytes, sha256: recorded.sha256, width: recorded.width, height: recorded.height },
        };
    if (manifestCompare.status === "mismatch") problems.push("manifest bytes, hash, or size differs from the file");
    const budget = imageBudget(budgets, item.id);
    budget.actual = buffer.length;
    const priced = budget.amount == null ? budget : budgetStatus(buffer.length, budget.amount, budget.unit);
    results.push({
      id: item.id,
      kind: "real",
      role: item.role,
      pair: item.pair,
      file: item.file,
      url,
      status: problems.length ? "fail" : "pass",
      problems,
      bytes: buffer.length,
      sha256: sha256(buffer),
      width: decoded?.width ?? null,
      height: decoded?.height ?? null,
      hasAlpha: decoded?.hasAlpha ?? null,
      alphaMin: decoded?.alphaMin ?? null,
      alphaMax: decoded?.alphaMax ?? null,
      edge: decoded?.edge ?? null,
      manifest: manifestCompare,
      budget: priced,
    });
  }
  const pairs = [];
  const groups = new Map();
  for (const item of results) {
    if (!groups.has(item.pair)) groups.set(item.pair, []);
    groups.get(item.pair).push(item);
  }
  for (const [pair, items] of groups) {
    const hashes = items.map((item) => item.sha256).filter(Boolean);
    const distinct = new Set(hashes).size === items.length && items.length === 2 && items.every((item) => item.status !== "fail" || item.sha256);
    const ok = items.length === 2 && items.every((item) => item.sha256) && new Set(hashes).size === 2;
    if (!ok) items.forEach((item) => item.problems.push("day/night pair is missing or identical"));
    if (!ok) items.forEach((item) => { if (item.status === "pass") item.status = "fail"; });
    pairs.push({ pair, ok, files: items.map((item) => item.file), distinct });
  }
  const plateIds = IMAGES.filter((item) => item.role === "plate" || item.id.startsWith("cloud-")).map((item) => item.id);
  const eight = results.filter((item) => plateIds.includes(item.id) && Number.isFinite(item.bytes));
  const total = eight.reduce((sum, item) => sum + item.bytes, 0);
  const totalBudget = budgets.stillTotal
    ? budgetStatus(total, budgets.stillTotal.amount, budgets.stillTotal.unit)
    : { status: "unknown", actual: total };
  return { results, pairs, stillTotal: { files: eight.length, bytes: total, budget: totalBudget } };
}

async function checkModel(root, budgets, support) {
  const file = "public/media/v2/avatar/visitor.glb";
  const absolute = join(root, file);
  const proxyAbsolute = join(root, PROXY_GLB);
  const proxyHash = existsSync(proxyAbsolute) ? sha256(await readFile(proxyAbsolute)) : null;
  const base = {
    id: "visitor-glb",
    kind: "real",
    file,
    url: "/media/v2/avatar/visitor.glb",
    budget: { status: budgets.glb.status, reason: "background-next-version.md does not set a GLB byte budget" },
    proxyIgnored: PROXY_GLB,
    proxyHash,
  };
  if (!existsSync(absolute)) {
    return { ...base, status: "pending", problems: ["official visitor.glb is not in public yet"], bytes: null, sha256: null };
  }
  const buffer = await readFile(absolute);
  const hash = sha256(buffer);
  const problems = [];
  if (proxyHash && hash === proxyHash) problems.push("file matches avatar-proxy.glb and cannot pass as the official model");
  const parsed = parseGlb(buffer);
  const inspected = inspectModel(parsed, support);
  problems.push(...(inspected.problems || []));
  return {
    ...base,
    status: problems.length ? "fail" : "pass",
    problems,
    bytes: buffer.length,
    sha256: hash,
    rig: inspected,
  };
}

function variantPaths(theme, portrait) {
  const suffix = portrait ? "-portrait" : "";
  return {
    mp4: `public/media/v2/avatar/greeting-${theme}${suffix}.mp4`,
    webm: `public/media/v2/avatar/greeting-${theme}${suffix}.webm`,
    poster: `public/media/v2/avatar/greeting-${theme}${suffix}.webp`,
  };
}

async function checkGreeting(root, budgets, tools, source) {
  const stubHash = existsSync(join(root, STUB_MP4)) ? sha256(await readFile(join(root, STUB_MP4))) : null;
  const wiredWebm = source.includes(".webm");
  const results = [];
  for (const [theme, portrait] of GREETING_VARIANTS) {
    const paths = variantPaths(theme, portrait);
    for (const kind of ["mp4", "webm", "poster"]) {
      const file = paths[kind];
      const absolute = join(root, file);
      const id = file.replace("public/media/v2/avatar/", "");
      const required = kind !== "webm" || budgets.greeting.webmRequired === true;
      if (!existsSync(absolute)) {
        results.push({
          id,
          kind: "real",
          container: kind,
          file,
          status: required ? "pending" : "unknown",
          required,
          wiredInPage: kind === "webm" ? wiredWebm : true,
          problems: [required ? "file not delivered" : "requirement unknown"],
        });
        continue;
      }
      const buffer = await readFile(absolute);
      const hash = sha256(buffer);
      const problems = [];
      if (kind === "mp4" || kind === "webm") {
        if (stubHash && hash === stubHash) problems.push("file matches the P4-09 stub and cannot pass as the greeting film");
        const probe = await decodeVideo(absolute, tools);
        const judged = judgeVideo({ ...probe, bytes: buffer.length }, budgets, portrait);
        let status = "pass";
        if (probe.toolMissing) problems.push("decoder missing; header was not accepted as playback");
        else problems.push(...judged.problems);
        const soft = new Set(["audio presence unknown", "alpha unknown", "duration unknown", "decoder missing; header was not accepted as playback"]);
        if (problems.some((item) => !soft.has(item))) status = "fail";
        else if (problems.length) status = "pending";
        results.push({
          id,
          kind: "real",
          container: kind,
          file,
          status,
          required,
          wiredInPage: kind === "webm" ? wiredWebm : source.includes(".mp4"),
          bytes: buffer.length,
          sha256: hash,
          probe,
          budget: judged.bytes,
          duration: judged.duration,
          dimension: judged.dimension,
          problems,
        });
      } else {
        let decoded = null;
        try {
          decoded = await decodeImage(buffer);
        } catch (error) {
          problems.push("decode failed: " + error.message);
        }
        if (decoded && decoded.format !== "webp") problems.push("format " + decoded.format);
        const priced = budgetStatus(buffer.length, budgets.greetingPoster.max, budgets.greetingPoster.unit);
        results.push({
          id,
          kind: "real",
          container: kind,
          file,
          status: problems.length ? "fail" : "pass",
          required: true,
          bytes: buffer.length,
          sha256: hash,
          width: decoded?.width ?? null,
          height: decoded?.height ?? null,
          budget: priced,
          problems,
        });
      }
    }
  }
  const presentVideos = results.filter((item) => (item.container === "mp4" || item.container === "webm") && Number.isFinite(item.bytes));
  const group = budgets.greeting.groupOver;
  const groupBudget = !group
    ? { status: "unknown" }
    : presentVideos.length < 8
      ? { status: "unknown", reason: "the 6MB group rule applies to the delivered set; files are still missing", bytes: presentVideos.reduce((sum, item) => sum + item.bytes, 0) }
      : budgetStatus(presentVideos.reduce((sum, item) => sum + item.bytes, 0), group.amount, group.unit);
  if (groupBudget.status === "over") {
    presentVideos.forEach((item) => {
      item.problems.push("delivered greeting containers exceed the group budget");
      item.status = "fail";
    });
  }
  return { results, groupBudget, wiredWebm, webmRequired: budgets.greeting.webmRequired };
}

async function checkAbout(root, budgets) {
  const results = [];
  for (const theme of ["day", "night"]) {
    const file = `public/media/v2/avatar/about-${theme}.webp`;
    const absolute = join(root, file);
    if (!existsSync(absolute)) {
      results.push({
        id: "about-" + theme,
        kind: "real",
        file,
        status: "pending",
        budget: { status: "unknown", reason: "background-next-version.md has no About poster byte budget" },
        problems: ["file not delivered"],
      });
      continue;
    }
    const buffer = await readFile(absolute);
    const problems = [];
    let decoded = null;
    try {
      decoded = await decodeImage(buffer);
    } catch (error) {
      problems.push("decode failed: " + error.message);
    }
    results.push({
      id: "about-" + theme,
      kind: "real",
      file,
      status: problems.length ? "fail" : "pass",
      bytes: buffer.length,
      sha256: sha256(buffer),
      width: decoded?.width ?? null,
      height: decoded?.height ?? null,
      budget: { status: budgets.aboutPoster.status, actual: buffer.length, reason: "no documented byte limit" },
      problems,
    });
  }
  return results;
}

function summarize(items) {
  const summary = { pass: 0, fail: 0, pending: 0, unknown: 0 };
  for (const item of items) summary[item.status] = (summary[item.status] || 0) + 1;
  return summary;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log("node scripts/verify-v2-assets.mjs [--allow-pending] [--ffmpeg file] [--ffprobe file] [--root dir] [--out file]");
    return;
  }
  const root = resolve(args.root);
  const started = new Date().toISOString();
  const budgetText = await readFile(join(root, BUDGET_DOC), "utf8");
  const source = await readFile(join(root, ASSET_SOURCE), "utf8");
  const avatarSource = await readFile(join(root, PAGE_LOADER), "utf8");
  const support = loaderSupport(avatarSource);
  const budgets = parseBudgets(budgetText);
  for (const snippet of ["/media/v2/avatar/visitor.glb", "/media/v2/avatar/about-", "/media/v2/avatar/greeting-", ".mp4", ".webp"]) {
    if (!source.includes(snippet)) throw new Error("v2-assets.ts no longer contains " + snippet);
  }
  const tools = discoverTools(root, args);
  const tested = await selfTest(budgets, tools);
  const images = await checkImages(root, budgets);
  const model = await checkModel(root, budgets, support);
  const greeting = await checkGreeting(root, budgets, tools, source);
  const about = await checkAbout(root, budgets);
  const realItems = [...images.results, model, ...greeting.results, ...about];
  const realSummary = summarize(realItems);
  const failures = realItems.filter((item) => item.status === "fail").map((item) => ({ id: item.id || item.file, problems: item.problems }));
  const pending = realItems.filter((item) => item.status === "pending").map((item) => ({ id: item.id || item.file, file: item.file, problems: item.problems }));
  const budgetNotes = realItems
    .filter((item) => item.budget && (item.budget.status === "over" || item.budget.status === "unknown"))
    .map((item) => ({ id: item.id || item.file, budget: item.budget.status, bytes: item.bytes ?? item.budget.actual ?? null }));
  let exitCode = 0;
  if (tested.status === "fail" || realSummary.fail > 0) exitCode = 1;
  else if (realSummary.pending > 0 && !args.allowPending) exitCode = 2;
  const report = {
    tool: "verify-v2-assets",
    generatedAt: started,
    allowPending: args.allowPending,
    root,
    budgets,
    loader: support,
    decoder: {
      ffmpeg: tools.ffmpeg,
      ffprobe: tools.ffprobe,
      candidates: tools.candidates,
      note: tools.ffmpeg
        ? (tools.ffprobe ? "ffmpeg decoded PNG frames; ffprobe can add stream detail" : "ffmpeg decoded PNG frames; ffprobe is not required")
        : "playback is not certified; mime and headers are not accepted",
    },
    selfTest: tested,
    images: images.results,
    pairs: images.pairs,
    stillTotal: images.stillTotal,
    model,
    greeting: greeting.results,
    greetingGroup: greeting.groupBudget,
    webm: {
      requiredBy: BUDGET_DOC,
      required: greeting.webmRequired,
      wiredInPage: greeting.wiredWebm,
      note: greeting.wiredWebm ? "page source references webm" : "v2-assets.ts publishes mp4 only; the asset spec still asks for WebM",
    },
    about,
    loopVideo: { required: budgets.loopVideoRequired, note: "optional until the still layers fail the visual check" },
    summary: realSummary,
    budgetNotes,
    pending,
    failures,
    acceptance: exitCode === 0 ? (args.allowPending && pending.length ? "engineering-allow-pending" : "pass") : exitCode === 2 ? "pending" : "fail",
  };
  const text = JSON.stringify(report, null, 2);
  if (args.out) {
    const destination = resolve(root, args.out);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, text);
  }
  console.log(JSON.stringify({
    acceptance: report.acceptance,
    summary: realSummary,
    pending: pending.length,
    failures: failures.length,
    selfTest: tested.status,
    ffmpeg: tools.ffmpeg,
    ffprobe: tools.ffprobe,
    exitCode,
  }));
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
