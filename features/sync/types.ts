export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "failed";

export type SyncCloudState = "unknown" | "connected" | "unavailable";

export type SyncOperation = "upsert" | "delete";

export type SyncItemType = "favorite" | "status" | "task" | "exercise-type" | "exercise-record"
  | "english-settings" | "english-word-progress" | "english-daily-plan" | "english-learning-record" | "english-recommendation"
  | "speaking-settings" | "speaking-session" | "speaking-expression" | "speaking-draft";
export type SyncItemState = "favorite" | "completed" | "want" | "visited" | "active";

export type SyncQueueItem = {
  id: string;
  module: string;
  entityId: string;
  itemType?: SyncItemType;
  operation: SyncOperation;
  state?: SyncItemState;
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
