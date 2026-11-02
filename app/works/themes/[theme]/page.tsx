import { notFound } from "next/navigation";
import Gallery from "@/features/content/Gallery";
import { formalTheme } from "@/features/content/galleryModel";
import { workThemes } from "@/lib/contracts";
import { getPublishedWorks } from "@/lib/content.server";
export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const selected = workThemes.find((item) => item.id === theme);
  return { title: selected ? formalTheme(selected.id).label : "主题不存在" };
}
export default async function Page({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const selected = workThemes.find((item) => item.id === theme);
  if (!selected) notFound();
  return <Gallery initialThemeId={selected.id} works={await getPublishedWorks()} />;
}
