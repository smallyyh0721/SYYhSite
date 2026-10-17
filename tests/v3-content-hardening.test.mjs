import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { openContentStore } from "../services/guestbook/content-store.mjs";
import { LIMITS } from "../services/guestbook/content-storage.mjs";
import { runWorkerOnce } from "../services/guestbook/media-worker.mjs";
import { hashPassword } from "../services/guestbook/owner-password.mjs";
import { DEV_COOKIE_NAME } from "../services/guestbook/owner-session.mjs";
import { createServer } from "../services/guestbook/server.mjs";

const PASSWORD = "correct-horse-battery";
const PASSWORD_HASH = await hashPassword(PASSWORD);
const ORIGIN = "https://content.test";
const HOST = "content.test";
const STORE = "store-test-0001";

function headers(extra = {}) {
  return { host: HOST, origin: ORIGIN, "x-forwarded-proto": "https", ...extra };
}

function createFixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "syyh-v3-hard-"));
  const cos = join(dir, "cos");
  const derived = join(cos, "derived");
  const staging = join(dir, "staging");
  mkdirSync(derived, { recursive: true });
  mkdirSync(staging, { recursive: true });
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
    now: () => clock.now,
    ...overrides,
  };
  return {
    dir,
    cos,
    derived,
    staging,
    clock,
    content,
    dbPath: content.dbPath,
    app: createServer({ dbPath: ":memory:", content }),
  };
}

async function closeFixture(fx) {
  await fx.app.close();
  rmSync(fx.dir, { recursive: true, force: true });
}

async function login(app, password = PASSWORD, extra = {}) {
  return app.inject({
    method: "POST",
    url: "/api/owner/session",
    headers: headers({ "content-type": "application/json", ...extra.headers }),
    payload: { password },
    remoteAddress: extra.remoteAddress,
  });
}

function sessionFrom(response) {
  const setCookie = String(response.headers["set-cookie"] || "");
  const pair = setCookie.split(";")[0];
  const body = response.json();
  return {
    setCookie,
    pair,
    headers: headers({ cookie: pair, "x-csrf-token": body.csrfToken }),
  };
}

async function png(width, height) {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 40, b: 80 } } })
    .png()
    .toBuffer();
}

function workerOptions(fx) {
  return {
    dbPath: fx.dbPath,
    stagingRoot: fx.staging,
    cosSiteRoot: fx.cos,
    storeId: STORE,
    now: fx.content.now,
  };
}

