"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthAccount } from "@/features/auth/types";
import { FIRST_BATCH_MIGRATION_COMPLETED_EVENT, FIRST_BATCH_STORAGE_CHANGED_EVENT } from "./events";
import { isNetworkOnline } from "./network";
import { readSyncQueue, readSyncState, writeSyncState } from "./storage";
import { enqueueLocalFirstBatchChanges, isFirstBatchUploadBlocked, runFirstBatchSyncCycle } from "./firstBatch";

type ClientState = { client: ReturnType<typeof createSupabaseBrowserClient> | null; error: string | null };

function setSharedSyncState(patch: Partial<ReturnType<typeof readSyncState>>): void {
  const current = readSyncState();
  writeSyncState({ ...current, ...patch, queueSize: readSyncQueue().length });
}

export function useFirstBatchSync(account: AuthAccount | null, routeKey?: string): { runSyncCycle: () => Promise<void> } {
  const [{ client, error: clientError }] = React.useState<ClientState>(() => {
    try {
      return { client: createSupabaseBrowserClient(), error: null };
    } catch {
      return { client: null, error: "云同步配置暂时不可用。" };
    }
  });
  const accountId = account?.user.id ?? null;
  const deviceId = account?.currentDeviceId ?? null;
  const inFlightRef = React.useRef<Promise<void> | null>(null);
  const applyingRemoteRef = React.useRef(false);
  const blockedRef = React.useRef(false);
  const sessionRef = React.useRef<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const runSyncCycle = React.useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    const run = (async () => {
      if (!accountId || !deviceId) {
        setSharedSyncState({ status: "pending", cloud: "unknown", online: isNetworkOnline(), lastError: null });
        return;
      }
      if (!client) {
        setSharedSyncState({ status: "failed", cloud: "unavailable", lastError: clientError ?? "云同步配置暂时不可用。" });
        return;
      }
      if (!isNetworkOnline()) {
        if (!blockedRef.current) enqueueLocalFirstBatchChanges(deviceId);
        setSharedSyncState({ status: "offline", online: false, lastError: null });
        return;
      }
      setSharedSyncState({ status: "syncing", online: true, cloud: "unknown", lastError: null });
      applyingRemoteRef.current = true;
      try {
        const result = await runFirstBatchSyncCycle(client, accountId, deviceId, !blockedRef.current);
        setSharedSyncState({ status: result.queueSize ? "pending" : "synced", online: true, cloud: "connected", lastSyncedAt: result.queueSize ? readSyncState().lastSyncedAt : new Date().toISOString(), lastError: result.failed ? "部分资料等待下一次联网重试。" : null });
      } catch (error) {
        setSharedSyncState({ status: "failed", online: true, cloud: "unavailable", lastError: error instanceof Error ? error.message : "云同步暂时失败，请稍后重试。" });
      } finally {
        applyingRemoteRef.current = false;
      }
    })();
    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [accountId, client, clientError, deviceId]);

  React.useEffect(() => {
    const nextSession = accountId && deviceId ? `${accountId}:${deviceId}` : null;
    if (sessionRef.current !== nextSession) {
      sessionRef.current = nextSession;
      blockedRef.current = accountId ? isFirstBatchUploadBlocked(accountId) : false;
    }
    void runSyncCycle();
  }, [accountId, deviceId, routeKey, runSyncCycle]);

  React.useEffect(() => {
    const schedule = () => {
      if (applyingRemoteRef.current) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void runSyncCycle();
      }, 250);
    };
    const handleStorageChanged = () => schedule();
    const handleMigrationCompleted = () => {
      blockedRef.current = false;
      void runSyncCycle();
    };
    const handleOnline = () => void runSyncCycle();
    const handleOffline = () => setSharedSyncState({ status: "offline", online: false, lastError: null });
    const handleFocus = () => void runSyncCycle();
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void runSyncCycle(); };
    window.addEventListener(FIRST_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(FIRST_BATCH_MIGRATION_COMPLETED_EVENT, handleMigrationCompleted);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(FIRST_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(FIRST_BATCH_MIGRATION_COMPLETED_EVENT, handleMigrationCompleted);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [runSyncCycle]);

  return { runSyncCycle };
}
