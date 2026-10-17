import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { runWorkerOnce } from "../services/guestbook/media-worker.mjs";
import { hashPassword } from "../services/guestbook/owner-password.mjs";
import { createServer } from "../services/guestbook/server.mjs";
import { openStore } from "../services/guestbook/store.mjs";
import { LIMITS } from "../services/guestbook/content-storage.mjs";

const PASSWORD = "correct-horse-battery";
const PASSWORD_HASH = await hashPassword(PASSWORD);
const ORIGIN = "https://content.test";
const HOST = "content.test";
const STORE = "store-test-0001";
const CLI = fileURLToPath(new URL("../services/guestbook/content-cli.mjs", import.meta.url));

function baseHeaders(extra = {}) {
  return {
    host: HOST,
    origin: ORIGIN,
    "x-forwarded-proto": "https",
    ...extra,
  };
}

function createFixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "syyh-v3-"));
  const cos = join(dir, "cos");
  const derived = join(cos, "derived");
  const staging = join(dir, "staging");
  const inbox = join(dir, "inbox");
  mkdirSync(derived, { recursive: true });
  mkdirSync(staging, { recursive: true });
  mkdirSync(inbox, { recursive: true });
  writeFileSync(join(cos, ".syyh-store-id"), STORE);
  writeFileSync(join(derived, ".syyh-store-id"), STORE);
  const passFile = join(dir, "owner.hash");
  writeFileSync(passFile, `${PASSWORD_HASH}\n`, { mode: 0o600 });
  const clock = { now: 1_700_000_000_000 };
  const content = {
    dbPath: join(dir, "content.sqlite"),
    publicOrigin: ORIGIN,
    ownerPasswordFile: passFile,
    derivedRoot: derived,
    storeId: STORE,
    stagingRoot: staging,
    cosSiteRoot: cos,
    guestbookDbPath: join(dir, "guest.sqlite"),
    now: () => clock.now,
    ...overrides,
  };
  const fx = {
    dir,
    cos,
    derived,
    staging,
    inbox,
    passFile,
    clock,
    content,
    dbPath: content.dbPath,
    guestPath: content.guestbookDbPath,
    app: createServer({ dbPath: content.guestbookDbPath, content }),
  };
  fx.reopen = async () => {
    await fx.app.close();
    fx.app = createServer({ dbPath: fx.guestPath, content: fx.content });
  };
  return fx;
}

async function closeFixture(fx) {
  await fx.app.close();
  rmSync(fx.dir, { recursive: true, force: true });
}

async function login(app, password = PASSWORD, extra = {}) {
  return app.inject({
    method: "POST",
    url: "/api/owner/session",
    headers: baseHeaders({ "content-type": "application/json", ...extra.headers }),
    payload: { password },
    remoteAddress: extra.remoteAddress,
  });
}

function sessionFrom(response) {
  const setCookie = String(response.headers["set-cookie"] || "");
  const token = /__Host-syyh_owner=([^;]+)/.exec(setCookie)?.[1] || "";
  const body = response.json();
  return {
    token,
    csrf: body.csrfToken,
    setCookie,
    headers: baseHeaders({
      cookie: `__Host-syyh_owner=${token}`,
      "x-csrf-token": body.csrfToken,
    }),
  };
}

async function drain(fx) {
  const results = [];
  for (let index = 0; index < 8; index += 1) {
    const result = await runWorkerOnce({
      dbPath: fx.dbPath,
      stagingRoot: fx.staging,
      cosSiteRoot: fx.cos,
      storeId: STORE,
      now: fx.content.now,
    });
    if (!result.processed) break;
    results.push(result);
  }
  return results;
}

async function png(width, height, textChunk) {
  const image = await sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 80, b: 140 } },
  })
    .png()
    .toBuffer();
  if (!textChunk) return image;
  return insertBeforeIend(image, textChunk);
}

function insertBeforeIend(pngBuffer, chunk) {
  const marker = Buffer.from("IEND");
  const at = pngBuffer.lastIndexOf(marker);
  assert.ok(at > 4);
  const start = at - 4;
  return Buffer.concat([pngBuffer.subarray(0, start), chunk, pngBuffer.subarray(start)]);
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function pngTextChunk(keyword, text) {
  const data = Buffer.concat([Buffer.from(keyword), Buffer.from([0]), Buffer.from(text)]);
  const typed = Buffer.concat([Buffer.from("tEXt"), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typed.copy(out, 4);
  out.writeUInt32BE(crc32(typed), 8 + data.length);
  return out;
}

function runCli(args, { env, input } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input ?? "");
  });
}

