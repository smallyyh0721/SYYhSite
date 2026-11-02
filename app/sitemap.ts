import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getPublishedWorks } from "@/lib/content.server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/hub/", "/works/", "/about/", "/story/", ...(await getPublishedWorks()).map(work => `/works/${work.slug}/`)];
  return paths.map(path => ({ url: `${siteUrl}${path}` }));
}