function runWorkerProcess(options) {
  const href = new URL("../services/guestbook/media-worker.mjs", import.meta.url).href;
  const script = `import { runWorkerOnce } from ${JSON.stringify(href)};
const result = await runWorkerOnce(${JSON.stringify(options)});
process.stdout.write(JSON.stringify({ processed: Boolean(result.processed), status: result.status || null }));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
      shell: false,
      windowsHide: true,
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`worker ${code}: ${stderr}`));
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
}

test("concurrent logins reserve source and global slots before scrypt", async () => {
  const fx = createFixture({ loginIpLimit: 2, loginGlobalLimit: 30, loginWindowMs: 60_000 });
  try {
    const same = await Promise.all(
      Array.from({ length: 6 }, () => login(fx.app, "incorrect-password")),
    );
    assert.equal(same.filter((response) => response.statusCode === 401).length, 2);
    assert.equal(same.filter((response) => response.statusCode === 429).length, 4);
    const globalFx = createFixture({ loginIpLimit: 5, loginGlobalLimit: 3, loginWindowMs: 60_000 });
    try {
      const mixed = await Promise.all(
        Array.from({ length: 6 }, (_, index) =>
          login(globalFx.app, "incorrect-password", { remoteAddress: `203.0.113.${index + 1}` }),
        ),
      );
      assert.equal(mixed.filter((response) => response.statusCode === 401).length, 3);
      assert.equal(mixed.filter((response) => response.statusCode === 429).length, 3);
      const db = openContentStore(globalFx.dbPath);
      const globalCount = db
        .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE source_key = '*'")
        .get().n;
      db.close();
      assert.equal(globalCount, 3);
    } finally {
      await closeFixture(globalFx);
    }
  } finally {
    await closeFixture(fx);
  }
});

test("a successful login clears only that source and leaves other sources in the global count", async () => {
  const fx = createFixture({ loginIpLimit: 5, loginGlobalLimit: 3, loginWindowMs: 60_000 });
  try {
    assert.equal((await login(fx.app, "wrong-password-1", { remoteAddress: "203.0.113.10" })).statusCode, 401);
    assert.equal((await login(fx.app, "wrong-password-2", { remoteAddress: "203.0.113.11" })).statusCode, 401);
    assert.equal((await login(fx.app, PASSWORD, { remoteAddress: "203.0.113.10" })).statusCode, 200);
    const db = openContentStore(fx.dbPath);
    const count = (key) =>
      db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE source_key = ?").get(key).n;
    assert.equal(count("203.0.113.10"), 0);
    assert.equal(count("*"), 2);
    db.close();
    assert.equal((await login(fx.app, "wrong-password-3", { remoteAddress: "203.0.113.12" })).statusCode, 401);
    assert.equal((await login(fx.app, "wrong-password-4", { remoteAddress: "203.0.113.13" })).statusCode, 429);
  } finally {
    await closeFixture(fx);
  }
});

test("loopback development cookie is readable without the __Host- prefix", async () => {
  const fx = createFixture({ publicOrigin: "http://localhost:8080", allowInsecureDev: true });
  try {
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/session",
      headers: {
        host: "localhost:8080",
        origin: "http://localhost:8080",
        "content-type": "application/json",
      },
      payload: { password: PASSWORD },
    });
    assert.equal(created.statusCode, 200);
    const setCookie = String(created.headers["set-cookie"]);
    assert.match(setCookie, new RegExp(`^${DEV_COOKIE_NAME}=`));
    assert.equal(setCookie.startsWith("__Host-"), false);
    assert.equal(setCookie.startsWith("__Secure-"), false);
    assert.doesNotMatch(setCookie, /Secure/);
    const pair = setCookie.split(";")[0];
    const token = pair.slice(DEV_COOKIE_NAME.length + 1);
    const devHeaders = { host: "localhost:8080", origin: "http://localhost:8080", cookie: pair };
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: devHeaders })).json().authenticated,
      true,
    );
    const forged = await fx.app.inject({
      method: "GET",
      url: "/api/owner/session",
      headers: { ...devHeaders, cookie: `__Host-syyh_owner=${token}` },
    });
    assert.equal(forged.json().authenticated, false);
    const removed = await fx.app.inject({
      method: "DELETE",
      url: "/api/owner/session",
      headers: { ...devHeaders, "x-csrf-token": created.json().csrfToken },
    });
    assert.equal(removed.statusCode, 200);
    assert.match(String(removed.headers["set-cookie"]), new RegExp(`^${DEV_COOKIE_NAME}=`));
    assert.match(String(removed.headers["set-cookie"]), /Max-Age=0/);
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: devHeaders })).json().authenticated,
      false,
    );
  } finally {
    await closeFixture(fx);
  }
});

test("upload auth rejects before the body, and the raw parser counts chunks once", async () => {
  const fx = createFixture({ maxUploadBytes: 64 });
  let pending;
  try {
    const auth = sessionFrom(await login(fx.app));
    await fx.app.listen({ host: "127.0.0.1", port: 0 });
    const port = fx.app.server.address().port;
    const anonymous = await new Promise((resolve) => {
      pending = http.request(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/owner/uploads?filename=test.png",
          agent: false,
          headers: { ...headers(), "content-type": "application/octet-stream", "content-length": "1000000", connection: "close" },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      pending.on("error", () => resolve("connection-closed"));
      pending.setTimeout(1000, () => {
        resolve("timeout-waiting-for-body");
        pending.destroy();
      });
      pending.flushHeaders();
    });
    assert.equal(anonymous, 401);
    const noCsrf = {
      ...auth.headers,
      "content-type": "application/octet-stream",
      "content-length": "1000000",
    };
    delete noCsrf["x-csrf-token"];
    const missingCsrf = await rawStatus(port, noCsrf);
    assert.equal(missingCsrf, 403);
    const chunked = await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/owner/uploads?filename=oversize.png",
          agent: false,
          headers: { ...auth.headers, "content-type": "application/octet-stream", connection: "close" },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
        },
      );
      req.on("error", () => resolve({ status: "closed", body: "" }));
      req.write(Buffer.alloc(40));
      req.write(Buffer.alloc(40));
      req.end();
    });
    assert.equal(chunked.status, 413);
    assert.equal(chunked.body.includes(fx.dir), false);
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/assets", headers: auth.headers })).json().assets.length,
      0,
    );
    const aborted = await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/owner/uploads?filename=partial.png",
          agent: false,
          headers: {
            ...auth.headers,
            "content-type": "application/octet-stream",
            "content-length": "100000",
            connection: "close",
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", () => resolve("closed"));
      req.write(Buffer.alloc(20));
      setTimeout(() => req.destroy(), 30);
      setTimeout(() => resolve("hung"), 1000);
    });
    assert.notEqual(aborted, "hung");
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/session", headers: auth.headers })).json().authenticated,
      true,
    );
    assert.equal(
      (await fx.app.inject({ method: "GET", url: "/api/owner/assets", headers: auth.headers })).json().assets.length,
      0,
    );
  } finally {
    pending?.destroy();
    await closeFixture(fx);
  }
});

function rawStatus(port, headerBlock) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method: "POST",
        path: "/api/owner/uploads?filename=test.png",
        agent: false,
        headers: { ...headerBlock, connection: "close" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", () => resolve("connection-closed"));
    req.setTimeout(1000, () => {
      resolve("timeout-waiting-for-body");
      req.destroy();
    });
    req.flushHeaders();
  });
}

test("two worker processes do not process one leased asset, and an expired lease can be recovered", async () => {
  const fx = createFixture();
  try {
    assert.ok(LIMITS.workerHeartbeatMs * 2 <= LIMITS.workerLeaseMs);
    const auth = sessionFrom(await login(fx.app));
    const image = await png(24, 16);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=once.png",
      headers: { ...auth.headers, "content-type": "application/octet-stream" },
      payload: image,
    });
    assert.equal(upload.statusCode, 202);
    const assetId = upload.json().asset.id;
    const options = {
      dbPath: fx.dbPath,
      stagingRoot: fx.staging,
      cosSiteRoot: fx.cos,
      storeId: STORE,
    };
    const [first, second] = await Promise.all([runWorkerProcess(options), runWorkerProcess(options)]);
    assert.equal([first, second].filter((result) => result.processed).length, 1);
    assert.equal(readdirSync(join(fx.derived, assetId)).length, 1);
    const held = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=held.png",
      headers: { ...auth.headers, "content-type": "application/octet-stream" },
      payload: image,
    });
    const heldId = held.json().asset.id;
    const db = openContentStore(fx.dbPath);
    db.prepare(
      "UPDATE assets SET status = 'processing', claim_token = 'held-token', lease_until = ? WHERE id = ?",
    ).run(fx.clock.now + LIMITS.workerLeaseMs, heldId);
    db.close();
    const skipped = await runWorkerOnce(workerOptions(fx));
    assert.equal(skipped.processed, false);
    const during = openContentStore(fx.dbPath);
    assert.equal(during.prepare("SELECT claim_token FROM assets WHERE id = ?").get(heldId).claim_token, "held-token");
    during.prepare("UPDATE assets SET lease_until = NULL WHERE id = ?").run(heldId);
    during.close();
    const recovered = await runWorkerOnce(workerOptions(fx));
    assert.equal(recovered.processed, true);
    assert.equal(recovered.status, "ready");
    assert.equal(readdirSync(join(fx.derived, heldId)).length, 1);
  } finally {
    await closeFixture(fx);
  }
});

test("published media is hashed and streamed without putting the file path in errors", async () => {
  const fx = createFixture();
  try {
    const auth = sessionFrom(await login(fx.app));
    const image = await png(32, 20);
    const upload = await fx.app.inject({
      method: "POST",
      url: "/api/owner/uploads?filename=hash.png",
      headers: { ...auth.headers, "content-type": "application/octet-stream" },
      payload: image,
    });
    const assetId = upload.json().asset.id;
    assert.equal((await runWorkerOnce(workerOptions(fx))).status, "ready");
    const draft = {
      slug: "hash-work",
      title: "校验",
      themeId: "sky",
      category: "图片",
      description: "哈希",
      sortOrder: 3,
      coverAssetId: assetId,
      media: [{ assetId, alt: "图", caption: "图" }],
    };
    const created = await fx.app.inject({
      method: "POST",
      url: "/api/owner/works",
      headers: { ...auth.headers, "content-type": "application/json" },
      payload: { draft },
    });
    const work = created.json().work;
    await fx.app.inject({
      method: "POST",
      url: `/api/owner/works/${work.id}/publish`,
      headers: { ...auth.headers, "content-type": "application/json" },
      payload: { revision: work.revision },
    });
    const full = await fx.app.inject({ method: "GET", url: `/api/media/${assetId}` });
    assert.equal(full.statusCode, 200);
    assert.equal(full.headers["content-type"], "image/webp");
    const ranged = await fx.app.inject({
      method: "GET",
      url: `/api/media/${assetId}`,
      headers: { range: "bytes=0-3" },
    });
    assert.equal(ranged.statusCode, 206);
    assert.equal(ranged.rawPayload.equals(full.rawPayload.subarray(0, 4)), true);
    const head = await fx.app.inject({ method: "HEAD", url: `/api/media/${assetId}` });
    assert.equal(head.statusCode, 200);
    assert.equal(head.headers["content-length"], String(full.rawPayload.length));
    assert.equal(head.rawPayload.length, 0);
    const derivedName = readdirSync(join(fx.derived, assetId))[0];
    const derivedPath = join(fx.derived, assetId, derivedName);
    const bytes = readFileSync(derivedPath);
    bytes[bytes.length - 1] ^= 0xff;
    writeFileSync(derivedPath, bytes);
    const broken = await fx.app.inject({ method: "GET", url: `/api/media/${assetId}` });
    assert.equal(broken.statusCode, 503);
    assert.equal(broken.json().code, "media_unavailable");
    assert.equal(broken.body.includes(fx.dir), false);
    assert.equal(broken.body.includes(derivedName), false);
    const brokenHead = await fx.app.inject({ method: "HEAD", url: `/api/media/${assetId}` });
    assert.equal(brokenHead.statusCode, 503);
    assert.equal(brokenHead.rawPayload.length, 0);
  } finally {
    await closeFixture(fx);
  }
});
