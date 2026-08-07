export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "failed";

export type SyncCloudState = "unknown" | "connected" | "unavailable";

export type SyncOperation = "upsert" | "delete";

export type SyncQueueItem = {
  id: string;
  module: string;
  entityId: string;
  itemType?: "favorite" | "status";
  operation: SyncOperation;
  state?: "favorite" | "completed" | "want" | "visited";
  payload?: Record<string, unknown> | null;
  sourceStorageKey?: string;
  deletedAt?: string | null;
  version: number;
  deviceId: string;
  updatedAt: string;
  enqueuedAt: string;
};

export type SyncState = {
  status: SyncStatus;
  online: boolean;
  cloud: SyncCloudState;
  queueSize: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type SyncStatusController = SyncState & {
  retry: () => Promise<void>;
};

export type VersionedSnapshot = {
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt?: string | null;
};
