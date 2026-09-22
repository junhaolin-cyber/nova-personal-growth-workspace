import "server-only";

import type { MediaItem } from "@/features/movies-tv/types";
import { discoverEnglishTrending } from "@/features/movies-tv/tmdb";
import type { OnlineRecommendation } from "./onlineTypes";

const TED_CHANNEL_ID = "UCAuUUnT6oDeKwE6v1NGQxug";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const REQUEST_TIMEOUT_MS = 8000;
const coverTones = [
  "from-[#E8E7F7] to-[#C9C8FA]",
  "from-[#DDEFE4] to-[#B8DEC7]",
  "from-[#F7E5D5] to-[#F1C9A7]",
  "from-[#E4EDF5] to-[#B8D0E5]",
];

function getYear(date?: string) {
  const year = date?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : undefined;
}

function withExternalId(items: MediaItem[]): Array<MediaItem & { externalId: number }> {
  return items.filter((item): item is MediaItem & { externalId: number } => typeof item.externalId === "number");
}

function mapMovie(item: MediaItem, index: number): OnlineRecommendation {
  const year = getYear(item.releaseDate);
  const genre = item.genres[0];
  return {
    id: `tmdb-movie-${item.externalId}`,
    type: "movie",
    titleZh: item.title,
    titleEn: item.originalTitle ?? item.title,
    coverLabel: "TMDB",
    coverTone: coverTones[index % coverTones.length],
    posterUrl: item.posterUrl,
    topics: item.genres.slice(0, 2),
    summary: item.overview,
    reason: "来自 TMDB 当前热门英文电影。",
    learningScenes: ["真实对白", "听力输入"],
    url: item.officialUrl,
    source: "TMDB",
    detailText: [year, genre, item.runtimeMinutes ? `${item.runtimeMinutes} 分钟` : undefined].filter(Boolean).join(" · ") || "TMDB 热门电影",
  };
}

function mapSeries(item: MediaItem, index: number): OnlineRecommendation {
  const year = getYear(item.releaseDate);
  const genre = item.genres[0];
  return {
    id: `tmdb-tv-${item.externalId}`,
    type: "series",
    titleZh: item.title,
    titleEn: item.originalTitle ?? item.title,
    coverLabel: "TMDB",
    coverTone: coverTones[index % coverTones.length],
    posterUrl: item.posterUrl,
    topics: item.genres.slice(0, 2),
    summary: item.overview,
    reason: "来自 TMDB 当前热门英文电视剧。",
    learningScenes: ["真实对白", "听力输入"],
    url: item.officialUrl,
    source: "TMDB",
    detailText: [year, genre, item.runtimeMinutes ? `单集 ${item.runtimeMinutes} 分钟` : undefined].filter(Boolean).join(" · ") || "TMDB 热门电视剧",
  };
}

export async function getOnlineMovieRecommendations(): Promise<OnlineRecommendation[]> {
  const items = await discoverEnglishTrending("movie");
  return withExternalId(items).map(mapMovie);
}

export async function getOnlineSeriesRecommendations(): Promise<OnlineRecommendation[]> {
  const items = await discoverEnglishTrending("tv");
  return withExternalId(items).map(mapSeries);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function youtubeDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function youtubeFetch(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${YOUTUBE_API_URL}${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), next: { revalidate: 21600 } });
  if (!response.ok) return null;
  return await response.json() as unknown;
}

export async function getOnlineSpeechRecommendations(): Promise<OnlineRecommendation[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) return [];

  const searchPayload = await youtubeFetch("/search", {
    part: "snippet",
    channelId: TED_CHANNEL_ID,
    type: "video",
    order: "date",
    maxResults: "12",
    publishedAfter: youtubeDateDaysAgo(90),
    videoCaption: "closedCaption",
    relevanceLanguage: "en",
    safeSearch: "strict",
  }, apiKey);
  const searchItems = Array.isArray(asRecord(searchPayload)?.items) ? asRecord(searchPayload)?.items as unknown[] : [];
  const videoIds = searchItems.flatMap((item) => {
    const record = asRecord(item);
    const id = asString(asRecord(record?.id)?.videoId);
    return id ? [id] : [];
  });
  if (!videoIds.length) return [];

  const videosPayload = await youtubeFetch("/videos", {
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    maxResults: "12",
  }, apiKey);
  const videoItems = Array.isArray(asRecord(videosPayload)?.items) ? asRecord(videosPayload)?.items as unknown[] : [];
  const ranked = videoItems.map((item) => {
    const record = asRecord(item);
    const id = asString(record?.id);
    const snippet = asRecord(record?.snippet);
    const statistics = asRecord(record?.statistics);
    const thumbnails = asRecord(snippet?.thumbnails);
    const thumbnail = ["maxres", "high", "medium", "default"].map((key) => asString(asRecord(thumbnails?.[key])?.url)).find(Boolean);
    const publishedAt = asString(snippet?.publishedAt);
    const viewCount = asNumber(statistics?.viewCount) ?? 0;
    const ageDays = publishedAt ? Math.max(0, (Date.now() - Date.parse(publishedAt)) / 86400000) : 90;
    const recencyScore = Math.max(0, 1 - ageDays / 90);
    const popularityScore = Math.log10(viewCount + 1) / 10;
    return { id, title: asString(snippet?.title), description: asString(snippet?.description), channelTitle: asString(snippet?.channelTitle), thumbnail, publishedAt, score: recencyScore * 0.55 + popularityScore * 0.45 };
  }).filter((item): item is typeof item & { id: string; title: string; thumbnail: string } => Boolean(item.id && item.title && item.thumbnail)).sort((left, right) => right.score - left.score).slice(0, 3);

  return ranked.map((item) => ({
    id: `youtube-${item.id}`,
    type: "speech",
    titleZh: item.title,
    titleEn: item.title,
    coverLabel: "TED",
    coverTone: coverTones[0],
    posterUrl: item.thumbnail,
    topics: ["英语演讲", "听力"],
    summary: item.description || "来自 TED 官方频道的近期英语演讲。",
    reason: "来自 TED 官方频道的近期公开演讲，按发布时间与观看热度综合选择。",
    learningScenes: ["听力输入", "观点表达"],
    url: `https://www.youtube.com/watch?v=${item.id}`,
    source: "YouTube",
    detailText: [item.channelTitle, item.publishedAt?.slice(0, 10)].filter(Boolean).join(" · ") || "TED 官方演讲",
    captions: { english: true, bilingual: false },
  }));
}
