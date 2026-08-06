import type { VersionedSnapshot } from "./types";

export function compareVersionedSnapshots(left: VersionedSnapshot, right: VersionedSnapshot): number {
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  if (leftTime !== rightTime) return leftTime - rightTime;
  if (left.version !== right.version) return left.version - right.version;
  return left.deviceId.localeCompare(right.deviceId);
}

export function resolveLastWriteWins<T>(local: T & VersionedSnapshot, remote: T & VersionedSnapshot): T & VersionedSnapshot {
  return compareVersionedSnapshots(local, remote) >= 0 ? local : remote;
}
