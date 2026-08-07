import type { MoviesTvState, WatchRecord } from "./types";
import { notifyFirstBatchStorageChanged } from "@/features/sync/events";

const STORAGE_KEY = "nova-movies-tv:v1";
const emptyState: MoviesTvState = { favoriteIds: [], watchRecords: [] };

function cleanIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
}

function cleanRecords(value: unknown): WatchRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.mediaId !== "string" || (record.status !== "want" && record.status !== "watched")) return [];
    return [{
      mediaId: record.mediaId,
      status: record.status,
      rating: typeof record.rating === "number" && record.rating >= 1 && record.rating <= 10 ? record.rating : undefined,
      watchedAt: typeof record.watchedAt === "string" ? record.watchedAt : undefined,
      note: typeof record.note === "string" ? record.note.slice(0, 300) : undefined,
    } satisfies WatchRecord];
  });
}

export function readMoviesTvState(): MoviesTvState {
  if (typeof window === "undefined") return emptyState;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return emptyState;
    const record = parsed as Record<string, unknown>;
    return { favoriteIds: cleanIds(record.favoriteIds), watchRecords: cleanRecords(record.watchRecords) };
  } catch {
    return emptyState;
  }
}

export function writeMoviesTvState(state: MoviesTvState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifyFirstBatchStorageChanged("movies-tv");
  } catch {
    // 本地存储不可用时不影响页面操作。
  }
}
