import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractsUrl = pathToFileURL(path.join(root, "src/lib/contracts.ts")).href;
const hook = `export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/contracts") {
    return { url: ${JSON.stringify(contractsUrl)}, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(hook)}`);
const contracts = await import(contractsUrl);
const model = await import(pathToFileURL(path.join(root, "src/features/content/galleryModel.ts")).href);

const uiFiles = [
  "src/features/content/Gallery.tsx",
  "src/features/content/galleryModel.ts",
  "src/features/content/WorkDetail.tsx",
  "src/features/content/GalleryMedia.tsx",
  "src/features/content/Gallery.module.css",
];
const banned = ["布局占位", "设计研究", "待补", "热度", "点赞", "观看量", "客户项目", "<video", "social_impact", "/media/v2/islands/"];

test("works contract is the two prepared pieces, in list order", () => {
  assert.deepEqual(
    contracts.works.map((work) => work.slug),
    ["yixuan-football", "mist-exit-ten-shots"],
  );
  const [yixuan, mist] = contracts.works;
  assert.equal(yixuan.themeId, "ancient");
  assert.equal(yixuan.image, "/media/v3/works/yixuan-football/01-cover.webp");
  assert.equal(yixuan.media.length, 8);
  assert.equal(yixuan.processMedia.length, 2);
  assert.equal(mist.themeId, "home");
  assert.equal(mist.image, "/media/v3/works/mist-exit-ten-shots/07-cover.webp");
  assert.equal(mist.media.length, 10);
  assert.equal(mist.processMedia, undefined);
  assert.deepEqual(
    mist.media.map((item) => item.src.split("/").pop()),
    ["01.webp", "02.webp", "03.webp", "04.webp", "05.webp", "06.webp", "07-cover.webp", "08.webp", "09.webp", "10.webp"],
  );
  assert.equal(mist.media[6].caption, "第 07 镜 · 借你一会儿");
});

test("gallery lists one card per work and does not split crops into fake works", () => {
  const items = model.galleryItems();
  assert.equal(items.length, contracts.works.length);
  assert.deepEqual(
    items.map((item) => item.id),
    contracts.works.map((work) => work.slug),
  );
  assert.deepEqual(
    items.map((item) => item.work.slug),
    ["yixuan-football", "mist-exit-ten-shots"],
  );
  assert.ok(items.every((item) => item.label === item.work.title && !("crop" in item)));
  assert.deepEqual(
    model.visibleItems("all").map((item) => item.work.slug),
    ["yixuan-football", "mist-exit-ten-shots"],
  );
  assert.deepEqual(
    model.visibleItems("ancient").map((item) => item.work.slug),
    ["yixuan-football"],
  );
  assert.deepEqual(
    model.visibleItems("home").map((item) => item.work.slug),
    ["mist-exit-ten-shots"],
  );
  assert.equal(model.visibleItems("sky").length, 0);
  assert.equal(model.visibleItems("apocalypse").length, 0);
});

