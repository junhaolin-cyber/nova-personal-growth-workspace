import type { NewsApiResponse } from "../types";

const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

type FeedRuntime = {
  cache: Map<string, { expiresAt: number; response: NewsApiResponse }>;
  inFlight: Map<string, Promise<NewsApiResponse>>;
};

const runtime = (globalThis as typeof globalThis & { __novaNewsFeedRuntime?: FeedRuntime }).__novaNewsFeedRuntime ??= {
  cache: new Map(),
  inFlight: new Map(),
};

export async function runWithFeedCache(
  key: string,
  loader: () => Promise<NewsApiResponse>,
): Promise<{ response: NewsApiResponse; cacheHit: boolean; requestDeduped: boolean }> {
  const cached = runtime.cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { response: { ...cached.response, fromCache: true }, cacheHit: true, requestDeduped: false };
  }
  if (cached) runtime.cache.delete(key);

  const existing = runtime.inFlight.get(key);
  if (existing) {
    return { response: await existing, cacheHit: false, requestDeduped: true };
  }

  const request = loader();
  runtime.inFlight.set(key, request);
  try {
    const response = await request;
    if (response.articles.length > 0) {
      runtime.cache.set(key, { expiresAt: Date.now() + FEED_CACHE_TTL_MS, response });
    }
    return { response, cacheHit: false, requestDeduped: false };
  } finally {
    runtime.inFlight.delete(key);
  }
}