function cliEnv(fx, extra = {}) {
  return {
    ...process.env,
    CONTENT_DB_PATH: fx.dbPath,
    PUBLIC_ORIGIN: ORIGIN,
    OWNER_PASSWORD_FILE: fx.passFile,
    DERIVED_ROOT: fx.derived,
    STORE_ID: STORE,
    STAGING_ROOT: fx.staging,
    COS_SITE_ROOT: fx.cos,
    DB_PATH: fx.guestPath,
    ...extra,
  };
}

test("content stays disabled until configured, and guestbook limits remain", async () => {
  const dir = mkdtempSync(join(tmpdir(), "syyh-v3-off-"));
  const app = createServer({ dbPath: join(dir, "guest.sqlite") });
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/works" })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/health" })).json().status, "ok");
    const big = await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { "idempotency-key": "guestbook-limit-0001", "content-type": "application/json" },
      payload: Buffer.alloc(5000, 0x7b),
    });
    assert.equal(big.statusCode, 413);
    assert.equal(big.json().error, "留言过长。");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("login rejects missing auth, bad origin, missing CSRF, and sets a host cookie", async () => {
  const fx = createFixture();
  try {
    const headers = baseHeaders();
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/owner/works", headers })).statusCode, 401);
    const badOrigin = await login(fx.app, PASSWORD, { headers: { origin: "https://evil.test" } });
    assert.equal(badOrigin.statusCode, 403);
    assert.equal(badOrigin.json().code, "origin_rejected");
    assert.equal(badOrigin.headers["set-cookie"], undefined);
    const badHost = await login(fx.app, PASSWORD, { headers: { host: "evil.test" } });
    assert.equal(badHost.statusCode, 403);
    assert.equal(badHost.json().code, "host_rejected");
    const insecure = await fx.app.inject({
      method: "POST",
      url: "/api/owner/session",
      headers: { host: HOST, origin: ORIGIN, "content-type": "application/json" },
      payload: { password: PASSWORD },
    });
    assert.equal(insecure.statusCode, 403);
    assert.equal(insecure.json().code, "tls_required");
    const created = await login(fx.app);
    assert.equal(created.statusCode, 200);
    const session = sessionFrom(created);
    assert.equal(created.json().authenticated, true);
    assert.ok(session.csrf);
    assert.equal(created.body.includes(session.token), false);
    assert.match(session.setCookie, /__Host-syyh_owner=/);
    assert.match(session.setCookie, /HttpOnly/);
    assert.match(session.setCookie, /Secure/);
    assert.match(session.setCookie, /SameSite=Strict/);
    assert.match(session.setCookie, /Path=\//);
    assert.doesNotMatch(session.setCookie, /Domain=/i);
    const missing = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: baseHeaders({ cookie: session.headers.cookie, "content-type": "application/json" }),
      payload: { draft: { slug: "no-csrf", title: "无校验", themeId: "sky" } },
    });
    assert.equal(missing.statusCode, 403);
    assert.equal(missing.json().code, "csrf_invalid");
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/owner/works", headers: session.headers })).json().works.length, 0);
    const wrong = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: baseHeaders({
        cookie: session.headers.cookie,
        "x-csrf-token": "not-the-token",
        "content-type": "application/json",
      }),
      payload: { draft: { slug: "bad-csrf", title: "错误校验", themeId: "sky" } },
    });
    assert.equal(wrong.statusCode, 403);
  } finally {
    await closeFixture(fx);
  }
});

