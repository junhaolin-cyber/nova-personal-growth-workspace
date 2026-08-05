import { articleId, cleanText, normalizeTitle, nowIso, sourceDomain, truncateText } from "./utils";
import type { NewsArticle, NewsCategory } from "./types";

export type RawNewsArticle = {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  link?: unknown;
  sourceUrl?: unknown;
  imageUrl?: unknown;
  socialimage?: unknown;
  sourceName?: unknown;
  domain?: unknown;
  publishedAt?: unknown;
  seendate?: unknown;
  language?: unknown;
  sourcecountry?: unknown;
  category?: NewsCategory;
  sourceId: string;
};

export function parseGdeltDate(value: unknown): string {
  if (typeof value !== "string") return nowIso();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return nowIso();
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

export function normalizeArticle(raw: RawNewsArticle, fetchedAt = nowIso()): NewsArticle | undefined {
  const originalTitle = cleanText(raw.title);
  const articleUrl = cleanText(raw.url ?? raw.link);
  if (!originalTitle || !/^https?:\/\//i.test(articleUrl)) return undefined;
  const normalizedTitle = normalizeTitle(originalTitle);
  return {
    id: articleId(raw.sourceId, articleUrl, originalTitle),
    originalTitle,
    normalizedTitle,
    description: truncateText(cleanText(raw.description), 260),
    sourceId: raw.sourceId,
    sourceName: cleanText(raw.sourceName) || sourceDomain(articleUrl),
    sourceUrl: cleanText(raw.sourceUrl) || articleUrl,
    articleUrl,
    imageUrl: cleanText(raw.imageUrl ?? raw.socialimage) || undefined,
    category: raw.category ?? "其他",
    language: cleanText(raw.language) || undefined,
    countryOrRegion: cleanText(raw.sourcecountry) || undefined,
    publishedAt: raw.publishedAt && !Number.isNaN(new Date(String(raw.publishedAt)).getTime()) ? new Date(String(raw.publishedAt)).toISOString() : parseGdeltDate(raw.seendate),
    fetchedAt,
    keywords: [],
    entities: [],
    isRead: false,
    isFavorite: false,
  };
}
