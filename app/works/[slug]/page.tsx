import { works } from "@/lib/contracts";
import WorkDetail from "@/features/content/WorkDetail";
import { notFound } from "next/navigation";
export const dynamicParams = false;
export function generateStaticParams() {
  return works.map((work) => ({ slug: work.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: works.find((w) => w.slug === slug)?.title || "No Signal" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
  if (!work) notFound();
  return <WorkDetail work={work} />;
}
