import type { FirstBatchItem } from "./types";
import { FIRST_BATCH_MIGRATION_KEY } from "./types";

export const FIRST_BATCH_STATE_STORAGE_KEY = "nova:migration:first-batch-state:v1";
const FIRST_BATCH_BACKUP_PREFIX = "nova:migration:first-batch-backup:v1:";

type StoredMigrationState = {
  userId: string;
  migrationKey: string;
  status: "completed";
  itemCount: number;
  backupKey: string;
  completedAt: string;
};

type StoredStateMap = Record<string, StoredMigrationState>;

function readStateMap(): StoredStateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FIRST_BATCH_STATE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed as StoredStateMap : {};
  } catch {
    return {};
  }
}

function writeStateMap(state: StoredStateMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_BATCH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 迁移标记不可用时不触碰任何业务数据。
  }
}

export function hasCompletedFirstBatchMigration(userId: string): boolean {
  const state = readStateMap()[userId];
  return state?.migrationKey === FIRST_BATCH_MIGRATION_KEY && state.status === "completed";
}

export function createFirstBatchBackup(userId: string, deviceId: string, items: FirstBatchItem[]): string | null {
  if (typeof window === "undefined") return null;
  const key = `${FIRST_BATCH_BACKUP_PREFIX}${userId}`;
  try {
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, JSON.stringify({ version: 1, migrationKey: FIRST_BATCH_MIGRATION_KEY, userId, deviceId, createdAt: new Date().toISOString(), items }));
    }
    return key;
  } catch {
    return null;
  }
}

export function markFirstBatchMigrationCompleted(userId: string, itemCount: number, backupKey: string): void {
  const next = readStateMap();
  next[userId] = { userId, migrationKey: FIRST_BATCH_MIGRATION_KEY, status: "completed", itemCount, backupKey, completedAt: new Date().toISOString() };
  writeStateMap(next);
}
