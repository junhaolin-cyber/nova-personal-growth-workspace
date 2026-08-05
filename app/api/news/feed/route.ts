import { NextRequest, NextResponse } from "next/server";
import { aggregateNews } from "@/features/news/server/aggregateService";
import { fetchGdeltArticles } from "@/features/news/server/gdeltService";
import { fetchOptionalNewsApiArticles } from "@/features/news/server/newsApiService";
import { fetchRssArticles } from "@/features/news/server/rssService";
import { DEFAULT_NEWS_SOURCES } from "@/features/news/sources";
import { safeRssUrls } from "@/features/news/server/validation";
import type { NewsCategory, NewsSourceStatus } from "@/features/news/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { category?: NewsCategory; query?: string; sourceIds?: string[]; rssUrls?: string[] } = {};
  try { body = await request.json() as typeof body; } catch { /* 使用默认筛选 */ }
  const category = body.category ?? "推荐";
  const fetchedAt = new Date().toISOString();
  const statuses: NewsSourceStatus[] = [];
  const enabledSources = DEFAULT_NEWS_SOURCES.filter((source) => source.isEnabled || body.sourceIds?.includes(source.id));
  const sourcePromises = enabledSources.filter((source) => source.sourceType === "official-rss").map(async (source) => {
    try {
      const articles = await fetchRssArticles(source);
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: true, fetchedAt });
      return articles;
    } catch (error) {
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: false, message: error instanceof Error ? error.message : "RSS 请求失败", fetchedAt });
      return [];
    }
  });
  const userRssPromises = safeRssUrls(body.rssUrls).map(async (url) => {
    const source = { ...DEFAULT_NEWS_SOURCES[0], id: `user-rss-${url}`, name: new URL(url).hostname, sourceId: "user-rss", sourceType: "user-rss" as const, rssUrl: url, isEnabled: true };
    try {
      const articles = await fetchRssArticles(source);
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: true, fetchedAt });
      return articles;
    } catch (error) {
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: false, message: error instanceof Error ? error.message : "RSS 请求失败", fetchedAt });
      return [];
    }
  });
  const [gdeltResult, newsApiResult, ...rssResults] = await Promise.allSettled([
    fetchGdeltArticles(category, body.query),
    fetchOptionalNewsApiArticles(category, body.query),
    ...sourcePromises,
    ...userRssPromises,
  ]);
  const gdeltArticles = gdeltResult.status === "fulfilled" ? gdeltResult.value : [];
  statuses.push({ sourceId: "gdelt", sourceName: "GDELT 全球新闻数据", ok: gdeltResult.status === "fulfilled", message: gdeltResult.status === "rejected" ? (gdeltResult.reason instanceof Error ? gdeltResult.reason.message : "GDELT 请求失败") : undefined, fetchedAt });
  const newsApiArticles = newsApiResult.status === "fulfilled" ? newsApiResult.value : [];
  if (process.env.NEWS_API_KEY) statuses.push({ sourceId: "news-api", sourceName: "NewsAPI（开发测试）", ok: newsApiResult.status === "fulfilled", message: newsApiResult.status === "rejected" ? "NewsAPI 请求失败" : undefined, fetchedAt });
  const rssArticles = rssResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const aggregated = aggregateNews([...gdeltArticles, ...rssArticles, ...newsApiArticles]);
  if (!aggregated.articles.length) {
    return NextResponse.json({ articles: [], events: [], sourceStatuses: statuses, fetchedAt, warning: "新闻服务暂时不可用，请稍后重试。" }, { status: 503 });
  }
  const hasFailedSource = statuses.some((status) => !status.ok);
  return NextResponse.json({ ...aggregated, sourceStatuses: statuses, fetchedAt, warning: hasFailedSource ? "部分新闻来源暂时不可用，当前结果来自成功返回的来源。" : undefined });
}
