import { normalizeArticle } from "../normalizer";
import type { NewsArticle, NewsCategory } from "../types";

export async function fetchOptionalNewsApiArticles(category: NewsCategory, query?: string): Promise<NewsArticle[]> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ q: query || category, language: "en", pageSize: "30", sortBy: "publishedAt" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, { signal: controller.signal, cache: "no-store", headers: { "X-Api-Key": key } });
    if (!response.ok) throw new Error(`NewsAPI ${response.status}`);
    const payload = await response.json() as { articles?: Array<Record<string, unknown>> };
    const fetchedAt = new Date().toISOString();
    return (payload.articles ?? []).map((item) => {
      const source = item.source as { name?: string; url?: string } | undefined;
      return normalizeArticle({ sourceId: "news-api", sourceName: source?.name, sourceUrl: source?.url, title: item.title, url: item.url, description: item.description, imageUrl: item.urlToImage, publishedAt: item.publishedAt, category }, fetchedAt);
    }).filter((item): item is NewsArticle => Boolean(item));
  } finally { clearTimeout(timeout); }
}
