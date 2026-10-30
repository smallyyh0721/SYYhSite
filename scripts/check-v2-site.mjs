// Production-safe site regression. Pass the origin you want; nothing is rewritten to localhost.
// Dev screenshots should use http://localhost:8895. 127.0.0.1 makes Next HMR look like a hydration error.
//
//   node scripts/check-v2-site.mjs --origin http://localhost:8895 --out docs/agent-work/evidence/P4-12
//   node scripts/check-v2-site.mjs http://localhost:8895 docs/agent-work/evidence/P4-12 --allow-pending
//
// Real image routes are never replaced with fixtures.
// Missing greeting films and visitor.glb stay pending.
// After every navigation, wait for html[data-client-ready=true] before clicks, keys, or image reads.
// Images must match the theme and report naturalWidth > 0. A late marker is not treated as success.
// When a greeting file is served, check the day/night and landscape/portrait source, then ended or skip, the play count, and no replay.
// ffmpeg decode stays in verify-v2-assets.mjs. This script does not intercept a real film to substitute a fixture.
// A separate fault-intercept scenario returns 404 for those real URLs on purpose.
// Current image greeting: pass --without-video-greeting and separately run
// P5-06-lead/check-image-greeting.mjs + check-transition-safety.mjs.
// That flag excludes historical video scenarios; it does not mark them passed.
// This script only GETs /api/health and /api/messages. It aborts any other API method.
//
// Exit 0: no failures, and no pending (or --allow-pending).
// Exit 1: a check failed, including a guestbook API that answered with a bad contract.
// Exit 2: official media or the read-only API is still pending. An unreadable API is not a pass.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices } from "@playwright/test";
import sharp from "sharp";

const THEMES = {
  sky: "Her",
  ancient: "ZZZ",
  apocalypse: "FFF",
  home: "COS",
};
const RUNTIME_IMAGES = [
  "/media/v2/islands/sky-day.webp",
  "/media/v2/islands/sky-night.webp",
  "/media/v2/islands/ancient-day.webp",
  "/media/v2/islands/ancient-night.webp",
  "/media/v2/islands/apocalypse-day.webp",
  "/media/v2/islands/apocalypse-night.webp",
  "/media/v2/islands/home-day.webp",
  "/media/v2/islands/home-night.webp",
  "/media/v2/environment/day.webp",
  "/media/v2/environment/night.webp",
  "/media/v2/environment/day-portrait.webp",
  "/media/v2/environment/night-portrait.webp",
  "/media/v2/environment/cloud-far-day.webp",
  "/media/v2/environment/cloud-far-night.webp",
  "/media/v2/environment/cloud-near-day.webp",
  "/media/v2/environment/cloud-near-night.webp",
];

function parseArgs(argv) {
  const args = { allowPending: false, withoutVideoGreeting: false, origin: "", out: "", positionals: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--allow-pending") args.allowPending = true;
    else if (token === "--without-video-greeting") args.withoutVideoGreeting = true;
    else if (token === "--origin") args.origin = argv[++i] || "";
    else if (token === "--out") args.out = argv[++i] || "";
    else if (token === "--help") args.help = true;
    else if (token.startsWith("--")) throw new Error("Unknown argument: " + token);
    else args.positionals.push(token);
  }
  args.origin = (args.origin || args.positionals[0] || "").replace(/\/$/, "");
  args.out = args.out || args.positionals[1] || "";
  return args;
}

function hideDevBadge() {
  const hide = () => {
    if (!document.documentElement || document.getElementById("p4-12-hide-dev")) return;
    const style = document.createElement("style");
    style.id = "p4-12-hide-dev";
    style.textContent = "nextjs-portal{display:none !important}";
    document.documentElement.append(style);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hide, { once: true });
  else hide();
}

async function launch() {
  try {
    return await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
  } catch {
    return chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
  }
}

function classifyReadOnlyApi(health, messages) {
  const clip = (item) => ({ status: item.status, body: String(item.body || "").slice(0, 240) });
  const detail = {
    health: clip(health),
    messages: clip(messages),
    note: "GET only. No message was posted to this origin.",
  };
  const appJson = (body) => {
    const text = String(body || "").trim();
    if (!text.startsWith("{") && !text.startsWith("[")) return false;
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };
  const unreadable = (item) => item.status === 0 || item.status === 404 || item.status === 502 || item.status === 503 || item.status === 504
    || (item.status === 500 && !appJson(item.body));
  if (unreadable(health) || unreadable(messages)) {
    return {
      status: "pending",
      detail: { ...detail, scene: "api-unreadable", reason: "public GET did not reach a readable guestbook API" },
    };
  }
  let healthJson = null;
  let messageJson = null;
  try { healthJson = JSON.parse(health.body); } catch {}
  try { messageJson = JSON.parse(messages.body); } catch {}
  if (health.status === 200 && healthJson && healthJson.status === "ok" && messages.status === 200 && messageJson && Array.isArray(messageJson.entries)) {
    return { scene: "api-read", health: health.status, entries: messageJson.entries.length };
  }
  return {
    status: "fail",
    detail: { ...detail, scene: "api-error", reason: "API answered but GET /api/health or GET /api/messages did not match the public contract" },
  };
}

function apiSelfTest() {
  const cases = [
    ["unreachable api stays pending", { status: 0, body: "" }, { status: 0, body: "" }, "pending", "api-unreadable"],
    ["generic 500 stays pending", { status: 500, body: "Internal Server Error" }, { status: 500, body: "Internal Server Error" }, "pending", "api-unreadable"],
    ["json 500 is a service failure", { status: 500, body: "{\"error\":\"db\"}" }, { status: 200, body: "{\"entries\":[]}" }, "fail", "api-error"],
    ["contract match passes", { status: 200, body: "{\"status\":\"ok\"}" }, { status: 200, body: "{\"entries\":[]}" }, "pass", "api-read"],
    ["wrong 200 is a service failure", { status: 200, body: "{\"status\":\"no\"}" }, { status: 200, body: "{\"entries\":[]}" }, "fail", "api-error"],
  ];
  return cases.map(([name, health, messages, expect, scene]) => {
    const result = classifyReadOnlyApi(health, messages);
    const got = result.status || "pass";
    const gotScene = result.scene || result.detail?.scene;
    return {
      name,
      kind: "fixture",
      status: got === expect && gotScene === scene ? "pass" : "fail",
      detail: { expect, got, scene: gotScene },
    };
  });
}

