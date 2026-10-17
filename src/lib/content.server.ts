import { cache } from "react";
import { works as seedWorks, type Work } from "./contracts";

const api = process.env.CONTENT_API_URL || "http://127.0.0.1:3001";
const useSeed = process.env.CONTENT_MODE === "seed" || (process.env.NODE_ENV === "development" && !process.env.CONTENT_API_URL);

async function read<T>(pathname: string): Promise<T | null> {
  const response = await fetch(`${api}${pathname}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("作品服务暂时不可用");
  return response.json() as Promise<T>;
}

export const getPublishedWorks = cache(async (): Promise<Work[]> => {
  if (useSeed) return seedWorks;
  const data = await read<{ works: Work[] }>("/api/works");
  if (!data || !Array.isArray(data.works)) throw new Error("作品服务返回无效数据");
  return data.works;
});

export const getPublishedWork = cache(async (slug: string): Promise<Work | null> => {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return null;
  if (useSeed) return seedWorks.find((item) => item.slug === slug) ?? null;
  const data = await read<{ work: Work }>(`/api/works/${encodeURIComponent(slug)}`);
  return data?.work ?? null;
});
