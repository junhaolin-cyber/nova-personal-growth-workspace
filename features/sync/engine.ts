import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isNetworkOnline } from "./network";
import { readSyncQueue, writeSyncQueue } from "./storage";
import type { SyncOperation, SyncQueueItem } from "./types";

export type CloudConnectionResult = {
  connected: boolean;
  error: string | null;
};

export type SyncTransport = {
  push: (items: readonly SyncQueueItem[]) => Promise<{ uploadedIds: string[] }>;
};

function createQueueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function enqueueSyncOperation(input: Omit<SyncQueueItem, "id" | "enqueuedAt">): SyncQueueItem[] {
  const nextItem: SyncQueueItem = { ...input, id: createQueueId(), enqueuedAt: new Date().toISOString() };
  const queue = readSyncQueue().filter((item) => !(item.module === input.module && item.entityId === input.entityId && item.itemType === input.itemType));
  const nextQueue = [...queue, nextItem];
  writeSyncQueue(nextQueue);
  return nextQueue;
}

export function removeSyncOperations(ids: readonly string[]): SyncQueueItem[] {
  const idSet = new Set(ids);
  const nextQueue = readSyncQueue().filter((item) => !idSet.has(item.id));
  writeSyncQueue(nextQueue);
  return nextQueue;
}

export async function verifyCloudConnection(client: SupabaseClient<Database>, userId: string): Promise<CloudConnectionResult> {
  if (!isNetworkOnline()) return { connected: false, error: "当前处于离线状态。" };
  const { error } = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  return error ? { connected: false, error: "云端连接暂时不可用，请稍后重试。" } : { connected: true, error: null };
}

export async function flushSyncQueue(transport: SyncTransport | null): Promise<{ uploaded: number; remaining: number }> {
  const queue = readSyncQueue();
  if (!queue.length || !transport) return { uploaded: 0, remaining: queue.length };

  const result = await transport.push(queue);
  removeSyncOperations(result.uploadedIds);
  return { uploaded: result.uploadedIds.length, remaining: readSyncQueue().length };
}

export function getQueueOperation(module: string, entityId: string, operation: SyncOperation, version: number, deviceId: string, updatedAt: string): Omit<SyncQueueItem, "id" | "enqueuedAt"> {
  return { module, entityId, operation, version, deviceId, updatedAt };
}
