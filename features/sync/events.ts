export const FIRST_BATCH_STORAGE_CHANGED_EVENT = "nova:first-batch-storage-changed";
export const FIRST_BATCH_REMOTE_MERGED_EVENT = "nova:first-batch-remote-merged";
export const FIRST_BATCH_MIGRATION_COMPLETED_EVENT = "nova:first-batch-migration-completed";
export const FIRST_BATCH_SYNC_REQUESTED_EVENT = "nova:first-batch-sync-requested";
export const SYNC_STATE_CHANGED_EVENT = "nova:sync-state-changed";
export const SECOND_BATCH_STORAGE_CHANGED_EVENT = "nova:second-batch-storage-changed";
export const SECOND_BATCH_REMOTE_MERGED_EVENT = "nova:second-batch-remote-merged";
export const THIRD_BATCH_STORAGE_CHANGED_EVENT = "nova:third-batch-storage-changed";
export const THIRD_BATCH_REMOTE_MERGED_EVENT = "nova:third-batch-remote-merged";
export const FOURTH_BATCH_STORAGE_CHANGED_EVENT = "nova:fourth-batch-storage-changed";
export const FOURTH_BATCH_REMOTE_MERGED_EVENT = "nova:fourth-batch-remote-merged";

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

export function requestFirstBatchSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FIRST_BATCH_SYNC_REQUESTED_EVENT));
}

export function notifySecondBatchStorageChanged(module: "today" | "exercise"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SECOND_BATCH_STORAGE_CHANGED_EVENT, { detail: { module } }));
}

export function notifySecondBatchRemoteMerged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SECOND_BATCH_REMOTE_MERGED_EVENT));
}

export function notifyThirdBatchStorageChanged(module: "english" | "speaking"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THIRD_BATCH_STORAGE_CHANGED_EVENT, { detail: { module } }));
}

export function notifyThirdBatchRemoteMerged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THIRD_BATCH_REMOTE_MERGED_EVENT));
}

export function notifyFourthBatchStorageChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FOURTH_BATCH_STORAGE_CHANGED_EVENT));
}

export function notifyFourthBatchRemoteMerged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FOURTH_BATCH_REMOTE_MERGED_EVENT));
}