test("sessions expire, revoke, rotate, and stay within the concurrent limit", async () => {
  const fx = createFixture({ sessionIdleMs: 1_000, sessionAbsoluteMs: 5_000, maxSessions: 1 });
  try {
    fx.clock.now = 1_700_000_000_000;
    const first = sessionFrom(await login(fx.app));
    const second = sessionFrom(await login(fx.app));
    const stale = await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: first.headers });
    assert.equal(stale.json().authenticated, false);
    fx.clock.now += 2_000;
    const idle = await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: second.headers });
    assert.equal(idle.json().authenticated, false);
    fx.clock.now = 1_700_000_000_000;
    const current = sessionFrom(await login(fx.app));
    // Idle is 1s. Activity inside that window refreshes last_seen and must not extend the 5s absolute lifetime.
    for (const elapsed of [900, 1_800, 2_700, 3_600, 4_500]) {
      fx.clock.now = 1_700_000_000_000 + elapsed;
      assert.equal(
        (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: current.headers })).json().authenticated,
        true,
      );
    }
    fx.clock.now = 1_700_000_000_000 + 5_001;
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: current.headers })).json().authenticated,
      false,
    );
    fx.clock.now = 1_700_000_000_000;
    const live = sessionFrom(await login(fx.app));
    const removed = await fx.app.inject({
      method: "DELETE",
      url: "/api/owner/session",
      headers: live.headers,
    });
    assert.equal(removed.statusCode, 200);
    assert.match(String(removed.headers["set-cookie"]), /Max-Age=0/);
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: live.headers })).json().authenticated,
      false,
    );
    const again = sessionFrom(await login(fx.app));
    const other = sessionFrom(await login(fx.app));
    await fx.app.inject({ method: "POST", url: "/api/owner/revoke-sessions", headers: other.headers });
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: again.headers })).json().authenticated,
      false,
    );
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: other.headers })).json().authenticated,
      false,
    );
  } finally {
    await closeFixture(fx);
  }
});

test("login failures persist across restart until the window passes", async () => {
  const fx = createFixture({ loginIpLimit: 2, loginGlobalLimit: 30, loginWindowMs: 60_000 });
  try {
    fx.clock.now = 1_700_000_000_000;
    assert.equal((await login(fx.app, "wrong-password-1")).statusCode, 401);
    assert.equal((await login(fx.app, "wrong-password-2")).statusCode, 401);
    const blocked = await login(fx.app, PASSWORD);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.json().code, "rate_limited");
    assert.ok(Number(blocked.headers["retry-after"]) >= 1);
    await fx.reopen();
    assert.equal((await login(fx.app, PASSWORD)).statusCode, 429);
    fx.clock.now += 60_001;
    const allowed = await login(fx.app, PASSWORD);
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.body.includes(PASSWORD), false);
  } finally {
    await closeFixture(fx);
  }
});

