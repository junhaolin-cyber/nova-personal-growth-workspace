export const FIRST_BATCH_STORAGE_CHANGED_EVENT = "nova:first-batch-storage-changed";
export const FIRST_BATCH_REMOTE_MERGED_EVENT = "nova:first-batch-remote-merged";
export const FIRST_BATCH_MIGRATION_COMPLETED_EVENT = "nova:first-batch-migration-completed";
export const SYNC_STATE_CHANGED_EVENT = "nova:sync-state-changed";

export type FirstBatchStorageModule = "movies-tv" | "food" | "news" | "trend-life";

export function notifyFirstBatchStorageChanged(module: FirstBatchStorageModule): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FIRST_BATCH_STORAGE_CHANGED_EVENT, { detail: { module } }));
}

export function notifyFirstBatchRemoteMerged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FIRST_BATCH_REMOTE_MERGED_EVENT));
}

export function notifyFirstBatchMigrationCompleted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FIRST_BATCH_MIGRATION_COMPLETED_EVENT));
}