const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function waitForClient(page) {
  try {
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true", undefined, { timeout: 20000 });
  } catch {
    const snap = await page.evaluate(() => ({
      ready: document.documentElement.dataset.clientReady || "",
      theme: document.documentElement.dataset.theme || "",
      url: location.href,
    })).catch(() => ({ url: page.url() }));
    throw new Error("client-ready timed out before interaction (hydration or slow client) " + JSON.stringify(snap));
  }
}

async function openPage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForClient(page);
}

async function setTheme(page, theme) {
  await waitForClient(page);
  const name = theme === "day" ? "日间" : "夜间";
  await page.getByRole("button", { name, exact: true }).click();
  try {
    await page.waitForFunction((value) => document.documentElement.dataset.clientReady === "true" && document.documentElement.dataset.theme === value, theme, { timeout: 8000 });
  } catch {
    const snap = await page.evaluate(() => ({
      ready: document.documentElement.dataset.clientReady || "",
      theme: document.documentElement.dataset.theme || "",
    }));
    throw new Error("theme click did not stick after client-ready " + JSON.stringify(snap));
  }
}

async function snapshotImages(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => nodes.map((node) => ({
    src: node.currentSrc || node.getAttribute("src") || node.getAttribute("data-art") || "",
    width: node.querySelector?.("img[data-subject]")?.naturalWidth || node.naturalWidth || 0,
    ready: node.dataset?.ready || node.getAttribute?.("data-image-state") || "",
  }))).catch(() => []);
}

function imageFailure(kind, snap, theme) {
  const decoded = snap.length > 0 && snap.every((item) => item.width > 0);
  const themed = snap.length > 0 && snap.every((item) => {
    const src = String(item.src || "");
    return src.includes("/" + theme + ".webp") || src.includes("-" + theme + ".webp") || src.includes(theme + "-portrait.webp");
  });
  const why = !snap.length ? "images missing" : !themed ? "source does not match theme" : !decoded ? "still decoding (loader or slow network)" : "decoded image was not accepted";
  return new Error(kind + " " + why + " " + JSON.stringify(snap));
}

async function waitForSky(page, theme) {
  await waitForClient(page);
  const box = page.viewportSize() || { width: 0, height: 0 };
  const portrait = box.height > box.width;
  try {
    await page.waitForFunction(({ theme: value, portrait: isPortrait }) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const img = document.querySelector("[data-gate-sky] img");
      if (!img) return false;
      const src = img.currentSrc || img.getAttribute("src") || "";
      const portraitFile = "/" + value + "-portrait.webp";
      const landscapeFile = "/" + value + ".webp";
      const matched = isPortrait ? src.includes(portraitFile) : src.includes(landscapeFile) && !src.includes(portraitFile);
      return matched && img.naturalWidth > 0;
    }, { theme, portrait }, { timeout: 20000 });
  } catch {
    throw imageFailure("gate sky", await snapshotImages(page, "[data-gate-sky] img"), theme);
  }
}

async function waitForBackground(page, theme) {
  await waitForClient(page);
  try {
    await page.waitForFunction((value) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const imgs = [...document.querySelectorAll("[data-dynamic-background] img")];
      if (imgs.length < 3) return false;
      return imgs.every((img) => {
        const src = img.currentSrc || img.getAttribute("src") || "";
        const themed = src.includes("-" + value + ".webp") || src.includes("/" + value + ".webp") || src.includes(value + "-portrait.webp");
        return themed && img.naturalWidth > 0 && img.dataset.ready === "true";
      });
    }, theme, { timeout: 20000 });
  } catch {
    throw imageFailure("hub background", await snapshotImages(page, "[data-dynamic-background] img"), theme);
  }
}

async function waitForIslands(page, theme) {
  await waitForClient(page);
  try {
    await page.waitForFunction((value) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const nodes = [...document.querySelectorAll("[data-island]")];
      if (nodes.length !== 4) return false;
      return nodes.every((node) => {
        const frame = node.closest("[data-image-state]");
        const art = node.getAttribute("data-art") || "";
        const img = node.querySelector("img[data-subject]");
        return frame && frame.getAttribute("data-image-state") === "ready" && art.includes("-" + value + ".webp") && Boolean(img) && img.naturalWidth > 0;
      });
    }, theme, { timeout: 20000 });
  } catch {
    throw imageFailure("islands", await snapshotImages(page, "[data-island]"), theme);
  }
}

async function waitForGalleryReady(page, needle) {
  await waitForClient(page);
  try {
    await page.waitForFunction((expected) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const gallery = document.querySelector("[data-gallery='works']");
      if (!gallery) return false;
      const stages = [...gallery.querySelectorAll("article[data-crop] [data-image-state]")];
      if (!stages.length) return false;
      return stages.every((node) => {
        const img = node.querySelector("img");
        const src = img ? (img.currentSrc || img.getAttribute("src") || "") : "";
        const matched = !expected || src.includes(expected);
        return node.getAttribute("data-image-state") === "loaded" && Boolean(img) && img.naturalWidth > 0 && matched;
      });
    }, needle || "", { timeout: 20000 });
  } catch {
    throw imageFailure("galleryReady", await snapshotImages(page, "[data-gallery='works'] article[data-crop] img"), needle && needle.includes("night") ? "night" : "day");
  }
}

async function waitForOneImage(page, selector, needle) {
  await waitForClient(page);
  try {
    await page.waitForFunction(({ selector: target, needle: expected }) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const img = document.querySelector(target);
      if (!img) return false;
      const src = img.currentSrc || img.getAttribute("src") || "";
      return src.includes(expected) && img.naturalWidth > 0;
    }, { selector, needle }, { timeout: 20000 });
  } catch {
    throw imageFailure(selector, await snapshotImages(page, selector), needle.includes("night") ? "night" : "day");
  }
}

function greetingPaths(theme, portrait) {
  const suffix = portrait ? "-portrait" : "";
  return {
    mp4: `/media/v2/avatar/greeting-${theme}${suffix}.mp4`,
    webm: `/media/v2/avatar/greeting-${theme}${suffix}.webm`,
    poster: `/media/v2/avatar/greeting-${theme}${suffix}.webp`,
    portrait: Boolean(portrait),
    theme,
  };
}

