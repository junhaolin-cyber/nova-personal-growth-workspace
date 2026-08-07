"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { readMoviesTvState, writeMoviesTvState } from "@/features/movies-tv/storage";
import type { MoviesTvState, WatchRecord } from "@/features/movies-tv/types";
import { loadFoodState, saveFoodState } from "@/features/food/storage";
import type { FoodDiscoveryState } from "@/features/food/types";
import { loadNewsState, saveNewsState } from "@/features/news/storage";
import type { NewsSavedArticle } from "@/features/news/types";
import { readTrendLifeState, writeTrendLifeState } from "@/features/trend-life/storage";
import type { TrendLifeState } from "@/features/trend-life/types";
import { hasCompletedFirstBatchMigration } from "@/features/migration/firstBatch/storage";
import { notifyFirstBatchRemoteMerged } from "./events";
import { enqueueSyncOperation, removeSyncOperations } from "./engine";
import { compareVersionedSnapshots } from "./conflict";
import { isNetworkOnline } from "./network";
import { readSyncQueue } from "./storage";
import type { SyncQueueItem } from "./types";

export const FIRST_BATCH_MODULES = ["movies-tv", "food", "news", "trend-life"] as const;
export type FirstBatchSyncModule = (typeof FIRST_BATCH_MODULES)[number];
type FirstBatchItemType = "favorite" | "status";
type FirstBatchState = "favorite" | "completed" | "want" | "visited";

const META_STORAGE_KEY = "nova:sync:first-batch-metadata:v1";

type LocalRecord = {
  key: string;
  module: FirstBatchSyncModule;
  itemType: FirstBatchItemType;
  entityId: string;
  state: FirstBatchState;
  payload: Record<string, Json>;
  sourceStorageKey: string;
};

type MetadataRecord = {
  module: FirstBatchSyncModule;
  itemType: FirstBatchItemType;
  entityId: string;
  state: FirstBatchState;
  signature: string;
  sourceStorageKey: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt: string | null;
  localPresence: boolean;
};

type MetadataMap = Record<string, MetadataRecord>;
type CloudRow = Database["public"]["Tables"]["user_data_items"]["Row"];

function recordKey(module: FirstBatchSyncModule, itemType: FirstBatchItemType, entityId: string): string {
  return `${module}:${itemType}:${entityId}`;
}

function readMetadata(): MetadataMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as MetadataMap;
  } catch {
    return {};
  }
}

function writeMetadata(metadata: MetadataMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metadata));
  } catch {
    // 同步元数据不可用时保留业务数据，下一次联网时重新比较。
  }
}

function signature(state: FirstBatchState, payload: Record<string, Json>): string {
  return JSON.stringify({ state, payload });
}

function createLocalRecord(module: FirstBatchSyncModule, itemType: FirstBatchItemType, entityId: string, state: FirstBatchState, payload: Record<string, Json>, sourceStorageKey: string): LocalRecord {
  return { key: recordKey(module, itemType, entityId), module, itemType, entityId, state, payload, sourceStorageKey };
}

function scanMovies(): LocalRecord[] {
  const state = readMoviesTvState();
  const records: LocalRecord[] = [];
  for (const mediaId of state.favoriteIds) {
    records.push(createLocalRecord("movies-tv", "favorite", mediaId, "favorite", { mediaId }, "nova-movies-tv:v1"));
  }
  for (const record of state.watchRecords) {
    const payload: Record<string, Json> = { mediaId: record.mediaId, rating: record.rating ?? null, watchedAt: record.watchedAt ?? null, note: record.note ?? null };
    records.push(createLocalRecord("movies-tv", "status", record.mediaId, record.status === "watched" ? "completed" : "want", payload, "nova-movies-tv:v1"));
  }
  return records;
}

function scanFood(): LocalRecord[] {
  const state = loadFoodState();
  const records: LocalRecord[] = [];
  for (const restaurantId of state.favoriteRestaurantIds) {
    records.push(createLocalRecord("food", "favorite", restaurantId, "favorite", { restaurantId }, "nova:food-favorite:v1"));
  }
  for (const restaurant of state.restaurants) {
    if (restaurant.status !== "want" && restaurant.status !== "visited") continue;
    records.push(createLocalRecord("food", "status", restaurant.id, restaurant.status === "visited" ? "visited" : "want", { restaurantId: restaurant.id, lastVisitedAt: restaurant.lastVisitedAt ?? null }, "nova:food-discovery:v1"));
  }
  return records;
}