test("drafts stay private until publish, and a new draft does not replace the old snapshot", async () => {
  const fx = createFixture();
  try {
    const auth = sessionFrom(await login(fx.app)).headers;
    const image = await png(2000, 1000);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=cover.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: image,
    });
    assert.equal(upload.statusCode, 202);
    assert.equal(upload.json().asset.status, "queued");
    assert.deepEqual(readdirSync(fx.staging).map((name) => /^[0-9a-f]{32}$/.test(name)), [true]);
    const processed = await drain(fx);
    assert.equal(processed[0].status, "ready");
    assert.deepEqual(readdirSync(fx.staging), []);
    const asset = (
      await fx.app.inject({ method: "GET", url: `/api/owner/assets/${upload.json().asset.id}`, headers: auth })
    ).json().asset;
    assert.equal(asset.kind, "image");
    assert.equal(asset.src, `/api/media/${asset.id}`);
    assert.equal(JSON.stringify(asset).includes("originals"), false);
    const derivedFiles = [];
    for (const entry of readdirSync(join(fx.derived, asset.id))) derivedFiles.push(entry);
    const derived = sharp(readFileSync(join(fx.derived, asset.id, derivedFiles[0])));
    const meta = await derived.metadata();
    assert.equal(meta.format, "webp");
    assert.ok(meta.width <= 1680 && meta.height <= 1680);
    const draft = {
      slug: "snapshot-work",
      title: "第一版",
      themeId: "sky",
      subtitle: "副题",
      category: "图片",
      description: "第一版简介",
      sortOrder: 1,
      coverAssetId: asset.id,
      media: [
        { assetId: asset.id, alt: "封面", caption: "第一张" },
        { assetId: asset.id, alt: "重复", caption: "应去掉" },
      ],
      processMedia: [],
    };
    const incomplete = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth, "content-type": "application/json" },
      payload: {
        draft: { slug: "empty-draft", title: "未完成", themeId: "ancient", description: "", coverAssetId: null, media: [] },
      },
    });
    assert.equal(incomplete.statusCode, 201);
    assert.equal(incomplete.json().work.publishedRevision, null);
    const tooSoon = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${incomplete.json().work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: incomplete.json().work.revision },
    });
    assert.equal(tooSoon.statusCode, 409);
    assert.equal(tooSoon.json().code, "not_ready");
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth, "content-type": "application/json" },
      payload: { draft },
    });
    assert.equal(created.statusCode, 201);
    const work = created.json().work;
    assert.equal(work.draft.media.length, 1);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works" })).json().works.length, 0);
    const preview = await fx.app.inject({
      method: "GET",
      url: `/api/owner/works/${work.id}/preview`,
      headers: auth,
    });
    assert.equal(preview.statusCode, 200);
    assert.equal(preview.json().work.number, "01");
    assert.equal(preview.json().work.media[0].kind, "image");
    const published = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: work.revision },
    });
    assert.equal(published.statusCode, 200);
    assert.equal(published.json().work.publishedRevision, published.json().work.revision);
    const conflict = await fx.app.inject({
      method: "PUT",
      url: `/api/owner/works/${work.id}`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: work.revision, draft: { ...draft, title: "过期标题" } },
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().code, "revision_conflict");
    const edited = await fx.app.inject({
      method: "PUT",
      url: `/api/owner/works/${work.id}`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: published.json().work.revision, draft: { ...draft, title: "第二版", description: "第二版简介" } },
    });
    assert.equal(edited.statusCode, 200);
    const still = (await fx.app.inject({ method: "GET", url: "/api/works/snapshot-work" })).json().work;
    assert.equal(still.title, "第一版");
    assert.equal(still.description, "第一版简介");
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/owner/works/${work.id}/preview`, headers: auth })).json().work.title, "第二版");
    const slug = await fx.app.inject({
      method: "PUT",
      url: `/api/owner/works/${work.id}`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: edited.json().work.revision, draft: { ...draft, slug: "renamed-work", title: "第二版" } },
    });
    assert.equal(slug.statusCode, 400);
    assert.equal(slug.json().code, "slug_immutable");
    const second = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: edited.json().work.revision },
    });
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/snapshot-work" })).json().work.title, "第二版");
    const removed = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${work.id}/unpublish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: second.json().work.revision },
    });
    assert.equal(removed.json().work.status, "draft");
    assert.equal(removed.json().work.publishedRevision, null);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/snapshot-work" })).statusCode, 404);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${asset.id}` })).statusCode, 404);
    const ownerRead = await fx.app.inject({ method: "GET", url: `/api/media/${asset.id}`, headers: auth });
    assert.equal(ownerRead.statusCode, 200);
    assert.equal(ownerRead.headers["content-type"], "image/webp");
  } finally {
    await closeFixture(fx);
  }
});

test("published media allows one range, rejects guesses, and ignores validators", async () => {
  const fx = createFixture();
  try {
    const auth = sessionFrom(await login(fx.app)).headers;
    const image = await png(48, 32);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=range.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: image,
    });
    await drain(fx);
    const id = upload.json().asset.id;
    const draft = {
      slug: "range-work",
      title: "范围",
      themeId: "home",
      category: "图片",
      description: "用于范围请求",
      sortOrder: 2,
      coverAssetId: id,
      media: [{ assetId: id, alt: "图", caption: "图" }],
    };
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth, "content-type": "application/json" },
      payload: { draft },
    });
    await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${created.json().work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: created.json().work.revision },
    });
    const full = await fx.app.inject({
      method: "GET",
      url: `/api/media/${id}`,
      headers: { "if-none-match": "*", "if-modified-since": "Tue, 15 Nov 1994 12:45:26 GMT" },
    });
    assert.equal(full.statusCode, 200);
    assert.equal(full.headers.etag, undefined);
    assert.equal(full.headers["cache-control"], "private, no-store");
    const ranged = await fx.app.inject({ method: "GET", url: `/api/media/${id}`, headers: { range: "bytes=0-3" } });
    assert.equal(ranged.statusCode, 206);
    assert.equal(ranged.headers["content-range"], `bytes 0-3/${full.rawPayload.length}`);
    assert.equal(ranged.rawPayload.length, 4);
    assert.equal(ranged.rawPayload.equals(full.rawPayload.subarray(0, 4)), true);
    const head = await fx.app.inject({ method: "HEAD", url: `/api/media/${id}` });
    assert.equal(head.statusCode, 200);
    assert.equal(head.headers["content-length"], String(full.rawPayload.length));
    assert.equal(head.rawPayload.length, 0);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${id}`, headers: { range: "bytes=0-1,2-3" } })).statusCode, 416);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${id}`, headers: { range: "bytes=999999-1000000" } })).statusCode, 416);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${"ab".repeat(16)}` })).statusCode, 404);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${id}/poster` })).statusCode, 404);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works" })).json().works.some((work) => work.title === "仪玄｜球场幻想"), false);
  } finally {
    await closeFixture(fx);
  }
});