async function armGreetingCounter(page) {
  await page.evaluate(() => {
    const state = { plays: 0, ended: 0, playsAfterEnd: 0, srcs: [] };
    const save = () => {
      window.__p4greeting = state;
      try { sessionStorage.setItem("syyh-p4-greeting-counter", JSON.stringify(state)); } catch {}
    };
    save();
    const proto = HTMLMediaElement.prototype;
    if (!proto.__p4play) proto.__p4play = proto.play;
    proto.play = function (...args) {
      const live = window.__p4greeting;
      if (live && this.closest && this.closest("[data-greeting]")) {
        if (live.ended > 0) live.playsAfterEnd += 1;
        else live.plays += 1;
        if (!this.__p4watched) {
          this.__p4watched = true;
          this.addEventListener("loadeddata", () => {
            if (this.currentSrc) live.srcs.push(this.currentSrc);
            save();
          }, { once: true });
          this.addEventListener("ended", () => {
            live.ended += 1;
            save();
          }, { once: true });
        }
        save();
      }
      return proto.__p4play.apply(this, args);
    };
  });
}

async function readGreetingCounter(page) {
  return page.evaluate(() => {
    if (window.__p4greeting) return window.__p4greeting;
    try {
      const raw = sessionStorage.getItem("syyh-p4-greeting-counter");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
}

async function readGreetingSelection(page) {
  return page.evaluate(() => {
    const node = document.querySelector("[data-greeting]");
    const video = node?.querySelector("video") || null;
    return {
      phase: document.querySelector("[data-phase]")?.getAttribute("data-phase") || "",
      video: node?.getAttribute("data-greeting-video") || "",
      poster: node?.getAttribute("data-greeting-poster") || "",
      portrait: node?.getAttribute("data-greeting-portrait") || "",
      loop: video ? video.loop : null,
      sources: video ? [...video.querySelectorAll("source")].map((source) => source.getAttribute("src") || "") : [],
      state: node?.getAttribute("data-greeting-state") || "",
    };
  });
}

function playedWrongSource(counter, paths) {
  return (counter?.srcs || []).some((src) => !src.includes(paths.mp4) && !src.includes(paths.webm));
}

function greetingFinishError(reason, counter, paths) {
  const detail = JSON.stringify({ reason, counter, paths });
  if (playedWrongSource(counter, paths)) return "greeting source mismatch " + detail;
  if (reason === "timeout") return "page gave up before finish (slow start or loader) " + detail;
  if (reason === "error") return "greeting media error (network or decode) " + detail;
  if (reason === "abort") return "greeting aborted before finish " + detail;
  if (!counter) return "play counter missing after navigation " + detail;
  if (reason === "ended" && (counter.ended !== 1 || counter.playsAfterEnd !== 0 || counter.plays < 1)) {
    return "greeting replay or play count " + detail;
  }
  if (reason === "skip" && (counter.ended !== 0 || counter.playsAfterEnd !== 0)) {
    return "greeting replay after skip " + detail;
  }
  return "greeting reason " + reason + " " + detail;
}

async function waitForGreetingSelection(page, paths) {
  await waitForClient(page);
  const flag = paths.portrait ? "true" : "false";
  try {
    await page.waitForFunction(({ paths: expected, portrait }) => {
      if (document.documentElement.dataset.clientReady !== "true") return false;
      const node = document.querySelector("[data-greeting]");
      const video = node?.querySelector("video");
      if (!node || !video) return false;
      const sources = [...video.querySelectorAll("source")].map((source) => source.getAttribute("src") || "");
      return (node.getAttribute("data-greeting-video") || "").includes(expected.mp4)
        && (node.getAttribute("data-greeting-poster") || "").includes(expected.poster)
        && sources.some((src) => src.includes(expected.webm))
        && node.getAttribute("data-greeting-portrait") === portrait
        && video.loop === false;
    }, { paths, portrait: flag }, { timeout: 8000 });
  } catch {
    const selection = await readGreetingSelection(page);
    if (selection.phase !== "greeting" || !selection.video) {
      throw new Error("greeting did not start after CONNECT (click before interaction or slow client) " + JSON.stringify(selection));
    }
    throw new Error("greeting source mismatch " + JSON.stringify(selection));
  }
}

async function readinessSelfTest(browser) {
  const checks = [];
  const expect = (name, ok, detail) => checks.push({ name, kind: "fixture", status: ok ? "pass" : "fail", detail });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    let release = () => {};
    const hold = new Promise((resolve) => { release = resolve; });
    await page.route("**/media/v2/environment/night.webp", async (route) => {
      await hold;
      await route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG });
    });
    await page.setContent("<!doctype html><html data-theme=\"night\"><body><button type=\"button\">夜间</button><img id=\"plate\" alt=\"\"></body></html>", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { document.querySelector("#plate").src = "http://fixture.test/media/v2/environment/night.webp"; });
    let clientDone = false;
    const clientWait = waitForClient(page).then(() => { clientDone = true; });
    await page.waitForTimeout(350);
    expect("late client-ready is not treated as already interactive", clientDone === false, { clientDone });
    await page.evaluate(() => { document.documentElement.dataset.clientReady = "true"; });
    await clientWait;
    await page.evaluate(() => { delete document.documentElement.dataset.clientReady; });
    let themeDone = false;
    const themeWait = setTheme(page, "night").then(() => { themeDone = true; });
    await page.waitForTimeout(300);
    expect("setTheme waits when night is already set", themeDone === false, { themeDone });
    await page.evaluate(() => { document.documentElement.dataset.clientReady = "true"; });
    await themeWait;
    let imageDone = false;
    const imageWait = waitForOneImage(page, "#plate", "night.webp").then(() => { imageDone = true; }, () => { imageDone = true; });
    await page.waitForTimeout(250);
    const earlyWidth = await page.evaluate(() => document.querySelector("#plate").naturalWidth);
    expect("theme src with naturalWidth 0 is not accepted", imageDone === false && earlyWidth === 0, { imageDone, earlyWidth });
    release();
    await imageWait;
    const width = await page.evaluate(() => document.querySelector("#plate").naturalWidth);
    expect("delayed image decode becomes readable", width > 0, { width });
  } catch (error) {
    expect("readiness fixture ran", false, String(error && error.stack ? error.stack : error));
  } finally {
    await context.close();
  }
  return checks;
}

