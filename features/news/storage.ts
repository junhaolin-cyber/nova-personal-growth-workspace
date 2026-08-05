import { DEFAULT_NEWS_SOURCES } from "./sources";
import { NEWS_CATEGORIES, type NewsCache, type NewsClientState, type NewsHistoryItem, type NewsSavedArticle, type NewsSettings, type NewsSource, type NewsTrackedEvent } from "./types";

export const NEWS_STORAGE_KEYS = {
  settings: "nova:news:settings:v1",
  favorites: "nova:news:favorites:v1",
  history: "nova:news:history:v1",
  trackedEvents: "nova:news:tracked-events:v1",
  sources: "nova:news:sources:v1",
  cache: "nova:news:cache:v1",
} as const;

const defaultSettings: NewsSettings = {
  followedCategories: ["推荐", "国内", "国际", "财经", "科技", "体育"],
  hiddenCategories: [],
  defaultLanguage: "all",
  countryOrRegion: "全部",
  pageSize: 12,
  showImages: true,
  autoSummary: true,
  showSourceComparison: true,
  hideRead: false,
  cacheMinutes: 15,
};

function readJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : undefined;
  } catch { return undefined; }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 新闻存储失败不能阻断页面 */ }
}

function validSettings(value: unknown): NewsSettings {
  if (!value || typeof value !== "object") return { ...defaultSettings };
  const candidate = value as Partial<NewsSettings>;
  const followedCategories = Array.isArray(candidate.followedCategories) ? candidate.followedCategories.filter((item): item is NewsSettings["followedCategories"][number] => NEWS_CATEGORIES.includes(item as NewsSettings["followedCategories"][number])) : defaultSettings.followedCategories;
  return {
    ...defaultSettings,
    ...candidate,
    followedCategories,
    hiddenCategories: Array.isArray(candidate.hiddenCategories) ? candidate.hiddenCategories.filter((item): item is NewsSettings["hiddenCategories"][number] => NEWS_CATEGORIES.includes(item as NewsSettings["hiddenCategories"][number])) : [],
    pageSize: typeof candidate.pageSize === "number" ? Math.min(50, Math.max(5, Math.round(candidate.pageSize))) : defaultSettings.pageSize,
  };
}

function validArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }

export function loadNewsState(): NewsClientState {
  const persistedSources = validArray<NewsSource>(readJson(NEWS_STORAGE_KEYS.sources));
  const persistedById = new Map(persistedSources.map((source) => [source.id, source]));
  const sources = [
    ...DEFAULT_NEWS_SOURCES.map((source) => persistedById.get(source.id) ?? source),
    ...persistedSources.filter((source) => !DEFAULT_NEWS_SOURCES.some((defaultSource) => defaultSource.id === source.id)),
  ];
  return {
    settings: validSettings(readJson(NEWS_STORAGE_KEYS.settings)),
    favorites: validArray<NewsSavedArticle>(readJson(NEWS_STORAGE_KEYS.favorites)),
    history: validArray<NewsHistoryItem>(readJson(NEWS_STORAGE_KEYS.history)),
    trackedEvents: validArray<NewsTrackedEvent>(readJson(NEWS_STORAGE_KEYS.trackedEvents)),
    sources,
  };
}

export function saveNewsState(state: NewsClientState): void {
  writeJson(NEWS_STORAGE_KEYS.settings, state.settings);
  writeJson(NEWS_STORAGE_KEYS.favorites, state.favorites);
  writeJson(NEWS_STORAGE_KEYS.history, state.history);
  writeJson(NEWS_STORAGE_KEYS.trackedEvents, state.trackedEvents);
  writeJson(NEWS_STORAGE_KEYS.sources, state.sources);
}

export function loadNewsCache(): NewsCache | undefined { return readJson<NewsCache>(NEWS_STORAGE_KEYS.cache); }
export function saveNewsCache(cache: NewsCache): void { writeJson(NEWS_STORAGE_KEYS.cache, cache); }