function scanNews(): LocalRecord[] {
  return loadNewsState().favorites.map((article) => createLocalRecord("news", "favorite", article.id, "favorite", {
    articleId: article.id,
    title: article.originalTitle,
    sourceName: article.sourceName,
    articleUrl: article.articleUrl,
    publishedAt: article.publishedAt,
    description: article.description ?? null,
    savedAt: article.savedAt,
  }, "nova:news:favorites:v1"));
}

function scanTrendLife(): LocalRecord[] {
  const state = readTrendLifeState();
  return [
    ...state.favoriteIds.map((id) => createLocalRecord("trend-life", "favorite", `item:${id}`, "favorite", { entityKind: "item", itemId: id }, "nova-trend-life:v1")),
    ...state.favoriteBrandIds.map((id) => createLocalRecord("trend-life", "favorite", `brand:${id}`, "favorite", { entityKind: "brand", brandId: id }, "nova-trend-life:v1")),
    ...state.favoriteThemeIds.map((id) => createLocalRecord("trend-life", "favorite", `theme:${id}`, "favorite", { entityKind: "theme", themeId: id }, "nova-trend-life:v1")),
  ];
}

export function scanLocalFirstBatchRecords(): LocalRecord[] {
  return [...scanMovies(), ...scanFood(), ...scanNews(), ...scanTrendLife()];
}

function payloadString(row: CloudRow, key: string): string | undefined {
  const value = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? (row.payload as Record<string, Json>)[key] : undefined;
  return typeof value === "string" ? value : undefined;
}

function payloadNumber(row: CloudRow, key: string): number | undefined {
  const value = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? (row.payload as Record<string, Json>)[key] : undefined;
  return typeof value === "number" ? value : undefined;
}

function cloudSignature(row: CloudRow): string {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, Json> : {};
  return signature(row.state as FirstBatchState, payload);
}

function asSnapshot(value: { client_updated_at: string; version: number; source_device_id: string | null; deleted_at?: string | null }): { updatedAt: string; version: number; deviceId: string; deletedAt?: string | null } {
  return { updatedAt: value.client_updated_at, version: value.version, deviceId: value.source_device_id ?? "cloud", deletedAt: value.deleted_at ?? null };
}

function normalizeStatus(row: CloudRow): WatchRecord | null {
  const mediaId = payloadString(row, "mediaId") ?? row.entity_id;
  if (row.state !== "want" && row.state !== "completed") return null;
  const record: WatchRecord = { mediaId, status: row.state === "completed" ? "watched" : "want" };
  const rating = payloadNumber(row, "rating");
  const watchedAt = payloadString(row, "watchedAt");
  const note = payloadString(row, "note");
  if (rating !== undefined) record.rating = rating;
  if (watchedAt) record.watchedAt = watchedAt;
  if (note) record.note = note;
  return record;
}

function mergeMovies(rows: CloudRow[]): void {
  const current = readMoviesTvState();
  const next: MoviesTvState = { favoriteIds: [...current.favoriteIds], watchRecords: [...current.watchRecords] };
  for (const row of rows) {
    if (row.item_type === "favorite") {
      next.favoriteIds = row.deleted_at ? next.favoriteIds.filter((id) => id !== row.entity_id) : [...new Set([...next.favoriteIds, row.entity_id])];
      continue;
    }
    if (row.item_type !== "status") continue;
    const index = next.watchRecords.findIndex((record) => record.mediaId === row.entity_id);
    if (row.deleted_at) {
      if (index >= 0) next.watchRecords.splice(index, 1);
      continue;
    }
    const record = normalizeStatus(row);
    if (!record) continue;
    if (index >= 0) next.watchRecords[index] = record;
    else next.watchRecords.push(record);
  }
  if (JSON.stringify(current) !== JSON.stringify(next)) writeMoviesTvState(next);
}

function mergeFood(rows: CloudRow[]): void {
  const current = loadFoodState();
  const next: FoodDiscoveryState = { ...current, favoriteRestaurantIds: [...current.favoriteRestaurantIds], restaurants: [...current.restaurants], visits: [...current.visits] };
  for (const row of rows) {
    if (row.item_type === "favorite") {
      next.favoriteRestaurantIds = row.deleted_at ? next.favoriteRestaurantIds.filter((id) => id !== row.entity_id) : [...new Set([...next.favoriteRestaurantIds, row.entity_id])];
      continue;
    }
    if (row.item_type !== "status") continue;
    const restaurant = next.restaurants.find((item) => item.id === row.entity_id);
    if (!restaurant) continue;
    if (row.deleted_at) {
      if (restaurant.status === "want" || restaurant.status === "visited") restaurant.status = "considering";
      continue;
    }
    if (row.state === "want" || row.state === "visited") restaurant.status = row.state;
  }
  if (JSON.stringify(current) !== JSON.stringify(next)) saveFoodState(next);
}

