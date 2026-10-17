import Gallery from "@/features/content/Gallery";
import { getPublishedWorks } from "@/lib/content.server";
export const metadata = { title: "作品" };
export default async function Page() {
  return <Gallery works={await getPublishedWorks()} />;
}
