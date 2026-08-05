import { CATEGORY_QUERIES } from "../sources";
import { normalizeArticle } from "../normalizer";
import type { NewsArticle, NewsCategory } from "../types";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

type GdeltPayload = { articles?: Array<Record<string, unknown>> };

export async function fetchGdeltArticles(category: NewsCategory = "推荐", searchQuery?: string): Promise<NewsArticle[]> {
  const query = searchQuery?.trim() || CATEGORY_QUERIES[category];
  const params = new URLSearchParams({ query, mode: "artlist", maxrecords: "60", timespan: "24h", sort: "datedesc", format: "json" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${GDELT_URL}?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 429 ? "GDELT 当前请求频率受限，请稍后刷新。" : `GDELT 请求失败（${response.status}）`);
    const payload = await response.json() as GdeltPayload;
    const fetchedAt = new Date().toISOString();
    return (payload.articles ?? []).map((item) => normalizeArticle({
      sourceId: "gdelt",
      sourceName: typeof item.domain === "string" ? item.domain : "GDELT 来源",
      sourceUrl: "https://www.gdeltproject.org/",
      title: item.title,
      url: item.url,
      socialimage: item.socialimage,
      seendate: item.seendate,
      language: item.language,
      sourcecountry: item.sourcecountry,
      category,
    }, fetchedAt)).filter((item): item is NewsArticle => Boolean(item));
  } finally {
    clearTimeout(timeout);
  }
}
