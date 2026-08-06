import type { Json } from "@/lib/supabase/types";

export const FIRST_BATCH_MIGRATION_KEY = "first-user-data-v1";

export type FirstBatchModule = "movies-tv" | "food" | "news" | "trend-life";
export type FirstBatchItemType = "favorite" | "status";
export type FirstBatchState = "favorite" | "completed" | "want" | "visited";
export type FirstBatchMigrationStatus = "idle" | "ready" | "migrating" | "completed" | "failed";

export type FirstBatchItem = {
  module: FirstBatchModule;
  itemType: FirstBatchItemType;
  entityId: string;
  state: FirstBatchState;
  payload: Json;
  sourceStorageKey: string;
  version: number;
  clientUpdatedAt: string;
};

export type FirstBatchCounts = Record<FirstBatchModule, number>;

export type FirstBatchPreview = {
  items: FirstBatchItem[];
  counts: FirstBatchCounts;
  total: number;
};

export type FirstBatchMigrationResult = {
  processedCount: number;
  backupKey: string;
};

export type FirstBatchMigrationController = {
  preview: FirstBatchPreview | null;
  status: FirstBatchMigrationStatus;
  error: string | null;
  result: FirstBatchMigrationResult | null;
  confirm: () => Promise<void>;
  dismiss: () => void;
};
