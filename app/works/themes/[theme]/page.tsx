import { notFound } from "next/navigation";
import ThemeWorks from "@/features/content/ThemeWorks";
import { workThemes } from "@/lib/contracts";
export function generateStaticParams() { return workThemes.map((theme) => ({ theme: theme.id })); }
export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const selected = workThemes.find((item) => item.id === theme);
  return { title: selected ? selected.title + " · 主题作品" : "主题不存在" };
}
export default async function Page({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const selected = workThemes.find((item) => item.id === theme);
  if (!selected) notFound();
  return <ThemeWorks themeId={selected.id} />;
}