function mergeNews(rows: CloudRow[]): void {
  const current = loadNewsState();
  const next = { ...current, favorites: [...current.favorites] };
  for (const row of rows) {
    const index = next.favorites.findIndex((article) => article.id === row.entity_id);
    if (row.deleted_at) {
      if (index >= 0) next.favorites.splice(index, 1);
      continue;
    }
    const article: NewsSavedArticle = {
      id: row.entity_id,
      originalTitle: payloadString(row, "title") ?? "已收藏新闻",
      sourceName: payloadString(row, "sourceName") ?? "未知来源",
      articleUrl: payloadString(row, "articleUrl") ?? "",
      publishedAt: payloadString(row, "publishedAt") ?? row.client_updated_at,
      description: payloadString(row, "description"),
      savedAt: payloadString(row, "savedAt") ?? row.client_updated_at,
    };
    if (index >= 0) next.favorites[index] = article;
    else next.favorites.push(article);
  }
  if (JSON.stringify(current.favorites) !== JSON.stringify(next.favorites)) saveNewsState(next);
}

function mergeTrendLife(rows: CloudRow[]): void {
  const current = readTrendLifeState();
  const next: TrendLifeState = { ...current, favoriteIds: [...current.favoriteIds], favoriteBrandIds: [...current.favoriteBrandIds], favoriteThemeIds: [...current.favoriteThemeIds], historyIds: [...current.historyIds], historyBrandIds: [...current.historyBrandIds] };
  for (const row of rows) {
    const kind = payloadString(row, "entityKind") ?? row.entity_id.split(":")[0];
    const id = payloadString(row, "itemId") ?? payloadString(row, "brandId") ?? payloadString(row, "themeId") ?? row.entity_id.split(":").slice(1).join(":");
    if (!id) continue;
    const target = kind === "brand" ? next.favoriteBrandIds : kind === "theme" ? next.favoriteThemeIds : next.favoriteIds;
    if (row.deleted_at) {
      const index = target.indexOf(id);
      if (index >= 0) target.splice(index, 1);
    } else if (!target.includes(id)) target.push(id);
  }
  if (JSON.stringify(current) !== JSON.stringify(next)) writeTrendLifeState(next);
}

function mergeRows(rows: CloudRow[]): void {
  mergeMovies(rows.filter((row) => row.module === "movies-tv"));
  mergeFood(rows.filter((row) => row.module === "food"));
  mergeNews(rows.filter((row) => row.module === "news"));
  mergeTrendLife(rows.filter((row) => row.module === "trend-life"));
}

export async function pullAndMergeFirstBatch(client: SupabaseClient<Database>, userId: string): Promise<CloudRow[]> {
  const { data, error } = await client.from("user_data_items").select("*").eq("user_id", userId).in("module", [...FIRST_BATCH_MODULES]);
  if (error) throw new Error("云端资料暂时无法读取。");
  const rows = (data ?? []) as CloudRow[];
  const metadata = readMetadata();
  const local = new Map(scanLocalFirstBatchRecords().map((record) => [record.key, record]));
  const applicable: CloudRow[] = [];
  for (const row of rows) {
    const key = recordKey(row.module as FirstBatchSyncModule, row.item_type as FirstBatchItemType, row.entity_id);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(asSnapshot(row), { updatedAt: previous.updatedAt, version: previous.version, deviceId: previous.deviceId, deletedAt: previous.deletedAt }) < 0) continue;
    if (!previous && local.has(key) && !row.deleted_at) continue;
    applicable.push(row);
  }
  mergeRows(applicable);
  if (applicable.length > 0) notifyFirstBatchRemoteMerged();
  const afterLocal = new Map(scanLocalFirstBatchRecords().map((record) => [record.key, record]));
  for (const row of rows) {
    const key = recordKey(row.module as FirstBatchSyncModule, row.item_type as FirstBatchItemType, row.entity_id);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(asSnapshot(row), { updatedAt: previous.updatedAt, version: previous.version, deviceId: previous.deviceId, deletedAt: previous.deletedAt }) < 0) continue;
    const localRecord = afterLocal.get(key);
    metadata[key] = {
      module: row.module as FirstBatchSyncModule,
      itemType: row.item_type as FirstBatchItemType,
      entityId: row.entity_id,
      state: row.state as FirstBatchState,
      signature: localRecord ? signature(localRecord.state, localRecord.payload) : cloudSignature(row),
      sourceStorageKey: localRecord?.sourceStorageKey ?? row.source_storage_key,
      updatedAt: row.client_updated_at,
      version: row.version,
      deviceId: row.source_device_id ?? "cloud",
      deletedAt: row.deleted_at,
      localPresence: Boolean(localRecord),
    };
  }
  writeMetadata(metadata);
  return rows;
}