test("rejects oversize, fake, animated, and oversized images, then retries the retained staging file", async () => {
  const fx = createFixture({ maxUploadBytes: 64, queueLimit: 2 });
  try {
    const auth = sessionFrom(await login(fx.app)).headers;
    const oversize = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=big.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: Buffer.alloc(65, 1),
    });
    assert.equal(oversize.statusCode, 413);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/owner/assets", headers: auth })).json().assets.length, 0);
  } finally {
    await closeFixture(fx);
  }

  const real = createFixture();
  try {
    const auth = sessionFrom(await login(real.app)).headers;
    const bad = await real.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=fake.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: Buffer.from("<html><script>alert(1)</script></html>"),
    });
    assert.equal(bad.statusCode, 202);
    assert.equal((await drain(real))[0].status, "error");
    const failed = (
      await real.app.inject({ method: "GET", url: `/api/owner/assets/${bad.json().asset.id}`, headers: auth })
    ).json().asset;
    assert.equal(failed.status, "error");
    assert.match(failed.error, /不支持的文件类型/);
    assert.doesNotMatch(failed.error, /[/\\]/);
    assert.equal(failed.body === undefined, true);
    const names = readdirSync(real.staging);
    assert.equal(names.length, 1);
    const repaired = await png(20, 16);
    writeFileSync(join(real.staging, names[0]), repaired);
    const retry = await real.app.inject({
      method: "POST",
      url: `/api/owner/assets/${failed.id}/retry`,
      headers: auth,
    });
    assert.equal(retry.statusCode, 200);
    assert.equal(retry.json().asset.status, "queued");
    assert.equal((await drain(real))[0].status, "ready");
    const wide = await png(12001, 1);
    const wideUp = await real.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=wide.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: wide,
    });
    assert.equal((await drain(real)).at(-1).status, "error");
    const wideAsset = (
      await real.app.inject({ method: "GET", url: `/api/owner/assets/${wideUp.json().asset.id}`, headers: auth })
    ).json().asset;
    assert.match(wideAsset.error, /尺寸或像素/);
    const base = await png(8, 8);
    const length = base.readUInt32BE(8);
    const animated = Buffer.concat([
      base.subarray(0, 8 + 12 + length),
      Buffer.concat([Buffer.from([0, 0, 0, 8]), Buffer.from("acTL"), Buffer.alloc(8), Buffer.alloc(4)]),
      base.subarray(8 + 12 + length),
    ]);
    const animUp = await real.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=anim.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: animated,
    });
    await drain(real);
    const animAsset = (
      await real.app.inject({ method: "GET", url: `/api/owner/assets/${animUp.json().asset.id}`, headers: auth })
    ).json().asset;
    assert.match(animAsset.error, /多帧/);
    const secret = "SECRET_COMMENT_TOKEN";
    const tagged = await png(18, 12, pngTextChunk("Comment", secret));
    assert.equal(tagged.includes(secret), true);
    const taggedUp = await real.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=tagged.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: tagged,
    });
    assert.equal((await drain(real)).at(-1).status, "ready");
    const stored = readFileSync(join(real.derived, taggedUp.json().asset.id, readdirSync(join(real.derived, taggedUp.json().asset.id))[0]));
    assert.equal(stored.includes(secret), false);
    const clip = Buffer.concat([
      Buffer.from([0, 0, 0, 20]),
      Buffer.from("ftypisom"),
      Buffer.alloc(8),
    ]);
    const video = await real.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=clip.mp4",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: clip,
    });
    const videoResult = (await drain(real)).at(-1);
    assert.equal(videoResult.status, "error");
    const videoAsset = (
      await real.app.inject({ method: "GET", url: `/api/owner/assets/${video.json().asset.id}`, headers: auth })
    ).json().asset;
    assert.notEqual(videoAsset.status, "ready");
    assert.match(videoAsset.error, /视频/);
  } finally {
    await closeFixture(real);
  }
});

