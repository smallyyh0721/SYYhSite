import WorkDetail from "@/features/content/WorkDetail";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedWork, getPublishedWorks } from "@/lib/content.server";
const legacy: Record<string, string> = { "sky-city": "sky", "ancient-landform": "ancient", apocalypse: "apocalypse", "anime-home": "home" };
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = await getPublishedWork(slug);
  return work ? { title: work.title, description: work.description, openGraph: { title: work.title, description: work.description, images: [{ url: work.image, alt: work.title }] } } : { title: "作品不存在", robots: { index: false } };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (legacy[slug]) permanentRedirect(`/works/themes/${legacy[slug]}/`);
  const work = await getPublishedWork(slug);
  if (!work) notFound();
  return <WorkDetail work={work} relatedWorks={await getPublishedWorks()} />;
}
