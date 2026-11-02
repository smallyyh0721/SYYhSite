import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

test("home opens with a CONNECT animation instead of the welcome gate", () => {
  assert.equal(existsSync(path.join(root, "src/features/gate")), false);
  const home = read("app/page.tsx");
  const opening = read("src/features/world/Opening.tsx");
  assert.equal(home.includes("Gate"), false);
  assert.equal(home.includes("Greeting"), false);
  assert.match(home, /Opening/);
  assert.match(opening, /CONNECT/);
  assert.equal(opening.includes("<button"), false);
  assert.match(opening, /<World/);
});

test("works are grouped by series with the picture on the page", () => {
  const gallery = read("src/features/content/Gallery.tsx");
  const css = read("src/features/content/Gallery.module.css");
  assert.match(gallery, /seriesList/);
  assert.match(gallery, /group\.label/);
  assert.match(css, /\.seriesList/);
  assert.equal(gallery.includes("item.work.subtitle"), false);
  assert.equal(gallery.includes("item.work.category"), false);
  assert.equal(gallery.includes("FILTERS"), false);
  assert.match(gallery, /\{item\.work\.title\}/);
  assert.match(read("src/features/content/GalleryMedia.tsx"), /<img/);
});

test("islands use mythic names and the board page is gone", () => {
  const contracts = read("src/lib/contracts.ts");
  assert.match(contracts, /name: "蓬莱"/);
  assert.match(contracts, /name: "瀛洲"/);
  assert.match(contracts, /name: "方壶"/);
  assert.match(contracts, /name: "岱舆"/);
  assert.equal(contracts.includes('id: "sky"'), true);
  assert.equal(read("src/components/Shell.tsx").includes("留言"), false);
  assert.equal(existsSync(path.join(root, "app/board/page.tsx")), false);
  assert.match(read("src/lib/fonts.ts"), /lxgw-wenkai/);
});

test("island labels are a single name", () => {
  const world = read("src/features/world/World.tsx");
  assert.equal(world.includes("selectedTheme"), false);
  assert.equal(world.includes("description"), false);
  assert.match(world, /\{selected\.name\}/);
  assert.match(world, /\{island\.name\}/);
});

test("story is the single line and about remains", () => {
  const story = read("src/features/content/Story.tsx");
  assert.equal(story.includes("这是一个地球online的故事"), true);
  assert.equal(story.includes("Luqing"), false);
  assert.equal(story.includes("story-content"), false);
  assert.equal(existsSync(path.join(root, "src/lib/story-content.ts")), false);
  const about = read("app/about/page.tsx");
  assert.match(about, /About/);
  assert.match(read("src/features/content/About.tsx"), /I人，有点意思但不多。/);
});