test("a missing store marker blocks upload and publish but not text drafts, lists, or unpublish", async () => {
  const fx = createFixture();
  try {
    const auth = sessionFrom(await login(fx.app)).headers;
    const image = await png(16, 16);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=keep.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: image,
    });
    await drain(fx);
    const id = upload.json().asset.id;
    const draft = {
      slug: "stored-work",
      title: "已发布",
      themeId: "apocalypse",
      category: "图片",
      description: "存储断开前的简介",
      sortOrder: 4,
      coverAssetId: id,
      media: [{ assetId: id, alt: "图", caption: "图" }],
    };
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth, "content-type": "application/json" },
      payload: { draft },
    });
    const published = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${created.json().work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: created.json().work.revision },
    });
    rmSync(join(fx.derived, ".syyh-store-id"));
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/stored-work" })).json().work.title, "已发布");
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${id}` })).statusCode, 503);
    const blockedUpload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=more.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: image,
    });
    assert.equal(blockedUpload.statusCode, 503);
    assert.equal(blockedUpload.json().code, "storage_unavailable");
    const edited = await fx.app.inject({
      method: "PUT",
      url: `/api/owner/works/${created.json().work.id}`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: published.json().work.revision, draft: { ...draft, title: "只改文字", description: "断开后仍可保存" } },
    });
    assert.equal(edited.statusCode, 200);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/stored-work" })).json().work.title, "已发布");
    const republish = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${created.json().work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: edited.json().work.revision },
    });
    assert.equal(republish.statusCode, 503);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/stored-work" })).json().work.title, "已发布");
    const storage = await fx.app.inject({ method: "GET", url: "/api/owner/storage", headers: auth });
    assert.equal(storage.json().available, false);
    assert.equal(storage.json().code, "marker_missing");
    assert.equal(JSON.stringify(storage.json()).includes(fx.dir), false);
    const removed = await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${created.json().work.id}/unpublish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: edited.json().work.revision },
    });
    assert.equal(removed.statusCode, 200);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works" })).json().works.length, 0);
    writeFileSync(join(fx.derived, ".syyh-store-id"), STORE);
    const resumed = await fx.app.inject({ method: "GET", url: `/api/media/${id}`, headers: auth });
    assert.equal(resumed.statusCode, 200);
    assert.equal((await fx.app.inject({ method: "GET", url: `/api/media/${id}` })).statusCode, 404);
  } finally {
    await closeFixture(fx);
  }
});

test("works and sessions survive a restart, and guestbook idempotency still holds", async () => {
  const fx = createFixture();
  try {
    const auth = sessionFrom(await login(fx.app)).headers;
    const image = await png(12, 12);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=persist.png",
      headers: { ...auth, "content-type": "application/octet-stream" },
      payload: image,
    });
    await drain(fx);
    const id = upload.json().asset.id;
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth, "content-type": "application/json" },
      payload: {
        draft: {
          slug: "persist-work",
          title: "重启后还在",
          themeId: "ancient",
          category: "图片",
          description: "持久化",
          sortOrder: 3,
          coverAssetId: id,
          media: [{ assetId: id, alt: "图", caption: "图" }],
        },
      },
    });
    await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${created.json().work.id}/publish`,
      headers: { ...auth, "content-type": "application/json" },
      payload: { revision: created.json().work.revision },
    });
    const message = await fx.app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { "idempotency-key": "content-on-message-01" },
      payload: { callsign: "访客", message: "内容模块开启后的留言" },
    });
    assert.equal(message.statusCode, 201);
    assert.equal(
      (
        await fx.app.inject({
          method: "POST",
          url: "/api/messages",
          headers: { "idempotency-key": "content-on-message-01" },
          payload: { callsign: "访客", message: "内容模块开启后的留言" },
        })
      ).json().duplicate,
      true,
    );
    await fx.reopen();
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works/persist-work" })).json().work.title, "重启后还在");
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: auth })).json().authenticated,
      true,
    );
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/messages" })).json().entries.length, 0);
  } finally {
    await closeFixture(fx);
  }
});

