"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { loadExerciseData, saveExerciseData, EXERCISE_STORAGE_KEYS } from "@/features/exercise/storage";
import type { ExerciseData, ExerciseRecord, ExerciseType } from "@/features/exercise/types";
import { loadTasks, saveTasks, TASKS_STORAGE_KEY } from "@/features/today/storage";
import type { PlanTask, TaskPriority } from "@/features/today/types";
import { notifySecondBatchRemoteMerged } from "./events";
import { enqueueSyncOperation, removeSyncOperations } from "./engine";
import { compareVersionedSnapshots } from "./conflict";
import { isNetworkOnline } from "./network";
import { readSyncQueue } from "./storage";
import type { SyncQueueItem } from "./types";

export const SECOND_BATCH_MODULES = ["today", "exercise"] as const;
export type SecondBatchModule = (typeof SECOND_BATCH_MODULES)[number];
export type SecondBatchItemType = "task" | "exercise-type" | "exercise-record";

type SecondBatchRow =
  | Database["public"]["Tables"]["plan_tasks"]["Row"]
  | Database["public"]["Tables"]["exercise_types"]["Row"]
  | Database["public"]["Tables"]["exercise_records"]["Row"];

type LocalRecord = {
  key: string;
  module: SecondBatchModule;
  itemType: SecondBatchItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  clientUpdatedAt?: string;
};

type MetadataRecord = {
  module: SecondBatchModule;
  itemType: SecondBatchItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  signature: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt: string | null;
  localPresence: boolean;
};

type MetadataMap = Record<string, MetadataRecord>;

const META_STORAGE_KEY = "nova:sync:second-batch-metadata:v1";