test("covers use prepared work files for both day and night lookups", () => {
  for (const work of contracts.works) {
    assert.equal(model.workArt(work), work.image);
    assert.match(model.workArt(work), /^\/media\/v3\/works\//);
    assert.equal(model.coverAlt(work), work.media.find((item) => item.src === work.image).alt);
  }
  assert.equal(model.featuredWork("all").slug, "yixuan-football");
  assert.equal(model.featuredWork("ancient").slug, "yixuan-football");
  assert.equal(model.featuredWork("home").slug, "mist-exit-ten-shots");
  assert.equal(model.featuredWork("sky"), null);
  assert.equal(model.featuredWork("apocalypse"), null);
});

test("empty themes and source notes stay factual", () => {
  assert.match(model.emptyCopy("sky"), /Her 她的故事/);
  assert.match(model.emptyCopy("sky"), /还没有作品/);
  assert.match(model.emptyCopy("apocalypse"), /FFF 关于未来/);
  assert.match(model.emptyCopy("apocalypse"), /还没有作品/);
  const [yixuan, mist] = contracts.works;
  assert.equal(model.isStillStoryboard(yixuan), false);
  assert.equal(model.stillNote(yixuan), null);
  assert.equal(model.mediaHeading(yixuan), "作品图片");
  assert.equal(model.processHeading, "过程材料");
  assert.equal(model.processNote(yixuan), "这些是过程材料，用来对照画面，不是另一件作品。");
  assert.equal(model.processNote(yixuan).includes("人物设定"), false);
  assert.equal(
    model.processNote({ processMedia: [{ src: "/x.webp", alt: "色稿", caption: "色稿" }] }),
    "这些是过程材料，用来对照画面，不是另一件作品。",
  );
  assert.equal(model.processNote({ processMedia: [] }), null);
  assert.equal(model.processNote({}), null);
  assert.equal(model.isStillStoryboard(mist), true);
  assert.equal(model.mediaHeading(mist), "静帧分镜");
  assert.equal(model.stillNote(mist), "本作展示十镜静帧与镜头方案，成片尚未完成。");
  assert.equal(
    model.stillNote({
      category: "短片静帧",
      subtitle: "分镜",
      description: "方案",
      media: [{}, {}, {}],
    }),
    "本作展示静帧与镜头方案，成片尚未完成。",
  );
  assert.equal(model.processNote(mist), null);
  assert.equal(model.listIntro("all"), "人物、场景与还在延伸的想象");
  assert.equal(model.sortLabel, "精选");
  assert.equal(model.listIntro("all").includes("清单"), false);
  assert.equal(model.listIntro("all").includes("单独成卡"), false);
  for (const filter of ["all", "sky", "ancient", "apocalypse", "home"]) {
    const copy = `${model.listIntro(filter)}\n${model.emptyCopy(filter)}\n${model.sortLabel}\n${model.processHeading}`;
    for (const word of banned) assert.equal(copy.includes(word), false, word);
  }
});

test("prepared derivative files exist and original social_impact paths are not used", () => {
  const srcs = contracts.works.flatMap((work) => [
    work.image,
    ...work.media.map((item) => item.src),
    ...(work.processMedia ?? []).map((item) => item.src),
  ]);
  assert.equal(new Set(srcs).size, 20);
  for (const src of srcs) {
    assert.match(src, /^\/media\/v3\/works\//);
    assert.equal(existsSync(path.join(root, "public", src)), true, src);
  }
});

function activation(overrides = {}) {
  return {
    key: "Enter",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: undefined,
    target: null,
    ...overrides,
  };
}

function buttonTarget() {
  return { closest: (selector) => (selector === "button" ? true : null) };
}

test("modifier keys and child buttons do not count as an in-page open", () => {
  for (const key of ["Enter", " "]) {
    assert.equal(model.shouldOpenFromKey(activation({ key })), true, key);
  }
  for (const key of ["Escape", "ArrowLeft", "ArrowRight", "Tab", "a"]) {
    assert.equal(model.shouldOpenFromKey(activation({ key })), false, key);
  }
  assert.equal(model.plainActivation({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }), true);
  assert.equal(model.plainActivation({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 }), true);
  for (const flag of ["metaKey", "ctrlKey", "shiftKey", "altKey"]) {
    assert.equal(model.shouldOpenFromKey(activation({ [flag]: true })), false, flag);
    assert.equal(model.shouldOpenFromClick(activation({ button: 0, [flag]: true })), false, flag);
    assert.equal(
      model.plainActivation({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, [flag]: true }),
      false,
      flag,
    );
  }
  assert.equal(model.shouldOpenFromKey(activation({ target: buttonTarget() })), false);
  assert.equal(model.shouldOpenFromKey(activation({ key: " ", target: buttonTarget() })), false);
  assert.equal(model.shouldOpenFromKey(activation({ target: { parentElement: buttonTarget() } })), false);
  assert.equal(model.shouldOpenFromKey(activation({ target: { closest: () => null } })), true);
  assert.equal(model.shouldOpenFromClick(activation({ button: 0 })), true);
  assert.equal(model.shouldOpenFromClick(activation({ button: 0, target: buttonTarget() })), false);
  assert.equal(model.shouldOpenFromClick(activation({ button: 1 })), false);
  assert.equal(model.shouldOpenFromClick(activation({ button: 2 })), false);
});

test("noscript image keeps the original src and alt without a script", () => {
  const [yixuan] = contracts.works;
  const cover = model.noscriptImageMarkup(yixuan.image, model.coverAlt(yixuan));
  assert.match(cover, new RegExp(`src="${yixuan.image.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(cover, /alt="/);
  assert.equal(cover.includes(model.coverAlt(yixuan)), true);
  assert.equal(cover.includes("r="), false);
  const hostile = model.noscriptImageMarkup('/media/v3/works/a.webp?q="1"&x=2', '封面 <script>alert(1)</script>');
  assert.match(hostile, /src="\/media\/v3\/works\/a\.webp\?q=&quot;1&quot;&amp;x=2"/);
  assert.match(hostile, /alt="封面 &lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  assert.equal(hostile.toLowerCase().includes("<script"), false);
});

test("visitor copy does not invent placeholder facts", () => {
  const combined = uiFiles.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
  for (const word of banned) assert.equal(combined.includes(word), false, word);
  assert.equal(combined.includes("islandArt"), false);
  assert.equal(combined.includes("清单顺序"), false);
  assert.equal(combined.includes("每件作品单独成卡"), false);
  assert.equal(combined.includes("人物设定参考和系列构图"), false);
  assert.equal(combined.includes("参考与构图"), false);
});
