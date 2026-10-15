"use client";
import type { WorkThemeId } from "@/lib/contracts";
import Gallery from "./Gallery";

export default function ThemeWorks({ themeId }: { themeId: WorkThemeId }) {
  return <Gallery initialThemeId={themeId} />;
}