export function enqueueLocalFirstBatchChanges(deviceId: string): number {
  const local = new Map(scanLocalFirstBatchRecords().map((record) => [record.key, record]));
  const metadata = readMetadata();
  let queued = 0;
  for (const record of local.values()) {
    const previous = metadata[record.key];
    const nextSignature = signature(record.state, record.payload);
    if (previous && !previous.deletedAt && previous.signature === nextSignature) {
      previous.localPresence = true;
      continue;
    }
    const next: MetadataRecord = {
      module: record.module,
      itemType: record.itemType,
      entityId: record.entityId,
      state: record.state,
      signature: nextSignature,
      sourceStorageKey: record.sourceStorageKey,
      updatedAt: new Date().toISOString(),
      version: (previous?.version ?? 0) + 1,
      deviceId,
      deletedAt: null,
      localPresence: true,
    };
    metadata[record.key] = next;
    enqueueSyncOperation({ module: record.module, itemType: record.itemType, entityId: record.entityId, operation: "upsert", state: record.state, payload: record.payload, sourceStorageKey: record.sourceStorageKey, deletedAt: null, version: next.version, deviceId, updatedAt: next.updatedAt });
    queued += 1;
  }
  for (const previous of Object.values(metadata)) {
    const key = recordKey(previous.module, previous.itemType, previous.entityId);
    if (!previous.localPresence || local.has(key) || previous.deletedAt) continue;
    const updatedAt = new Date().toISOString();
    const nextVersion = previous.version + 1;
    metadata[key] = { ...previous, updatedAt, version: nextVersion, deviceId, deletedAt: updatedAt, localPresence: false };
    enqueueSyncOperation({ module: previous.module, itemType: previous.itemType, entityId: previous.entityId, operation: "delete", state: previous.state, payload: null, sourceStorageKey: previous.sourceStorageKey, deletedAt: updatedAt, version: nextVersion, deviceId, updatedAt });
    queued += 1;
  }
  writeMetadata(metadata);
  return queued;
}

async function pushOne(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  if (!item.itemType || !item.state) return false;
  const { data: existing, error: readError } = await client.from("user_data_items").select("*").eq("user_id", userId).eq("module", item.module).eq("item_type", item.itemType).eq("entity_id", item.entityId).maybeSingle();
  if (readError) throw new Error("云端资料暂时无法比较版本。");
  if (existing && compareVersionedSnapshots(asSnapshot(existing as CloudRow), { updatedAt: item.updatedAt, version: item.version, deviceId: item.deviceId, deletedAt: item.deletedAt }) > 0) return true;
  const row: Database["public"]["Tables"]["user_data_items"]["Insert"] = {
    user_id: userId,
    module: item.module,
    item_type: item.itemType,
    entity_id: item.entityId,
    state: item.state,
    payload: (item.payload ?? {}) as Json,
    source_storage_key: item.sourceStorageKey ?? "first-batch",
    source_device_id: item.deviceId,
    version: item.version,
    client_updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
  const { error } = await client.from("user_data_items").upsert(row, { onConflict: "user_id,module,item_type,entity_id" });
  if (error) throw new Error("云端资料暂时无法保存。");
  return true;
}

export async function pushFirstBatchQueue(client: SupabaseClient<Database>, userId: string): Promise<{ uploaded: number; failed: number }> {
  const queue = readSyncQueue();
  let uploaded = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      if (await pushOne(client, userId, item)) {
        uploaded += 1;
        removeSyncOperations([item.id]);
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { uploaded, failed };
}

export type FirstBatchSyncResult = { queueSize: number; failed: number };

export async function runFirstBatchSyncCycle(client: SupabaseClient<Database>, userId: string, deviceId: string, allowLocalUpload: boolean): Promise<FirstBatchSyncResult> {
  if (!isNetworkOnline()) throw new Error("当前处于离线状态。");
  if (allowLocalUpload) enqueueLocalFirstBatchChanges(deviceId);
  const pushed = allowLocalUpload ? await pushFirstBatchQueue(client, userId) : { uploaded: 0, failed: 0 };
  await pullAndMergeFirstBatch(client, userId);
  return { queueSize: readSyncQueue().length, failed: pushed.failed };
}

export function isFirstBatchUploadBlocked(userId: string): boolean {
  return !hasCompletedFirstBatchMigration(userId) && scanLocalFirstBatchRecords().length > 0;
}
