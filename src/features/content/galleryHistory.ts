import type { FilterId } from "./galleryModel";

export const STORAGE_KEY = "syyh-works";

export type GallerySnapshot = {
  path: string;
  scroll: number;
  href?: string;
  index?: number;
  filter: FilterId;
  itemId?: string;
};

export type OverlayHistory = {
  v: 1;
  open: boolean;
  filter: FilterId;
  listPath: string;
  itemId?: string;
  slug?: string;
};

export function normalizePath(path: string) {
  if (!path) return "/works/";
  return path.endsWith("/") ? path : `${path}/`;
}

export function listPathFrom(pathname: string) {
  const path = normalizePath(pathname);
  if (path.startsWith("/works/themes/")) return path;
  return "/works/";
}

export function readSnapshot(): GallerySnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GallerySnapshot;
    if (!data || typeof data !== "object" || typeof data.path !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSnapshot(snapshot: GallerySnapshot) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode */
  }
}

export function overlayFromState(state: unknown): OverlayHistory | null {
  if (!state || typeof state !== "object") return null;
  const overlay = (state as { syyhGallery?: OverlayHistory }).syyhGallery;
  if (!overlay || overlay.v !== 1) return null;
  return overlay;
}

function historyState(overlay: OverlayHistory) {
  return {
    ...(window.history.state && typeof window.history.state === "object" ? window.history.state : {}),
    syyhGallery: overlay,
  };
}

export function replaceHistory(url: string, overlay: OverlayHistory) {
  History.prototype.replaceState.call(window.history, historyState(overlay), "", url);
}

export function pushHistory(url: string, overlay: OverlayHistory) {
  History.prototype.pushState.call(window.history, historyState(overlay), "", url);
}