test("CLI imports a draft, rejects escape and symlinks, and backups do not publish or revoke live sessions", async () => {
  const fx = createFixture();
  try {
    const help = await runCli(["help"]);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /import/);
    assert.match(help.stdout, /rotate-owner/);
    assert.match(help.stdout, /backup/);
    const image = await png(24, 18);
    const processImage = await png(10, 10);
    writeFileSync(join(fx.inbox, "image01.png"), image);
    writeFileSync(join(fx.inbox, "process.png"), processImage);
    writeFileSync(
      join(fx.inbox, "manifest.json"),
      JSON.stringify({
        draft: {
          slug: "test-work",
          title: "测试作品",
          themeId: "sky",
          subtitle: "",
          category: "图片",
          description: "简介",
          sortOrder: 1,
        },
        files: [
          { filename: "image01.png", role: "media", alt: "图像说明", caption: "第一张", cover: true },
          { filename: "process.png", role: "process", alt: "参考图", caption: "参考" },
        ],
      }),
    );
    const imported = await runCli(["import", "--inbox", fx.inbox, "--manifest", "manifest.json"], {
      env: cliEnv(fx),
    });
    assert.equal(imported.code, 0, imported.stderr);
    assert.equal(imported.stdout.includes(PASSWORD), false);
    const summary = JSON.parse(imported.stdout);
    assert.equal(summary.published, false);
    assert.equal(summary.slug, "test-work");
    const auth = sessionFrom(await login(fx.app)).headers;
    const works = (await fx.app.inject({ method: "GET", url: "/api/owner/works", headers: auth })).json().works;
    assert.equal(works.length, 1);
    assert.equal(works[0].status, "draft");
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/works" })).json().works.length, 0);
    const again = await runCli(["import", "--inbox", fx.inbox, "--manifest", "manifest.json"], { env: cliEnv(fx) });
    assert.equal(again.code, 2);
    assert.match(again.stderr, /不能覆盖/);
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/owner/works", headers: auth })).json().works.length, 1);

    const outside = join(fx.dir, "outside.png");
    writeFileSync(outside, image);
    writeFileSync(
      join(fx.inbox, "escape.json"),
      JSON.stringify({
        draft: { slug: "escape-work", title: "越界", themeId: "sky", category: "图片", description: "不该导入", sortOrder: 1 },
        files: [{ filename: "../outside.png", role: "media", alt: "", caption: "", cover: true }],
      }),
    );
    const escaped = await runCli(["import", "--inbox", fx.inbox, "--manifest", "escape.json"], { env: cliEnv(fx) });
    assert.notEqual(escaped.code, 0);
    assert.match(escaped.stderr, /越界|绝对路径|符号链接/);
    writeFileSync(
      join(fx.inbox, "absolute.json"),
      JSON.stringify({
        draft: { slug: "abs-work", title: "绝对", themeId: "sky", category: "图片", description: "不该导入", sortOrder: 1 },
        files: [{ filename: outside, role: "media", alt: "", caption: "", cover: true }],
      }),
    );
    const absolute = await runCli(["import", "--inbox", fx.inbox, "--manifest", "absolute.json"], { env: cliEnv(fx) });
    assert.notEqual(absolute.code, 0);

    const linkedRoot = mkdtempSync(join(tmpdir(), "syyh-v3-link-"));
    try {
      writeFileSync(join(linkedRoot, "secret.png"), image);
      symlinkSync(linkedRoot, join(fx.inbox, "linkdir"), "junction");
      assert.equal(lstatSync(join(fx.inbox, "linkdir")).isSymbolicLink(), true);
      writeFileSync(
        join(fx.inbox, "link.json"),
        JSON.stringify({
          draft: { slug: "link-work", title: "链接", themeId: "sky", category: "图片", description: "不该导入", sortOrder: 1 },
          files: [{ filename: "linkdir/secret.png", role: "media", alt: "", caption: "", cover: true }],
        }),
      );
      const linked = await runCli(["import", "--inbox", fx.inbox, "--manifest", "link.json"], { env: cliEnv(fx) });
      assert.notEqual(linked.code, 0);
      assert.match(linked.stderr, /符号链接/);
    } finally {
      rmSync(linkedRoot, { recursive: true, force: true });
    }
    assert.equal((await fx.app.inject({ method: "GET", url: "/api/owner/works", headers: auth })).json().works.length, 1);

    const guest = openStore(fx.guestPath);
    guest.prepare("INSERT INTO messages(callsign, message, idempotency_key) VALUES(?, ?, ?)").run("甲", "备份留言", "backup-message-0001");
    guest.close();
    const backupDir = join(fx.dir, "backups");
    mkdirSync(backupDir, { recursive: true });
    for (let day = 1; day <= 8; day += 1) {
      writeFileSync(join(backupDir, `content-2026-01-${String(day).padStart(2, "0")}.sqlite`), "");
    }
    const backed = await runCli(["backup", "--out", backupDir], { env: cliEnv(fx) });
    assert.equal(backed.code, 0, backed.stderr);
    assert.match(backed.stderr, /未删除/);
    const backup = JSON.parse(backed.stdout);
    assert.equal(backup.quota.exceeded, true);
    assert.equal(backup.quota.deleted, false);
    const manifest = JSON.parse(readFileSync(join(backupDir, backup.manifest), "utf8"));
    assert.equal(manifest.works.some((work) => work.slug === "test-work"), true);
    assert.ok(manifest.assets.every((asset) => asset.derivedSha256));
    assert.equal(JSON.stringify(manifest).includes(fx.dir), false);
    const guestCopy = new DatabaseSync(join(backupDir, backup.guestbookBackup), { readOnly: true });
    assert.equal(guestCopy.prepare("SELECT message FROM messages").get().message, "备份留言");
    guestCopy.close();
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: auth })).json().authenticated,
      true,
    );
    const restoredPath = join(fx.dir, "restored.sqlite");
    const restored = await runCli(
      ["restore", "--backup", join(backupDir, backup.contentBackup), "--to", restoredPath],
      { env: cliEnv(fx) },
    );
    assert.equal(restored.code, 0, restored.stderr);
    const restoredDb = new DatabaseSync(restoredPath, { readOnly: true });
    assert.equal(restoredDb.prepare("SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL").get().n, 0);
    assert.equal(restoredDb.prepare("SELECT slug FROM works WHERE slug = 'test-work'").get().slug, "test-work");
    restoredDb.close();
    const rotated = await runCli(["rotate-owner"], { env: cliEnv(fx), input: "replacement-pass-9\n" });
    assert.equal(rotated.code, 0, rotated.stderr);
    assert.equal(rotated.stdout.includes("replacement-pass-9"), false);
    assert.equal(rotated.stderr.includes("replacement-pass-9"), false);
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: auth })).json().authenticated,
      false,
    );
    assert.equal((await login(fx.app, PASSWORD)).statusCode, 401);
    assert.equal((await login(fx.app, "replacement-pass-9")).statusCode, 200);
  } finally {
    await closeFixture(fx);
  }
});

test("storage defaults match the contract limits", () => {
  assert.equal(LIMITS.maxUploadBytes, 30 * 1024 * 1024);
  assert.equal(LIMITS.maxEdge, 12000);
  assert.equal(LIMITS.maxPixels, 40_000_000);
  assert.equal(LIMITS.derivedMaxEdge, 1680);
  assert.equal(LIMITS.stagingQuotaBytes, 2 * 1024 * 1024 * 1024);
  assert.equal(LIMITS.queueLimit, 100);
  assert.equal(LIMITS.videoMaxDuration, 180);
  assert.equal(LIMITS.sessionAbsoluteMs, 8 * 60 * 60 * 1000);
  assert.equal(LIMITS.sessionIdleMs, 30 * 60 * 1000);
  assert.equal(LIMITS.loginIpLimit, 5);
  assert.equal(LIMITS.loginGlobalLimit, 30);
});
