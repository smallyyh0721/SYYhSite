import type { Theme, WorkThemeId } from "./contracts";

// Frozen public paths for the approved second-version artwork.
export const islandArt = (id: WorkThemeId, theme: Theme) => `/media/v2/islands/${id}-${theme}.webp`;
export const environmentArt = (theme: Theme, portrait = false) => `/media/v2/environment/${theme}${portrait ? "-portrait" : ""}.webp`;
export const cloudArt = (theme: Theme, depth: "near" | "far") => `/media/v2/environment/cloud-${depth}-${theme}.webp`;
export const avatarArt = {
  model: "/media/v2/avatar/visitor.glb",
  poster: (theme: Theme) => `/media/v2/avatar/about-${theme}.webp`,
};