function recordKey(module: SecondBatchModule, itemType: SecondBatchItemType, entityId: string): string {
  return `${module}:${itemType}:${entityId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMetadata(): MetadataMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!isObject(parsed)) return {};
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
    // Sync metadata is optional; business data remains in its module storage.
  }
}

function signature(payload: Record<string, Json>): string {
  return JSON.stringify(payload);
}

function createLocalRecord(module: SecondBatchModule, itemType: SecondBatchItemType, entityId: string, payload: Record<string, Json>, sourceStorageKey: string, clientCreatedAt: string, clientUpdatedAt?: string): LocalRecord {
  return { key: recordKey(module, itemType, entityId), module, itemType, entityId, payload, sourceStorageKey, clientCreatedAt, clientUpdatedAt };
}

function scanTasks(): LocalRecord[] {
  return loadTasks().map((task) => createLocalRecord("today", "task", task.id, {
    title: task.title,
    taskDate: task.date,
    taskTime: task.time || null,
    priority: task.priority,
    category: task.category,
    notes: task.notes,
    completed: task.completed,
    completedAt: task.completedAt ?? null,
  }, TASKS_STORAGE_KEY, new Date().toISOString()));
}

function scanExercise(): LocalRecord[] {
  const data = loadExerciseData();
  const types = data.types.map((type) => createLocalRecord("exercise", "exercise-type", type.id, {
    name: type.name,
    icon: type.icon,
    sortOrder: type.sortOrder,
    isFavorite: type.isFavorite,
    isActive: type.isActive,
  }, EXERCISE_STORAGE_KEYS.types, type.createdAt, type.updatedAt));
  const records = data.records.map((record) => createLocalRecord("exercise", "exercise-record", record.id, {
    typeLocalId: record.typeId,
    exerciseDate: record.exerciseDate,
    startTime: record.startTime ?? null,
    durationMinutes: record.durationMinutes,
    location: record.location ?? null,
    intensity: record.intensity ?? null,
    feeling: record.feeling ?? null,
    note: record.note ?? null,
    imageUrl: record.imageUrl ?? null,
  }, EXERCISE_STORAGE_KEYS.records, record.createdAt, record.updatedAt));
  return [...types, ...records];
}

export function scanLocalSecondBatchRecords(): LocalRecord[] {
  return [...scanTasks(), ...scanExercise()];
}

function payloadString(payload: Record<string, Json> | null | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function payloadNumber(payload: Record<string, Json> | null | undefined, key: string): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" ? value : undefined;
}

function payloadBoolean(payload: Record<string, Json> | null | undefined, key: string): boolean | undefined {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function payloadRecord(row: SecondBatchRow): Record<string, Json> {
  if ("task_date" in row) return {
    title: row.title,
    taskDate: row.task_date,
    taskTime: row.task_time ?? null,
    priority: row.priority,
    category: row.category,
    notes: row.notes,
    completed: row.completed,
    completedAt: row.completed_at ?? null,
  };
  if ("sort_order" in row) return {
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    isFavorite: row.is_favorite,
    isActive: row.is_active,
  };
  return {
    typeLocalId: row.type_local_id,
    exerciseDate: row.exercise_date,
    startTime: row.start_time ?? null,
    durationMinutes: row.duration_minutes,
    location: row.location ?? null,
    intensity: row.intensity ?? null,
    feeling: row.feeling ?? null,
    note: row.note ?? null,
    imageUrl: row.image_url ?? null,
  };
}

function rowKey(row: SecondBatchRow): string {
  if ("task_date" in row) return recordKey("today", "task", row.local_id);
  if ("sort_order" in row) return recordKey("exercise", "exercise-type", row.local_id);
  return recordKey("exercise", "exercise-record", row.local_id);
}

function rowSource(row: SecondBatchRow): { module: SecondBatchModule; itemType: SecondBatchItemType; sourceStorageKey: string } {
  if ("task_date" in row) return { module: "today", itemType: "task", sourceStorageKey: row.source_storage_key };
  if ("sort_order" in row) return { module: "exercise", itemType: "exercise-type", sourceStorageKey: row.source_storage_key };
  return { module: "exercise", itemType: "exercise-record", sourceStorageKey: row.source_storage_key };
}

function rowSnapshot(row: SecondBatchRow) {
  return { updatedAt: row.client_updated_at, version: row.version, deviceId: row.source_device_id ?? "cloud", deletedAt: row.deleted_at };
}

function taskFromRow(row: Database["public"]["Tables"]["plan_tasks"]["Row"]): PlanTask {
  return {
    id: row.local_id,
    title: row.title,
    date: row.task_date,
    time: row.task_time ? row.task_time.slice(0, 5) : "",
    priority: row.priority as TaskPriority,
    category: row.category,
    notes: row.notes,
    completed: row.completed,
    completedAt: row.completed_at ?? undefined,
  };
}

function exerciseTypeFromRow(row: Database["public"]["Tables"]["exercise_types"]["Row"]): ExerciseType {
  return {
    id: row.local_id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    isFavorite: row.is_favorite,
    isActive: row.is_active,
    createdAt: row.client_created_at,
    updatedAt: row.client_updated_at,
  };
}

function exerciseRecordFromRow(row: Database["public"]["Tables"]["exercise_records"]["Row"]): ExerciseRecord {
  return {
    id: row.local_id,
    typeId: row.type_local_id,
    exerciseDate: row.exercise_date,
    startTime: row.start_time ? row.start_time.slice(0, 5) : undefined,
    durationMinutes: row.duration_minutes,
    location: row.location ?? undefined,
    intensity: row.intensity as ExerciseRecord["intensity"],
    feeling: row.feeling as ExerciseRecord["feeling"],
    note: row.note ?? undefined,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.client_created_at,
    updatedAt: row.client_updated_at,
  };
}

function mergeTasks(rows: Array<Database["public"]["Tables"]["plan_tasks"]["Row"]>): void {
  const current = loadTasks();
  const byId = new Map(current.map((task) => [task.id, task]));
  rows.forEach((row) => { if (row.deleted_at) byId.delete(row.local_id); else byId.set(row.local_id, taskFromRow(row)); });
  const next = Array.from(byId.values());
  if (JSON.stringify(current) !== JSON.stringify(next)) saveTasks(next);
}

function mergeExercise(rows: Array<Database["public"]["Tables"]["exercise_types"]["Row"]>, records: Array<Database["public"]["Tables"]["exercise_records"]["Row"]>): void {
  const current = loadExerciseData();
  const types = new Map(current.types.map((type) => [type.id, type]));
  const recordMap = new Map(current.records.map((record) => [record.id, record]));
  rows.forEach((row) => { if (row.deleted_at) types.delete(row.local_id); else types.set(row.local_id, exerciseTypeFromRow(row)); });
  records.forEach((row) => { if (row.deleted_at) recordMap.delete(row.local_id); else recordMap.set(row.local_id, exerciseRecordFromRow(row)); });
  const next: ExerciseData = { ...current, types: Array.from(types.values()), records: Array.from(recordMap.values()) };
  if (JSON.stringify(current.types) !== JSON.stringify(next.types) || JSON.stringify(current.records) !== JSON.stringify(next.records)) saveExerciseData(next);
}

export async function pullAndMergeSecondBatch(client: SupabaseClient<Database>, userId: string): Promise<number> {
  const [tasksResult, typesResult, recordsResult] = await Promise.all([
    client.from("plan_tasks").select("*").eq("user_id", userId),
    client.from("exercise_types").select("*").eq("user_id", userId),
    client.from("exercise_records").select("*").eq("user_id", userId),
  ]);
  if (tasksResult.error || typesResult.error || recordsResult.error) throw new Error("第二批云端资料暂时无法读取，请稍后重试。");

  const rows: SecondBatchRow[] = [...(tasksResult.data ?? []), ...(typesResult.data ?? []), ...(recordsResult.data ?? [])];
  const metadata = readMetadata();
  const local = new Map(scanLocalSecondBatchRecords().map((record) => [record.key, record]));
  const applicable: SecondBatchRow[] = [];
  const skippedLocalKeys = new Set<string>();
  rows.forEach((row) => {
    const key = rowKey(row);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(row), previous) < 0) return;
    if (!previous && local.has(key) && !row.deleted_at) {
      skippedLocalKeys.add(key);
      return;
    }
    applicable.push(row);
  });

  mergeTasks(applicable.filter((row): row is Database["public"]["Tables"]["plan_tasks"]["Row"] => "task_date" in row));
  mergeExercise(
    applicable.filter((row): row is Database["public"]["Tables"]["exercise_types"]["Row"] => "sort_order" in row),
    applicable.filter((row): row is Database["public"]["Tables"]["exercise_records"]["Row"] => "exercise_date" in row && !("task_date" in row) && !("sort_order" in row)),
  );
  if (applicable.length > 0) notifySecondBatchRemoteMerged();

  const afterLocal = new Map(scanLocalSecondBatchRecords().map((record) => [record.key, record]));
  rows.forEach((row) => {
    const key = rowKey(row);
    if (skippedLocalKeys.has(key)) return;
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(row), previous) < 0) return;
    const source = rowSource(row);
    const localRecord = afterLocal.get(key);
    metadata[key] = {
      module: source.module,
      itemType: source.itemType,
      entityId: row.local_id,
      payload: localRecord?.payload ?? payloadRecord(row),
      sourceStorageKey: localRecord?.sourceStorageKey ?? source.sourceStorageKey,
      clientCreatedAt: localRecord?.clientCreatedAt ?? ("client_created_at" in row ? row.client_created_at : new Date().toISOString()),
      signature: localRecord ? signature(localRecord.payload) : signature(payloadRecord(row)),
      updatedAt: row.client_updated_at,
      version: row.version,
      deviceId: row.source_device_id ?? "cloud",
      deletedAt: row.deleted_at,
      localPresence: Boolean(localRecord),
    };
  });
  writeMetadata(metadata);
  return applicable.length;
}

export function enqueueLocalSecondBatchChanges(deviceId: string): number {
  const local = new Map(scanLocalSecondBatchRecords().map((record) => [record.key, record]));
  const metadata = readMetadata();
  let queued = 0;
  local.forEach((record) => {
    const previous = metadata[record.key];
    const nextSignature = signature(record.payload);
    if (previous && !previous.deletedAt && previous.signature === nextSignature) {
      previous.localPresence = true;
      return;
    }
    const updatedAt = record.clientUpdatedAt ?? new Date().toISOString();
    const nextVersion = (previous?.version ?? 0) + 1;
    metadata[record.key] = {
      module: record.module,
      itemType: record.itemType,
      entityId: record.entityId,
      payload: record.payload,
      sourceStorageKey: record.sourceStorageKey,
      clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt,
      signature: nextSignature,
      updatedAt,
      version: nextVersion,
      deviceId,
      deletedAt: null,
      localPresence: true,
    };
    enqueueSyncOperation({ module: record.module, itemType: record.itemType, entityId: record.entityId, operation: "upsert", payload: { ...record.payload, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt }, sourceStorageKey: record.sourceStorageKey, deletedAt: null, version: nextVersion, deviceId, updatedAt });
    queued += 1;
  });
  Object.values(metadata).forEach((previous) => {
    const key = recordKey(previous.module, previous.itemType, previous.entityId);
    if (!previous.localPresence || local.has(key) || previous.deletedAt) return;
    const deletedAt = new Date().toISOString();
    const nextVersion = previous.version + 1;
    metadata[key] = { ...previous, updatedAt: deletedAt, version: nextVersion, deviceId, deletedAt, localPresence: false };
    enqueueSyncOperation({ module: previous.module, itemType: previous.itemType, entityId: previous.entityId, operation: "delete", payload: { ...previous.payload, clientCreatedAt: previous.clientCreatedAt }, sourceStorageKey: previous.sourceStorageKey, deletedAt, version: nextVersion, deviceId, updatedAt: deletedAt });
    queued += 1;
  });
  writeMetadata(metadata);
  return queued;
}

function itemSnapshot(item: SyncQueueItem) {
  return { updatedAt: item.updatedAt, version: item.version, deviceId: item.deviceId, deletedAt: item.deletedAt ?? null };
}

function itemPayload(item: SyncQueueItem): Record<string, Json> {
  return (item.payload ?? {}) as Record<string, Json>;
}

async function pushTask(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  const { data: existing, error: readError } = await client.from("plan_tasks").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
  if (readError) throw new Error("今日计划云端版本暂时无法比较。");
  if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
  const payload = itemPayload(item);
  const fallback = existing ? payloadRecord(existing) : {};
  const row: Database["public"]["Tables"]["plan_tasks"]["Insert"] = {
    user_id: userId,
    local_id: item.entityId,
    source_device_id: item.deviceId,
    title: payloadString(payload, "title") ?? payloadString(fallback, "title") ?? "未命名任务",
    task_date: payloadString(payload, "taskDate") ?? payloadString(fallback, "taskDate") ?? new Date().toISOString().slice(0, 10),
    task_time: payloadString(payload, "taskTime") ?? payloadString(fallback, "taskTime") ?? null,
    priority: payloadString(payload, "priority") ?? payloadString(fallback, "priority") ?? "medium",
    category: payloadString(payload, "category") ?? payloadString(fallback, "category") ?? "其他",
    notes: payloadString(payload, "notes") ?? payloadString(fallback, "notes") ?? "",
    completed: payloadBoolean(payload, "completed") ?? payloadBoolean(fallback, "completed") ?? false,
    completed_at: payloadString(payload, "completedAt") ?? payloadString(fallback, "completedAt") ?? null,
    source_storage_key: item.sourceStorageKey ?? "nova:today-tasks:v1",
    version: item.version,
    client_created_at: payloadString(payload, "clientCreatedAt") ?? new Date().toISOString(),
    client_updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
  const { error } = await client.from("plan_tasks").upsert(row, { onConflict: "user_id,local_id" });
  if (error) throw new Error("今日计划云端保存失败。");
  return true;
}

async function pushExerciseType(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  const { data: existing, error: readError } = await client.from("exercise_types").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
  if (readError) throw new Error("运动类型云端版本暂时无法比较。");
  if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
  const payload = itemPayload(item);
  const fallback = existing ? payloadRecord(existing) : {};
  const row: Database["public"]["Tables"]["exercise_types"]["Insert"] = {
    user_id: userId,
    local_id: item.entityId,
    source_device_id: item.deviceId,
    name: payloadString(payload, "name") ?? payloadString(fallback, "name") ?? "未命名类型",
    icon: payloadString(payload, "icon") ?? payloadString(fallback, "icon") ?? "✓",
    sort_order: payloadNumber(payload, "sortOrder") ?? payloadNumber(fallback, "sortOrder") ?? 0,
    is_favorite: payloadBoolean(payload, "isFavorite") ?? payloadBoolean(fallback, "isFavorite") ?? false,
    is_active: payloadBoolean(payload, "isActive") ?? payloadBoolean(fallback, "isActive") ?? true,
    source_storage_key: item.sourceStorageKey ?? EXERCISE_STORAGE_KEYS.types,
    version: item.version,
    client_created_at: payloadString(payload, "clientCreatedAt") ?? new Date().toISOString(),
    client_updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
  const { error } = await client.from("exercise_types").upsert(row, { onConflict: "user_id,local_id" });
  if (error) throw new Error("运动类型云端保存失败。");
  return true;
}

async function pushExerciseRecord(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  const { data: existing, error: readError } = await client.from("exercise_records").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
  if (readError) throw new Error("运动记录云端版本暂时无法比较。");
  if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
  const payload = itemPayload(item);
  const fallback = existing ? payloadRecord(existing) : {};
  const row: Database["public"]["Tables"]["exercise_records"]["Insert"] = {
    user_id: userId,
    local_id: item.entityId,
    source_device_id: item.deviceId,
    type_local_id: payloadString(payload, "typeLocalId") ?? payloadString(fallback, "typeLocalId") ?? "exercise-type-unknown",
    exercise_date: payloadString(payload, "exerciseDate") ?? payloadString(fallback, "exerciseDate") ?? new Date().toISOString().slice(0, 10),
    start_time: payloadString(payload, "startTime") ?? payloadString(fallback, "startTime") ?? null,
    duration_minutes: payloadNumber(payload, "durationMinutes") ?? payloadNumber(fallback, "durationMinutes") ?? null,
    location: payloadString(payload, "location") ?? payloadString(fallback, "location") ?? null,
    intensity: payloadString(payload, "intensity") ?? payloadString(fallback, "intensity") ?? null,
    feeling: payloadString(payload, "feeling") ?? payloadString(fallback, "feeling") ?? null,
    note: payloadString(payload, "note") ?? payloadString(fallback, "note") ?? null,
    image_url: payloadString(payload, "imageUrl") ?? payloadString(fallback, "imageUrl") ?? null,
    source_storage_key: item.sourceStorageKey ?? EXERCISE_STORAGE_KEYS.records,
    version: item.version,
    client_created_at: payloadString(payload, "clientCreatedAt") ?? new Date().toISOString(),
    client_updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
  const { error } = await client.from("exercise_records").upsert(row, { onConflict: "user_id,local_id" });
  if (error) throw new Error("运动记录云端保存失败。");
  return true;
}

async function pushOne(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  if (item.module === "today" && item.itemType === "task") return pushTask(client, userId, item);
  if (item.module === "exercise" && item.itemType === "exercise-type") return pushExerciseType(client, userId, item);
  if (item.module === "exercise" && item.itemType === "exercise-record") return pushExerciseRecord(client, userId, item);
  return false;
}

export async function pushSecondBatchQueue(client: SupabaseClient<Database>, userId: string): Promise<{ uploaded: number; failed: number }> {
  const queue = readSyncQueue().filter((item) => SECOND_BATCH_MODULES.includes(item.module as SecondBatchModule));
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

export type SecondBatchSyncResult = { queueSize: number; failed: number };

export async function runSecondBatchSyncCycle(client: SupabaseClient<Database>, userId: string, deviceId: string): Promise<SecondBatchSyncResult> {
  if (!isNetworkOnline()) throw new Error("当前处于离线状态。");
  enqueueLocalSecondBatchChanges(deviceId);
  const pushed = await pushSecondBatchQueue(client, userId);
  await pullAndMergeSecondBatch(client, userId);
  return { queueSize: readSyncQueue().filter((item) => SECOND_BATCH_MODULES.includes(item.module as SecondBatchModule)).length, failed: pushed.failed };
}
