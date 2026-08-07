import type { TrendLifeState } from "./types";
import { notifyFirstBatchStorageChanged } from "@/features/sync/events";

const STORAGE_KEY = "nova-trend-life:v1";
const emptyState: TrendLifeState = { favoriteIds: [], favoriteBrandIds: [], favoriteThemeIds: [], historyIds: [], historyBrandIds: [] };

function cleanIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
}

export function readTrendLifeState(): TrendLifeState {
  if (typeof window === "undefined") return emptyState;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return emptyState;
    const record = parsed as Record<string, unknown>;
    return {
      favoriteIds: cleanIds(record.favoriteIds),
      favoriteBrandIds: cleanIds(record.favoriteBrandIds),
      favoriteThemeIds: cleanIds(record.favoriteThemeIds),
      historyIds: cleanIds(record.historyIds),
      historyBrandIds: cleanIds(record.historyBrandIds),
    };
  } catch {
    return emptyState;
  }
}

export function writeTrendLifeState(state: TrendLifeState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifyFirstBatchStorageChanged("trend-life");
  } catch {
    // 本地存储不可用时不影响页面浏览。
  }
}
