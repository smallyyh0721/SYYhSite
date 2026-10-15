import { works, workThemes, type Theme, type Work, type WorkThemeId } from "@/lib/contracts";
import { islandArt } from "@/lib/v2-assets";

export type FilterId = "all" | WorkThemeId;
export type CropKey = "portrait" | "wide" | "square";

export type WorkVisual = Work & { imageNight?: string };

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

export const CROPS: {
  key: CropKey;
  hint: string;
  position: string;
}[] = [
  { key: "portrait", hint: "竖幅裁切", position: "center 28%" },
  { key: "wide", hint: "横幅裁切", position: "center 42%" },
  { key: "square", hint: "方图裁切", position: "center 35%" },
];

export type GalleryItem = {
  id: string;
  work: Work;
  crop: (typeof CROPS)[number];
  themeId: WorkThemeId;
  label: string;
};

export function workArt(work: Work, theme: Theme): string {
  const visual = work as WorkVisual;
  if (theme === "night" && visual.imageNight) return visual.imageNight;
  return islandArt(work.themeId, theme);
}

export function workHref(slug: string) {
  return `/works/${slug}/`;
}

export function galleryItems(): GalleryItem[] {
  return works.flatMap((work) =>
    CROPS.map((crop) => ({
      id: `${work.slug}:${crop.key}`,
      work,
      crop,
      themeId: work.themeId,
      label: formalTheme(work.themeId).label,
    })),
  );
}

export function visibleItems(filter: FilterId, items = galleryItems()) {
  if (filter === "all") return items;
  return items.filter((item) => item.themeId === filter);
}

export function featuredWork(filter: FilterId) {
  if (filter === "all") return works[0] ?? null;
  return works.find((work) => work.themeId === filter) ?? null;
}

export function themeRecord(id: WorkThemeId) {
  return workThemes.find((item) => item.id === id);
}

export function isFilterId(value: string): value is FilterId {
  return value === "all" || workThemes.some((item) => item.id === value);
}

export function layoutCopy(item: GalleryItem) {
  return `${item.label} 的布局占位。同一张概念图的${item.crop.hint}，用来看错落排布，不是另一件作品。`;
}
