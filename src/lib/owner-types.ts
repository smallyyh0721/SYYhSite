import type { WorkThemeId } from "./contracts";
export type DraftMedia = { assetId: string; alt: string; caption: string };
export type WorkDraft = {
  slug: string; themeId: WorkThemeId; title: string; subtitle: string; category: string;
  description: string; sortOrder: number; coverAssetId: string | null;
  media: DraftMedia[]; processMedia: DraftMedia[];
};
export type OwnerWork = { id: string | number; slug: string; revision: number; publishedRevision: number | null; status: "draft" | "published"; draft: WorkDraft; updatedAt: string };
export type OwnerAsset = { id: string; status: "queued" | "processing" | "ready" | "error"; filename: string; kind?: "image" | "video"; error?: string; src?: string; poster?: string; bytes: number; createdAt: string };
export type OwnerSession = { authenticated: boolean; csrfToken?: string; expiresAt?: string | number };
