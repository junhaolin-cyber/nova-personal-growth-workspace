import type { SyncQueueItem, SyncState } from "./types";
import { SYNC_STATE_CHANGED_EVENT } from "./events";

export const SYNC_STATE_STORAGE_KEY = "nova:sync:framework-state:v1";
export const SYNC_QUEUE_STORAGE_KEY = "nova:sync:framework-queue:v1";

const DEFAULT_SYNC_STATE: SyncState = {
  status: "pending",
  online: true,
  cloud: "unknown",
  queueSize: 0,
  lastSyncedAt: null,
  lastError: null,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function readSyncState(): SyncState {
  const stored = readJson<Partial<SyncState>>(SYNC_STATE_STORAGE_KEY);
  if (!stored || typeof stored !== "object") return { ...DEFAULT_SYNC_STATE };

  const status = stored.status;
  const cloud = stored.cloud;
  return {
    ...DEFAULT_SYNC_STATE,
    ...stored,
    status: status === "synced" || status === "syncing" || status === "pending" || status === "offline" || status === "failed" ? status : DEFAULT_SYNC_STATE.status,
    cloud: cloud === "connected" || cloud === "unavailable" || cloud === "unknown" ? cloud : DEFAULT_SYNC_STATE.cloud,
    queueSize: typeof stored.queueSize === "number" && stored.queueSize >= 0 ? stored.queueSize : 0,
    online: typeof stored.online === "boolean" ? stored.online : true,
    lastSyncedAt: typeof stored.lastSyncedAt === "string" ? stored.lastSyncedAt : null,
    lastError: typeof stored.lastError === "string" ? stored.lastError : null,
  };
}

export function writeSyncState(state: SyncState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SYNC_STATE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(SYNC_STATE_CHANGED_EVENT));
  } catch {
    // 同步元数据不可用时不应阻塞现有业务页面。
  }
}

function isQueueItem(value: unknown): value is SyncQueueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SyncQueueItem>;
  return typeof item.id === "string"
    && typeof item.module === "string"
    && typeof item.entityId === "string"
    && (item.operation === "upsert" || item.operation === "delete")
    && typeof item.version === "number"
    && typeof item.deviceId === "string"
    && typeof item.updatedAt === "string"
    && typeof item.enqueuedAt === "string";
}

export function readSyncQueue(): SyncQueueItem[] {
  const stored = readJson<unknown>(SYNC_QUEUE_STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter(isQueueItem) : [];
}

export function writeSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // 队列写入失败时保留当前页面操作，不清理任何既有业务数据。
  }
}

export function getDefaultSyncState(): SyncState {
  return { ...DEFAULT_SYNC_STATE };
}