async function fetchStatus(url) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, buffer, type: response.headers.get("content-type") };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.origin || !args.out) {
    console.log("node scripts/check-v2-site.mjs --origin <url> --out <dir> [--allow-pending] [--without-video-greeting]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }
  const origin = args.origin;
  const destination = resolve(args.out);
  await mkdir(destination, { recursive: true });
  const host = new URL(origin).hostname;
  if (host === "127.0.0.1" || host === "::1") {
    console.warn("Requested origin is " + host + ". Next dev HMR can create false hydration pageerrors there. This script does not rewrite the origin.");
  }

  const checks = [];
  const pageErrors = [];
  const http = [];
  const writes = [];
  let apiReachable = false;
  let apiScene = "";
  let scenario = "setup";
  const selfTest = apiSelfTest();
  for (const item of selfTest) console.log(item.status.toUpperCase(), "fixture", item.name);
  const record = (name, status, detail) => {
    checks.push({ name, scenario, status, ok: status === "pass", detail });
    console.log(status.toUpperCase(), scenario, name);
  };
  const step = async (name, fn) => {
    try {
      const detail = await fn();
      const status = detail && detail.status ? detail.status : "pass";
      record(name, status, detail && detail.status ? detail.detail : detail);
      return status;
    } catch (error) {
      record(name, "fail", String(error && error.stack ? error.stack : error));
      return "fail";
    }
  };

  const media = {};
  await step("served runtime images decode", async () => {
    const decoded = [];
    for (const path of RUNTIME_IMAGES) {
      const fetched = await fetchStatus(origin + path);
      let image = null;
      let error = "";
      if (fetched.status === 200) {
        try {
          image = await sharp(fetched.buffer, { failOn: "error" }).metadata();
        } catch (cause) {
          error = String(cause.message || cause);
        }
      }
      decoded.push({
        path,
        status: fetched.status,
        bytes: fetched.buffer.length,
        format: image?.format || null,
        width: image?.width || null,
        height: image?.height || null,
        error,
      });
    }
    const bad = decoded.filter((item) => item.status !== 200 || item.format !== "webp" || !item.width);
    if (bad.length) throw new Error(JSON.stringify(bad));
    return decoded.map((item) => ({ path: item.path, bytes: item.bytes, width: item.width, height: item.height }));
  });

  const officialPaths = [];
  for (const theme of ["day", "night"]) {
    for (const portrait of args.withoutVideoGreeting ? [] : [false, true]) {
      const suffix = portrait ? "-portrait" : "";
      officialPaths.push(`/media/v2/avatar/greeting-${theme}${suffix}.mp4`);
      officialPaths.push(`/media/v2/avatar/greeting-${theme}${suffix}.webm`);
      officialPaths.push(`/media/v2/avatar/greeting-${theme}${suffix}.webp`);
    }
    officialPaths.push(`/media/v2/avatar/about-${theme}.webp`);
  }
  officialPaths.push("/media/v2/avatar/visitor.glb");
  if (args.withoutVideoGreeting) {
    officialPaths.push("/media/v2/greeting-image/storyboard-v001.webp", "/media/v2/greeting-image/character-v001.webp");
  }
  await step("official media presence", async () => {
    for (const path of officialPaths) {
      const fetched = await fetchStatus(origin + path);
      media[path] = fetched.status;
    }
    const missing = Object.entries(media).filter(([, status]) => status !== 200).map(([path, status]) => ({ path, status }));
    return missing.length ? { status: "pending", detail: missing } : { ready: Object.keys(media) };
  });

  await step("read-only api", async () => {
    const health = await fetch(origin + "/api/health").then(async (response) => ({ status: response.status, body: await response.text() })).catch((error) => ({ status: 0, body: String(error) }));
    const messages = await fetch(origin + "/api/messages").then(async (response) => ({ status: response.status, body: await response.text() })).catch((error) => ({ status: 0, body: String(error) }));
    const verdict = classifyReadOnlyApi(health, messages);
    apiReachable = !verdict.status;
    apiScene = verdict.scene || verdict.detail?.scene || "";
    return verdict;
  });

  let browser;
  try {
    browser = await launch();
  } catch (error) {
    record("browser launch", "fail", String(error));
    browser = null;
  }

  const shot = async (page, name) => {
    await page.screenshot({ path: destination + "/" + name, animations: "disabled" });
    return name;
  };
  const watch = (page) => {
    page.on("pageerror", (error) => pageErrors.push({ scenario, url: page.url(), error: String(error) }));
    page.on("response", (response) => {
      if (response.status() < 400) return;
      http.push({ scenario, status: response.status(), url: response.url() });
    });
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/") && request.method() !== "GET" && request.method() !== "HEAD") {
        writes.push({ scenario, method: request.method(), url });
      }
    });
  };
  const guardWrites = async (context) => {
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.method() === "GET" || request.method() === "HEAD") {
        await route.continue();
        return;
      }
      writes.push({ scenario, method: request.method(), url: request.url(), blocked: true });
      await route.abort();
    });
  };
  const open = async (viewport, options = {}) => {
    const context = await browser.newContext({ viewport, ...options });
    await context.addInitScript(hideDevBadge);
    await guardWrites(context);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    watch(page);
    return { context, page };
  };
  const overflow = async (page) => page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const assertFit = async (page, label) => {
    const size = await overflow(page);
    if (size.scrollWidth > size.clientWidth + 1) throw new Error(label + " " + JSON.stringify(size));
    return size;
  };
  const readAvatar = (page) => page.locator("[data-avatar-view]").evaluate((node) => ({
    view: node.getAttribute("data-avatar-view"),
    ready: node.getAttribute("data-avatar-ready"),
    loaded: node.getAttribute("data-avatar-loaded"),
    morphs: node.getAttribute("data-avatar-morphs"),
    bones: node.getAttribute("data-avatar-bones"),
    mode: node.getAttribute("data-avatar-mode"),
    model: node.getAttribute("data-avatar-model"),
    canvas: Boolean(node.querySelector("canvas")),
  }));
  const waitForAvatar = (page) => page.waitForFunction(() => {
    if (document.documentElement.dataset.clientReady !== "true") return false;
    const node = document.querySelector("[data-avatar-view]");
    if (!node) return false;
    if (node.getAttribute("data-avatar-ready") === "true") return true;
    const view = node.getAttribute("data-avatar-view");
    return !node.querySelector("canvas") && view !== "loading";
  }, undefined, { timeout: 40000 });
  if (browser) {
    const readiness = await readinessSelfTest(browser);
    selfTest.push(...readiness);
    for (const item of readiness) console.log(item.status.toUpperCase(), "fixture", item.name);
    scenario = "real";
    const desktop = await open({ width: 1440, height: 1000 });
    const page = desktop.page;
    try {
      await step("welcome has no canvas and centers CONNECT", async () => {
        const greetingRequests = [];
        const onRequest = (request) => {
          if (request.url().includes("/media/v2/avatar/greeting-")) greetingRequests.push(request.url());
        };
        page.on("request", onRequest);
        await openPage(page, origin + "/");
        await setTheme(page, "night");
        await waitForSky(page, "night");
        const box = await page.getByRole("button", { name: "CONNECT", exact: true }).boundingBox();
        const center = box.x + box.width / 2;
        const canvas = await page.locator("canvas").count();
        const sky = await page.locator("[data-gate-sky] img").evaluate((img) => ({ src: img.currentSrc || img.src, width: img.naturalWidth }));
        await shot(page, "welcome-night-1440.png");
        page.off("request", onRequest);
        if (canvas !== 0) throw new Error("canvas " + canvas);
        if (Math.abs(center - 720) > 8) throw new Error("CONNECT center " + center);
        if (!sky.src.includes("/media/v2/environment/night.webp") || sky.width < 64) throw new Error(JSON.stringify(sky));
        if (greetingRequests.length) throw new Error("greeting requested before CONNECT " + greetingRequests.join(","));
        return { center, sky };
      });

      await step("welcome day plate", async () => {
        await setTheme(page, "day");
        await waitForSky(page, "day");
        const sky = await page.locator("[data-gate-sky] img").evaluate((img) => ({ src: img.currentSrc || img.src, width: img.naturalWidth }));
        await shot(page, "welcome-day-1440.png");
        return sky;
      });

      await step("hub night islands load, keyboard, and four themes", async () => {
        await openPage(page, origin + "/hub/");
        await setTheme(page, "night");
        await waitForIslands(page, "night");
        await waitForBackground(page, "night");
        const sources = await page.locator("[data-island]").evaluateAll((nodes) => nodes.map((node) => ({
          id: node.getAttribute("data-island"),
          art: node.getAttribute("data-art"),
          width: node.querySelector("img[data-subject]")?.naturalWidth || 0,
        })));
        if (sources.length !== 4 || sources.some((item) => !item.art?.includes("-night.webp") || item.width < 64)) throw new Error(JSON.stringify(sources));
        const layers = await page.locator("[data-dynamic-background] img").evaluateAll((nodes) => nodes.map((node) => ({ src: node.currentSrc || node.getAttribute("src"), width: node.naturalWidth, ready: node.dataset.ready || "" })));
        if (layers.length < 3 || layers.some((item) => item.width < 1 || item.ready !== "true" || !String(item.src).includes("night"))) throw new Error("hub background source does not match theme " + JSON.stringify(layers));
        await page.getByRole("button", { name: "聚焦Her", exact: true }).focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.querySelector("[data-focused-island]")?.getAttribute("data-focused-island") === "ancient");
        await page.keyboard.press("ArrowLeft");
        await page.waitForFunction(() => document.querySelector("[data-focused-island]")?.getAttribute("data-focused-island") === "sky");
        await shot(page, "hub-night-1440.png");
        const entered = [];
        for (const id of Object.keys(THEMES)) {
          await openPage(page, origin + "/hub/");
          await waitForIslands(page, "night");
          await page.locator(`[data-island="${id}"]`).click();
          await page.waitForURL(new RegExp("/works/themes/" + id + "/?"));
          await waitForClient(page);
          const title = await page.locator("h1").innerText();
          if (title !== THEMES[id]) throw new Error(id + " title " + title);
          entered.push({ id, url: page.url(), title });
        }
        return { sources, entered };
      });

      await step("hub day islands", async () => {
        await openPage(page, origin + "/hub/");
        await setTheme(page, "day");
        await waitForIslands(page, "day");
        await waitForBackground(page, "day");
        const art = await page.locator("[data-island='home']").getAttribute("data-art");
        await shot(page, "hub-day-1440.png");
        if (!art?.includes("home-day.webp")) throw new Error(art || "missing art");
        return { art };
      });

      await step("gallery filter, real url, back and forward, contain", async () => {
        await openPage(page, origin + "/works/");
        await setTheme(page, "night");
        await page.getByRole("button", { name: "COS", exact: true }).click();
        await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true" && document.querySelector("[data-gallery='works']")?.getAttribute("data-filter") === "home");
        await waitForGalleryReady(page, "/media/v2/islands/home-night.webp");
        const filtered = await page.locator("article[data-crop]").count();
        if (filtered !== 3) throw new Error("filtered cards " + filtered);
        await shot(page, "works-filter-1440.png");
        await page.locator("article[data-crop] a").first().click();
        await page.waitForURL(/\/works\/anime-home\/?/);
        await waitForClient(page);
        await waitForOneImage(page, "[role='dialog'] img", "/media/v2/islands/home-night.webp");
        const dialog = page.locator("[role='dialog'] img");
        const shown = await dialog.evaluate((img) => ({
          src: img.currentSrc || img.src,
          width: img.naturalWidth,
          fit: getComputedStyle(img).objectFit,
        }));
        await shot(page, "works-dialog-1440.png");
        if (shown.fit !== "contain" || shown.width < 64 || !shown.src.includes("/media/v2/islands/home-night.webp")) throw new Error(JSON.stringify(shown));
        await page.goBack();
        await waitForClient(page);
        await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true" && !document.querySelector("[role='dialog']") && /\/works\/?$/.test(location.pathname));
        await waitForGalleryReady(page, "");
        await page.goForward();
        await waitForClient(page);
        await page.waitForURL(/\/works\/anime-home\/?/);
        await waitForOneImage(page, "[role='dialog'] img", "/media/v2/islands/home-night.webp");
        const forwarded = await page.locator("[role='dialog'] img").evaluate((img) => ({ src: img.currentSrc || img.src, width: img.naturalWidth }));
        if (forwarded.width < 1 || !forwarded.src.includes("/media/v2/islands/home-night.webp")) throw new Error("forwarded dialog source " + JSON.stringify(forwarded));
        await openPage(page, origin + "/works/sky-city/");
        const themeNow = await page.evaluate(() => document.documentElement.dataset.theme || "night");
        await waitForOneImage(page, "[data-gallery='detail'] img", "/media/v2/islands/sky-" + themeNow + ".webp");
        const detail = await page.locator("[data-gallery='detail'] img").evaluate((img) => ({
          src: img.currentSrc || img.src,
          width: img.naturalWidth,
          fit: getComputedStyle(img).objectFit,
        }));
        await shot(page, "works-detail-1440.png");
        if (detail.fit !== "contain" || detail.width < 64 || !detail.src.includes("/media/v2/islands/sky-")) throw new Error(JSON.stringify(detail));
        return { filtered, shown, detail, forward: page.url() };
      });

      await step("about paper and theme do not reload the model", async () => {
        const glbRequests = [];
        const onRequest = (request) => {
          if (request.url().includes("/media/v2/avatar/visitor.glb")) glbRequests.push(request.url());
          if (request.url().includes("avatar-proxy")) glbRequests.push("proxy:" + request.url());
        };
        page.on("request", onRequest);
        await openPage(page, origin + "/about/");
        await setTheme(page, "night");
        await page.getByRole("button", { name: "纸页阅读", exact: true }).click();
        await page.waitForFunction(() => document.querySelector("article")?.getAttribute("data-paper") === "on");
        await shot(page, "about-paper-1440.png");
        await page.getByRole("button", { name: "退出纸页", exact: true }).click();
        await page.waitForFunction(() => document.querySelector("article")?.getAttribute("data-paper") !== "on");
        await waitForAvatar(page);
        const before = glbRequests.length;
        await setTheme(page, "day");
        await shot(page, "about-day-1440.png");
        await setTheme(page, "night");
        const after = await page.locator("[data-avatar-view]").evaluate((node) => ({
          view: node.getAttribute("data-avatar-view"),
          ready: node.getAttribute("data-avatar-ready"),
          loaded: node.getAttribute("data-avatar-loaded"),
          morphs: node.getAttribute("data-avatar-morphs"),
          bones: node.getAttribute("data-avatar-bones"),
          model: node.getAttribute("data-avatar-model"),
          theme: node.getAttribute("data-avatar-theme"),
        }));
        await shot(page, "about-night-1440.png");
        page.off("request", onRequest);
        if (glbRequests.some((item) => item.startsWith("proxy:"))) throw new Error(glbRequests.join(","));
        if (after.model !== "/media/v2/avatar/visitor.glb") throw new Error(after.model || "missing model attribute");
        if (glbRequests.length !== before) throw new Error("theme reload " + before + " -> " + glbRequests.length);
        return { after, requests: glbRequests.length };
      });
      await step("about real model ready", async () => {
        if (media["/media/v2/avatar/visitor.glb"] !== 200) {
          return { status: "pending", detail: { file: "/media/v2/avatar/visitor.glb", status: media["/media/v2/avatar/visitor.glb"] ?? null } };
        }
        await waitForAvatar(page);
        const after = await readAvatar(page);
        if (after.ready !== "true" || !String(after.morphs).includes("blink:ok") || !String(after.morphs).includes("smile:ok") || Number(after.bones) < 4) {
          throw new Error(JSON.stringify(after));
        }
        return after;
      });

      await step("story keeps real blanks", async () => {
        await openPage(page, origin + "/story/");
        const blanks = await page.getByText("先留白").count();
        const missingFrames = await page.getByText("这张图还没有放进来").count();
        const islandImages = await page.locator("img[src*='/media/v2/islands/']").count();
        const chapters = await page.locator("#signal, #ascent, #arrival").count();
        await shot(page, "story-1440.png");
        if (blanks < 3 || missingFrames < 3 || islandImages !== 0 || chapters !== 3) {
          throw new Error(JSON.stringify({ blanks, missingFrames, islandImages, chapters }));
        }
        return { blanks, missingFrames, chapters };
      });

      await step("board reads and does not post", async () => {
        const before = writes.length;
        await openPage(page, origin + "/board/");
        await page.getByRole("heading", { name: "留言", exact: true }).waitFor();
        await page.locator("#board-message").waitFor();
        await page.waitForFunction(() => {
          const state = document.querySelector("[data-messages]")?.getAttribute("data-messages");
          return state && state !== "loading";
        });
        const state = await page.locator("[data-messages]").first().getAttribute("data-messages");
        const contact = await page.getByText("还没有提供").count();
        await shot(page, "board-1440.png");
        if (writes.length !== before) throw new Error("write attempted " + JSON.stringify(writes.slice(before)));
        if (contact < 2) throw new Error("contact blanks " + contact);
        if (apiReachable && state === "error") throw new Error("api is readable but the board shows an error");
        return { state, contact, apiReachable };
      });

      await step("not found page", async () => {
        await openPage(page, origin + "/no-such-p4-12/");
        await page.getByRole("heading", { name: "这一页不存在" }).waitFor();
        const hub = await page.getByRole("link", { name: "回到四座岛" }).getAttribute("href");
        await shot(page, "not-found-1440.png");
        if (hub !== "/hub/") throw new Error(hub || "missing link");
        return { href: hub };
      });

      await step("desktop width stays inside the viewport", async () => {
        const paths = ["/", "/hub/", "/works/", "/about/", "/story/", "/board/", "/no-such-p4-12/"];
        const sizes = [];
        for (const path of paths) {
          await openPage(page, origin + path);
          await page.locator("h1").first().waitFor();
          sizes.push({ path, ...(await assertFit(page, path)) });
        }
        return sizes;
      });
    } finally {
      await desktop.context.close();
    }

    for (const width of [390, 320]) {
      scenario = "width-" + width;
      const narrow = await open({ width, height: 844 });
      try {
        await step("CONNECT stays centered at " + width, async () => {
          await openPage(narrow.page, origin + "/");
          const box = await narrow.page.getByRole("button", { name: "CONNECT", exact: true }).boundingBox();
          const center = box.x + box.width / 2;
          await shot(narrow.page, "welcome-" + width + ".png");
          await assertFit(narrow.page, "welcome " + width);
          if (Math.abs(center - width / 2) > 8) throw new Error("center " + center);
          return { center };
        });
        if (width === 390) {
          await step("mobile hub needs two taps", async () => {
            await openPage(narrow.page, origin + "/hub/");
            await waitForIslands(narrow.page, "night");
            await narrow.page.locator("[data-island='sky']").click();
            await narrow.page.waitForFunction(() => document.querySelector("[data-touch-armed]")?.getAttribute("data-touch-armed") === "sky");
            if (!narrow.page.url().includes("/hub")) throw new Error("first tap left hub " + narrow.page.url());
            await shot(narrow.page, "hub-390-armed.png");
            await narrow.page.locator("[data-island='sky']").click();
            await narrow.page.waitForURL(/\/works\/themes\/sky\/?/);
            return { url: narrow.page.url() };
          });
        }
        await step("narrow pages fit " + width, async () => {
          const paths = ["/hub/", "/works/", "/about/", "/story/", "/board/", "/works/sky-city/", "/no-such-p4-12/"];
          const sizes = [];
          for (const path of paths) {
            await openPage(narrow.page, origin + path);
            await narrow.page.locator("h1").first().waitFor();
            sizes.push({ path, ...(await assertFit(narrow.page, path + " " + width)) });
          }
          await shot(narrow.page, "not-found-" + width + ".png");
          return sizes;
        });
      } finally {
        await narrow.context.close();
      }
    }

    if (!args.withoutVideoGreeting) {
    scenario = "real-media";
    const variants = [
      { theme: "night", portrait: false, name: "night landscape" },
      { theme: "day", portrait: false, name: "day landscape" },
      { theme: "night", portrait: true, name: "night portrait" },
      { theme: "day", portrait: true, name: "day portrait" },
    ];
    for (const variant of variants) {
      const paths = greetingPaths(variant.theme, variant.portrait);
      const label = "greeting " + variant.name + " selects, ends, and does not replay";
      if (media[paths.mp4] !== 200) {
        record(label, "pending", { file: paths.mp4, webm: media[paths.webm] ?? null, poster: media[paths.poster] ?? null, status: media[paths.mp4] ?? null });
        continue;
      }
      const viewport = variant.portrait ? { width: 390, height: 844 } : { width: 1440, height: 900 };
      const played = await open(viewport, { screen: viewport });
      try {
        await step(label, async () => {
          await openPage(played.page, origin + "/");
          await setTheme(played.page, variant.theme);
          await waitForSky(played.page, variant.theme);
          await armGreetingCounter(played.page);
          await played.page.getByRole("button", { name: "CONNECT", exact: true }).click();
          await waitForGreetingSelection(played.page, paths);
          await played.page.waitForURL(/\/hub\/?/, { timeout: 20000 });
          await waitForClient(played.page);
          const reason = await played.page.evaluate(() => sessionStorage.getItem("syyh-greeting-reason"));
          const counter = await readGreetingCounter(played.page);
          if (reason !== "ended" || !counter || counter.ended !== 1 || counter.playsAfterEnd !== 0 || counter.plays < 1 || playedWrongSource(counter, paths)) {
            throw new Error(greetingFinishError(reason, counter, paths));
          }
          return { reason, counter, video: paths.mp4, webm: paths.webm };
        });
      } finally {
        await played.context.close();
      }
    }
    const skipPaths = greetingPaths("night", false);
    if (media[skipPaths.mp4] !== 200) {
      record("greeting night landscape skip does not replay", "pending", { file: skipPaths.mp4, status: media[skipPaths.mp4] ?? null });
    } else {
      const skipped = await open({ width: 1440, height: 900 }, { screen: { width: 1440, height: 900 } });
      try {
        await step("greeting night landscape skip does not replay", async () => {
          await openPage(skipped.page, origin + "/");
          await setTheme(skipped.page, "night");
          await waitForSky(skipped.page, "night");
          await armGreetingCounter(skipped.page);
          await skipped.page.getByRole("button", { name: "CONNECT", exact: true }).click();
          await waitForGreetingSelection(skipped.page, skipPaths);
          await skipped.page.getByRole("button", { name: "跳过", exact: true }).click();
          await skipped.page.waitForURL(/\/hub\/?/, { timeout: 20000 });
          await waitForClient(skipped.page);
          const reason = await skipped.page.evaluate(() => sessionStorage.getItem("syyh-greeting-reason"));
          const counter = await readGreetingCounter(skipped.page);
          if (reason !== "skip" || !counter || counter.ended !== 0 || counter.playsAfterEnd !== 0 || playedWrongSource(counter, skipPaths)) {
            throw new Error(greetingFinishError(reason, counter, skipPaths));
          }
          return { reason, counter, video: skipPaths.mp4 };
        });
      } finally {
        await skipped.context.close();
      }
    }
    const nightPoster = "/media/v2/avatar/greeting-night.webp";
    if (media[nightPoster] !== 200) {
      record("reduced motion uses the real poster", "pending", { file: nightPoster, status: media[nightPoster] ?? null });
    } else {
      const reducedPaths = greetingPaths("night", false);
      const reduced = await open({ width: 1440, height: 900 }, { reducedMotion: "reduce", screen: { width: 1440, height: 900 } });
      try {
        await step("reduced motion uses the real poster", async () => {
          await openPage(reduced.page, origin + "/");
          await setTheme(reduced.page, "night");
          await waitForSky(reduced.page, "night");
          await armGreetingCounter(reduced.page);
          await reduced.page.getByRole("button", { name: "CONNECT", exact: true }).click();
          const observed = await reduced.page.waitForFunction((posterPath) => {
            if (document.documentElement.dataset.clientReady !== "true") return false;
            const node = document.querySelector("[data-greeting]");
            const img = node?.querySelector("img");
            const src = img ? (img.currentSrc || img.getAttribute("src") || "") : "";
            if (img && img.naturalWidth > 0 && src.includes(posterPath)) {
              return {
                mark: "decoded",
                src,
                width: img.naturalWidth,
                videoCount: node.querySelectorAll("video").length,
                portrait: node.getAttribute("data-greeting-portrait") || "",
                video: node.getAttribute("data-greeting-video") || "",
              };
            }
            if (/\/hub\/?$/.test(location.pathname)) return { mark: "left" };
            return false;
          }, nightPoster, { timeout: 8000 }).then((handle) => handle.jsonValue());
          if (observed.mark !== "decoded") {
            throw new Error("greeting poster was not decoded before the page left (loader or slow network) " + JSON.stringify(observed));
          }
          if (observed.videoCount !== 0 || observed.width < 1 || !observed.src.includes(nightPoster) || observed.portrait !== "false" || !observed.video.includes(reducedPaths.mp4)) {
            throw new Error("greeting source mismatch " + JSON.stringify(observed));
          }
          await reduced.page.waitForURL(/\/hub\/?/, { timeout: 10000 });
          await waitForClient(reduced.page);
          const reason = await reduced.page.evaluate(() => sessionStorage.getItem("syyh-greeting-reason"));
          const counter = await readGreetingCounter(reduced.page);
          if (reason !== "reduced" || !counter || counter.plays !== 0 || counter.ended !== 0 || counter.playsAfterEnd !== 0) {
            const why = reason === "timeout" ? "page gave up before finish (slow start or loader)" : "greeting reason " + reason;
            throw new Error(why + " " + JSON.stringify({ reason, counter, observed }));
          }
          return { poster: { src: observed.src, width: observed.width }, reason, counter };
        });
      } finally {
        await reduced.context.close();
      }
    }

    }
    scenario = "coarse";
    if (media["/media/v2/avatar/visitor.glb"] !== 200) {
      record("about coarse pointer keeps the loaded model", "pending", { file: "/media/v2/avatar/visitor.glb" });
    } else {
      const coarse = await open(devices["Pixel 5"].viewport, devices["Pixel 5"]);
      try {
        await step("about coarse pointer keeps the loaded model", async () => {
          await openPage(coarse.page, origin + "/about/");
          await waitForAvatar(coarse.page);
          const state = await readAvatar(coarse.page);
          state.coarse = await coarse.page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
          await shot(coarse.page, "about-coarse.png");
          if (!state.coarse) return { status: "pending", detail: { ...state, note: "browser did not emulate a coarse pointer" } };
          if (state.mode !== "coarse" || state.ready !== "true" || !String(state.morphs).includes("blink:ok") || !String(state.morphs).includes("smile:ok")) {
            throw new Error(JSON.stringify(state));
          }
          return state;
        });
      } finally {
        await coarse.context.close();
      }
    }

    scenario = "fault-intercept";
    const fault = await open({ width: 1280, height: 800 });
    try {
      await fault.context.route("**/media/v2/avatar/**", (route) => {
        route.fulfill({ status: 404, contentType: "text/plain", body: "fault-intercept" });
      });
      await step("fault intercept degrades about without a substitute image", async () => {
        await openPage(fault.page, origin + "/about/");
        await fault.page.waitForFunction(() => document.documentElement.dataset.clientReady === "true" && document.querySelector("[data-avatar-view]")?.getAttribute("data-avatar-view") === "empty");
        const state = await fault.page.locator("[data-avatar-view]").evaluate((node) => ({
          view: node.getAttribute("data-avatar-view"),
          ready: node.getAttribute("data-avatar-ready"),
          label: node.getAttribute("aria-label"),
        }));
        const substitute = await fault.page.locator("img[src*='/media/v2/islands/']").count();
        if (state.ready !== "false" || substitute !== 0) throw new Error(JSON.stringify({ state, substitute }));
        return state;
      });
      if (!args.withoutVideoGreeting) await step("fault intercept does not treat a blocked film as ended", async () => {
        await openPage(fault.page, origin + "/");
        await setTheme(fault.page, "night");
        await fault.page.getByRole("button", { name: "CONNECT", exact: true }).click();
        await fault.page.waitForURL(/\/hub\/?/, { timeout: 20000 });
        const reason = await fault.page.evaluate(() => sessionStorage.getItem("syyh-greeting-reason"));
        if (reason === "ended" || reason === "skip") throw new Error(reason || "missing reason");
        return { reason, scenario: "fault-intercept" };
      });
    } finally {
      await fault.context.close();
    }

    await browser.close();
  }

  scenario = "report";
  await step("no page errors", async () => {
    if (pageErrors.length) throw new Error(JSON.stringify(pageErrors));
    return { count: 0 };
  });
  await step("no unexpected http failures", async () => {
    const pendingMedia = new Set(Object.entries(media).filter(([, status]) => status !== 200).map(([path]) => path));
    const unexpected = [];
    const noted = [];
    for (const item of http) {
      const path = new URL(item.url).pathname;
      if (path.includes("no-such-p4-12")) noted.push({ ...item, note: "expected missing route" });
      else if (path.startsWith("/api/")) noted.push({ ...item, note: apiScene === "api-read" ? "api response during read-only navigation" : "api verdict is the read-only api check; no write was sent" });
      else if (pendingMedia.has(path) || path.startsWith("/media/v2/avatar/")) noted.push({ ...item, note: "official media pending or fault intercept" });
      else if (path === "/favicon.ico" || path.includes("webpack-hmr") || path.includes("__nextjs")) noted.push({ ...item, note: "not a page asset" });
      else unexpected.push(item);
    }
    if (unexpected.length) throw new Error(JSON.stringify(unexpected));
    return { noted };
  });
  await step("api writes stayed at zero", async () => {
    if (writes.length) throw new Error(JSON.stringify(writes));
    return { writes: 0 };
  });

  const summary = { pass: 0, fail: 0, pending: 0, noted: 0 };
  for (const item of checks) summary[item.status] = (summary[item.status] || 0) + 1;
  const fixtureFailed = selfTest.some((item) => item.status === "fail");
  let exitCode = 0;
  if (summary.fail > 0 || fixtureFailed) exitCode = 1;
  else if (summary.pending > 0 && !args.allowPending) exitCode = 2;
  const report = {
    tool: "check-v2-site",
    generatedAt: new Date().toISOString(),
    origin,
    allowPending: args.allowPending,
    greetingScope: args.withoutVideoGreeting ? "Historical video scenarios excluded; current image sequence and failures verified separately by P5-06-lead scripts." : "Legacy video greeting scenarios included",
    summary,
    selfTest: { kind: "fixture", status: fixtureFailed ? "fail" : "pass", checks: selfTest },
    acceptance: exitCode === 0 ? (args.allowPending && summary.pending ? "engineering-allow-pending" : "pass") : exitCode === 2 ? "pending" : "fail",
    checks,
    pageErrors,
    writes,
  };
  await writeFile(destination + "/checks.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ acceptance: report.acceptance, summary, exitCode }));
  process.exitCode = exitCode;
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
