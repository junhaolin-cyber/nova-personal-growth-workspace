/**
 * Shared domain contracts for future persistence, auth and sync layers.
 * The first phase still uses Mock Data and does not activate these services.
 */

export type EntityId = string;
export type UserId = string;
export type DeviceId = string;
export type ISODateString = string;

export type SyncState = "local" | "pending" | "synced" | "conflict";

export type SyncMetadata = {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  updatedByDeviceId?: DeviceId;
  version: number;
  syncState: SyncState;
};

export type BaseEntity = {
  id: EntityId;
  userId?: UserId;
  sync: SyncMetadata;
};

export type UserProfile = {
  id: UserId;
  displayName: string;
  avatarUrl?: string;
  preferredLocale: "zh-CN" | "en-US";
  timezone: string;
};

