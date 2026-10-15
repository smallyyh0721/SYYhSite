import type { Theme, WorkThemeId } from "./contracts";

// Frozen public paths for the approved second-version artwork.
export const islandArt = (id: WorkThemeId, theme: Theme) => `/media/v2/islands/${id}-${theme}.webp`;
export const environmentArt = (theme: Theme, portrait = false) => `/media/v2/environment/${theme}${portrait ? "-portrait" : ""}.webp`;
export const cloudArt = (theme: Theme, depth: "near" | "far") => `/media/v2/environment/cloud-${depth}-${theme}.webp`;
// Approved raster artwork, animated in the welcome greeting without a 3D render.
export const greetingImageArt = {
  sheet: "/media/v2/greeting-image/storyboard-v001.webp",
  fallback: "/media/v2/greeting-image/character-v001.webp",
  columns: 3,
  rows: 2,
};
export const avatarArt = {
  model: "/media/v2/avatar/visitor.glb",
  poster: (theme: Theme) => `/media/v2/avatar/about-${theme}.webp`,
  greeting: (theme: Theme, portrait = false) => `/media/v2/avatar/greeting-${theme}${portrait ? "-portrait" : ""}.mp4`,
  greetingWebM: (theme: Theme, portrait = false) => `/media/v2/avatar/greeting-${theme}${portrait ? "-portrait" : ""}.webm`,
  greetingPoster: (theme: Theme, portrait = false) => `/media/v2/avatar/greeting-${theme}${portrait ? "-portrait" : ""}.webp`,
};
