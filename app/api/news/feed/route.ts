import { NextRequest, NextResponse } from "next/server";
import { aggregateNews } from "@/features/news/server/aggregateService";
import { fetchGdeltArticles } from "@/features/news/server/gdeltService";
import { fetchOptionalNewsApiArticles } from "@/features/news/server/newsApiService";
import { fetchRssArticles } from "@/features/news/server/rssService";
import { safeRssUrls } from "@/features/news/server/validation";
import { runWithFeedCache } from "@/features/news/server/feedCache";
import { DEFAULT_NEWS_SOURCES, getOfficialRssSources } from "@/features/news/sources";
import type { NewsApiResponse, NewsCategory, NewsFeedMetrics, NewsSource, NewsSourceStatus } from "@/features/news/types";

export const runtime = "nodejs";

type RequestBody = { category?: NewsCategory; query?: string; sourceIds?: string[]; rssUrls?: string[] };

function createRequestId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `news-${Date.now()}`;
}

function getRequestKey(body: RequestBody): string {
  return JSON.stringify({
    category: body.category ?? "推荐",
    query: body.query?.trim() ?? "",
    sourceIds: [...(body.sourceIds ?? [])].sort(),
    rssUrls: [...safeRssUrls(body.rssUrls)].sort(),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function errorStatus(error: unknown): number | undefined {
  return error && typeof error === "object" && "httpStatus" in error && typeof error.httpStatus === "number" ? error.httpStatus : undefined;
}

function getErrorMetrics(error: unknown) {
  if (error && typeof error === "object" && "metrics" in error) return error.metrics as NewsFeedMetrics["gdelt"];
  return { requestCount: 0, httpStatusCodes: [], cacheHit: false, retryCount: 0, finalArticleCount: 0 };
}

function selectableRssSources(body: RequestBody, category: NewsCategory): NewsSource[] {
  const selectedIds = body.sourceIds;
  const official = getOfficialRssSources(category).filter((source) => !selectedIds || selectedIds.includes(source.id));
  const userRssSources = safeRssUrls(body.rssUrls).map((url) => ({
    ...DEFAULT_NEWS_SOURCES[0],
    id: `user-rss-${url}`,
    name: new URL(url).hostname,
    sourceType: "user-rss" as const,
    rssUrl: url,
    isEnabled: true,
  }));
  return [...official, ...userRssSources];
}

async function loadFeed(body: RequestBody, requestId: string): Promise<NewsApiResponse> {
  const category = body.category ?? "推荐";
  const fetchedAt = new Date().toISOString();
  const statuses: NewsSourceStatus[] = [];
  let gdeltArticles = [] as Awaited<ReturnType<typeof fetchGdeltArticles>>["articles"];
  let gdeltMetrics = getErrorMetrics(undefined);
  let gdeltSucceeded = false;

  try {
    const gdeltResult = await fetchGdeltArticles(category, body.query);
    gdeltArticles = gdeltResult.articles;
    gdeltMetrics = gdeltResult.metrics;
    gdeltSucceeded = true;
    statuses.push({ sourceId: "gdelt", sourceName: "GDELT 全球新闻数据", ok: true, fetchedAt, requestCount: gdeltMetrics.requestCount, cacheHit: gdeltMetrics.cacheHit, retryCount: gdeltMetrics.retryCount, finalArticleCount: gdeltArticles.length, httpStatus: gdeltMetrics.httpStatusCodes.at(-1) });
  } catch (error) {
    gdeltMetrics = getErrorMetrics(error);
    statuses.push({ sourceId: "gdelt", sourceName: "GDELT 全球新闻数据", ok: false, message: errorMessage(error, "GDELT 请求失败"), fetchedAt, requestCount: gdeltMetrics.requestCount, cacheHit: gdeltMetrics.cacheHit, retryCount: gdeltMetrics.retryCount, finalArticleCount: 0, httpStatus: gdeltMetrics.httpStatusCodes.at(-1) });
  }

  const rssSources = !gdeltSucceeded || gdeltArticles.length === 0 ? selectableRssSources(body, category) : [];
  const rssResults = await Promise.all(rssSources.map(async (source) => {
    try {
      const articles = await fetchRssArticles(source);
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: true, fetchedAt, requestCount: 1, finalArticleCount: articles.length });
      return articles;
    } catch (error) {
      statuses.push({ sourceId: source.id, sourceName: source.name, ok: false, message: errorMessage(error, "RSS 请求失败"), fetchedAt, requestCount: 1, finalArticleCount: 0, httpStatus: errorStatus(error) });
      return [];
    }
  }));
  const rssArticles = rssResults.flat();

  let newsApiArticles = [] as Awaited<ReturnType<typeof fetchOptionalNewsApiArticles>>;
  if (!gdeltArticles.length && !rssArticles.length && process.env.NEWS_API_KEY) {
    try {
      newsApiArticles = await fetchOptionalNewsApiArticles(category, body.query);
      statuses.push({ sourceId: "news-api", sourceName: "NewsAPI（开发测试）", ok: true, fetchedAt, requestCount: 1, finalArticleCount: newsApiArticles.length });
    } catch (error) {
      statuses.push({ sourceId: "news-api", sourceName: "NewsAPI（开发测试）", ok: false, message: errorMessage(error, "NewsAPI 请求失败"), fetchedAt, requestCount: 1, finalArticleCount: 0 });
    }
  }

  const aggregated = aggregateNews([...gdeltArticles, ...rssArticles, ...newsApiArticles]);
  const metrics: NewsFeedMetrics = {
    requestId,
    gdelt: gdeltMetrics,
    rss: { requestCount: rssSources.length, successCount: statuses.filter((status) => status.sourceId !== "gdelt" && status.ok).length, finalArticleCount: rssArticles.length },
    feedCacheHit: false,
    requestDeduped: false,
    finalArticleCount: aggregated.articles.length,
  };
  if (!aggregated.articles.length) {
    return { articles: [], events: [], sourceStatuses: statuses, fetchedAt, metrics, warning: "新闻服务暂时不可用，请稍后重试。" };
  }
  const hasFailedSource = statuses.some((status) => !status.ok);
  return {
    ...aggregated,
    sourceStatuses: statuses,
    fetchedAt,
    metrics,
    warning: hasFailedSource ? "部分新闻来源暂时不可用，当前结果来自成功返回的来源。" : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: RequestBody = {};
  try { body = await request.json() as RequestBody; } catch { /* 使用默认查询 */ }
  const requestId = createRequestId();
  const result = await runWithFeedCache(getRequestKey(body), () => loadFeed(body, requestId));
  const metrics = result.response.metrics ? { ...result.response.metrics, feedCacheHit: result.cacheHit, requestDeduped: result.requestDeduped } : undefined;
  return NextResponse.json({ ...result.response, fromCache: result.response.fromCache || result.cacheHit, metrics }, { status: result.response.articles.length ? 200 : 503 });
}
