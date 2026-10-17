import { works, workThemes, type Work, type WorkThemeId } from "@/lib/contracts";

export type FilterId = "all" | WorkThemeId;

export function formalTheme(id: WorkThemeId) {
  const theme = workThemes.find((item) => item.id === id);
  return {
    label: theme?.name ?? id,
    usage: theme?.description ?? "",
  };
}

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "全部" },
  ...workThemes.map((item) => ({ id: item.id, label: item.name })),
];

export type GalleryItem = {
  id: string;
  work: Work;
  themeId: WorkThemeId;
  label: string;
};

/**
 * Work covers are the prepared files on `work.image`.
 * Island day/night art stays on the world navigation and is not a work image.
 */
export function workArt(work: Work): string {
  return work.image;
}

export function coverFrame(work: Work) {
  return work.media.find((item) => item.src === work.image) ?? null;
}

export function coverAlt(work: Work) {
  return coverFrame(work)?.alt?.trim() || `${work.title} 封面`;
}

export function coverCaption(work: Work) {
  return coverFrame(work)?.caption?.trim() || work.title;
}

export function workHref(slug: string) {
  return `/works/${slug}/`;
}

export function galleryItems(collection: Work[] = works): GalleryItem[] {
  return collection.map((work) => ({
    id: work.slug,
    work,
    themeId: work.themeId,
    label: work.title,
  }));
}

export function visibleItems(filter: FilterId, items = galleryItems()) {
  if (filter === "all") return items;
  return items.filter((item) => item.themeId === filter);
}

export function featuredWork(filter: FilterId, collection: Work[] = works) {
  if (filter === "all") return collection[0] ?? null;
  return collection.find((work) => work.themeId === filter) ?? null;
}

export function themeRecord(id: WorkThemeId) {
  return workThemes.find((item) => item.id === id);
}

export function isFilterId(value: string): value is FilterId {
  return value === "all" || workThemes.some((item) => item.id === value);
}

export const sortLabel = "精选";
export const processHeading = "过程材料";

type ModifierState = {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
};

type ActivationTarget = {
  closest?: (selector: string) => unknown;
  parentElement?: ActivationTarget | null;
};

export function plainActivation(event: ModifierState) {
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (event.button == null || event.button === 0);
}

export function eventFromChildButton(target: EventTarget | ActivationTarget | null | undefined) {
  let node: EventTarget | ActivationTarget | null | undefined = target;
  const seen = new Set<object>();
  while (node && typeof node === "object") {
    if (seen.has(node)) return false;
    seen.add(node);
    if ("closest" in node && typeof node.closest === "function") {
      return Boolean(node.closest("button"));
    }
    node = "parentElement" in node ? node.parentElement : null;
  }
  return false;
}

export function shouldOpenFromKey(event: ModifierState & { key?: string; target?: EventTarget | ActivationTarget | null }) {
  if (event.key !== "Enter" && event.key !== " ") return false;
  if (eventFromChildButton(event.target)) return false;
  return plainActivation(event);
}

export function shouldOpenFromClick(event: ModifierState & { target?: EventTarget | ActivationTarget | null }) {
  if (eventFromChildButton(event.target)) return false;
  return plainActivation(event);
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Markup for a `<noscript>` image. Uses the original src and contains no script. */
export function noscriptImageMarkup(src: string, alt: string) {
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" decoding="async" />`;
}

export function isStillStoryboard(work: Work) {
  return !work.media.some(item => item.kind === "video") && /静帧|分镜/.test(`${work.category}\n${work.subtitle}\n${work.description}`);
}

export function mediaHeading(work: Work) {
  return isStillStoryboard(work) ? "静帧分镜" : work.media.some(item => item.kind === "video") ? "作品影像" : "作品图片";
}

export function stillNote(work: Work) {
  if (!isStillStoryboard(work)) return null;
  if (work.media.length === 10) return "本作展示十镜静帧与镜头方案，成片尚未完成。";
  return "本作展示静帧与镜头方案，成片尚未完成。";
}

export function processNote(work: Work) {
  if (!work.processMedia?.length) return null;
  return "这些是过程材料，用来对照画面，不是另一件作品。";
}

export function listIntro(filter: FilterId, collection: Work[] = works) {
  if (filter === "all") {
    return "人物、场景与还在延伸的想象";
  }
  const theme = formalTheme(filter);
  const count = collection.filter((work) => work.themeId === filter).length;
  if (count === 0) return `${theme.usage}。`;
  return `${theme.usage}。这个分类有 ${count} 件作品。`;
}

export function emptyCopy(filter: FilterId) {
  if (filter === "all") return "还没有可展示的作品。";
  return `${formalTheme(filter).label} 还没有作品。`;
}
