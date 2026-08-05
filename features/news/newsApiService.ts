import type { NewsApiResponse, NewsCategory, NewsSource } from "./types";

export async function fetchNews(category: NewsCategory, query: string, sourceIds: string[], rssSources: NewsSource[]): Promise<NewsApiResponse> {
  const response = await fetch("/api/news/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, query: query.trim() || undefined, sourceIds, rssUrls: rssSources.filter((source) => source.sourceType === "user-rss" && source.isEnabled).map((source) => source.rssUrl).filter(Boolean) }),
    cache: "no-store",
  });
  const payload = await response.json() as NewsApiResponse;
  if (!response.ok && !payload.articles) throw new Error(payload.warning ?? "新闻服务暂时不可用，请稍后重试。");
  return payload;
}
