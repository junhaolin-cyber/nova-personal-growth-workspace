import { CATEGORY_QUERIES } from "../sources";
import { normalizeArticle } from "../normalizer";
import type { NewsArticle, NewsCategory, NewsRequestMetrics } from "../types";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_CACHE_TTL_MS = 5 * 60 * 1000;
const GDELT_TIMEOUT_MS = 9000;
const GDELT_MAX_RETRIES = 2;
const GDELT_MIN_INTERVAL_MS = 1200;
const GDELT_MAX_RETRY_WAIT_MS = 10000;

type GdeltPayload = { articles?: Array<Record<string, unknown>> };
type GdeltCacheEntry = { expiresAt: number; fetchedAt: string; articles: NewsArticle[] };
type GdeltRuntime = {
  cache: Map<string, GdeltCacheEntry>;
  inFlight: Map<string, Promise<GdeltFetchResult>>;
  lastRequestAt: number;
};

export type GdeltFetchResult = {
  articles: NewsArticle[];
  fetchedAt: string;
  metrics: NewsRequestMetrics;
};

type GdeltRequestError = Error & { metrics: NewsRequestMetrics; httpStatus?: number };

const runtime = (globalThis as typeof globalThis & { __novaGdeltRuntime?: GdeltRuntime }).__novaGdeltRuntime ??= {
  cache: new Map(),
  inFlight: new Map(),
  lastRequestAt: 0,
};

function createMetrics(): NewsRequestMetrics {
  return { requestCount: 0, httpStatusCodes: [], cacheHit: false, retryCount: 0, finalArticleCount: 0 };
}

function retryAfterMs(value: string | null, attempt: number): number | undefined {
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      const delay = Math.max(0, seconds * 1000);
      return delay <= GDELT_MAX_RETRY_WAIT_MS ? delay : undefined;
    }
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      const delay = Math.max(0, timestamp - Date.now());
      return delay <= GDELT_MAX_RETRY_WAIT_MS ? delay : undefined;
    }
  }
  return 1000 * (2 ** attempt);
}

async function waitForRequestInterval(): Promise<void> {
  const waitMs = Math.max(0, runtime.lastRequestAt + GDELT_MIN_INTERVAL_MS - Date.now());
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  runtime.lastRequestAt = Date.now();
}

async function loadGdelt(query: string, category: NewsCategory): Promise<GdeltFetchResult> {
  const metrics = createMetrics();
  let lastError: GdeltRequestError | undefined;

  for (let attempt = 0; attempt <= GDELT_MAX_RETRIES; attempt += 1) {
    await waitForRequestInterval();
    const params = new URLSearchParams({ query, mode: "artlist", maxrecords: "60", timespan: "24h", sort: "datedesc", format: "json" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GDELT_TIMEOUT_MS);
    try {
      metrics.requestCount += 1;
      const response = await fetch(`${GDELT_URL}?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
      metrics.httpStatusCodes.push(response.status);

      if (response.ok) {
        const payload = await response.json() as GdeltPayload;
        const fetchedAt = new Date().toISOString();
        const articles = (payload.articles ?? []).map((item) => normalizeArticle({
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
        metrics.finalArticleCount = articles.length;
        return { articles, fetchedAt, metrics };
      }

      const error = Object.assign(new Error(response.status === 429 ? "GDELT 当前请求频率受限，请稍后刷新。" : `GDELT 请求失败（${response.status}）`), { metrics, httpStatus: response.status }) as GdeltRequestError;
      lastError = error;
      if (response.status !== 429 || attempt >= GDELT_MAX_RETRIES) throw error;
      const retryDelay = retryAfterMs(response.headers.get("retry-after"), attempt);
      if (retryDelay === undefined) throw error;
      metrics.retryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } catch (error) {
      if (error instanceof Error && "metrics" in error) throw error;
      const requestError = Object.assign(new Error(error instanceof Error && error.name === "AbortError" ? "GDELT 请求超时，请稍后重试。" : "GDELT 网络连接异常，请稍后重试。"), { metrics }) as GdeltRequestError;
      lastError = requestError;
      throw requestError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? Object.assign(new Error("GDELT 请求失败，请稍后重试。"), { metrics: createMetrics() });
}

export async function fetchGdeltArticles(category: NewsCategory = "推荐", searchQuery?: string): Promise<GdeltFetchResult> {
  const query = searchQuery?.trim() || CATEGORY_QUERIES[category];
  const key = `${category}:${query}`;
  const cached = runtime.cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { articles: cached.articles, fetchedAt: cached.fetchedAt, metrics: { ...createMetrics(), cacheHit: true, finalArticleCount: cached.articles.length } };
  }
  if (cached) runtime.cache.delete(key);

  const existing = runtime.inFlight.get(key);
  if (existing) return existing;

  const request = loadGdelt(query, category);
  runtime.inFlight.set(key, request);
  try {
    const result = await request;
    runtime.cache.set(key, { expiresAt: Date.now() + GDELT_CACHE_TTL_MS, fetchedAt: result.fetchedAt, articles: result.articles });
    return result;
  } finally {
    runtime.inFlight.delete(key);
  }
}
