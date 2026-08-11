"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthAccount } from "@/features/auth/types";
import { FIRST_BATCH_MIGRATION_COMPLETED_EVENT, FIRST_BATCH_STORAGE_CHANGED_EVENT, FIRST_BATCH_SYNC_REQUESTED_EVENT, SECOND_BATCH_STORAGE_CHANGED_EVENT, THIRD_BATCH_STORAGE_CHANGED_EVENT, FOURTH_BATCH_STORAGE_CHANGED_EVENT, FINAL_FINANCE_STORAGE_CHANGED_EVENT } from "./events";
import { isNetworkOnline } from "./network";
import { readSyncQueue, readSyncState, writeSyncState } from "./storage";
import { verifyCloudConnection } from "./engine";
import { enqueueLocalFirstBatchChanges, isFirstBatchUploadBlocked, runFirstBatchSyncCycle } from "./firstBatch";
import { enqueueLocalSecondBatchChanges, runSecondBatchSyncCycle } from "./secondBatch";
import { enqueueLocalThirdBatchChanges, runThirdBatchSyncCycle } from "./thirdBatch";
import { enqueueLocalFourthBatchChanges, runFourthBatchSyncCycle } from "./fourthBatch";
import { enqueueLocalFinalFinanceChanges, runFinalFinanceSyncCycle } from "./finalFinance";

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
        enqueueLocalSecondBatchChanges(deviceId);
        enqueueLocalThirdBatchChanges(deviceId);
        enqueueLocalFourthBatchChanges(deviceId);
        enqueueLocalFinalFinanceChanges(deviceId);
        setSharedSyncState({ status: "offline", online: false, lastError: null });
        return;
      }
      setSharedSyncState({ status: "syncing", online: true, cloud: "unknown", lastError: null });
      applyingRemoteRef.current = true;
      try {
        const connection = await verifyCloudConnection(client, accountId);
        if (!connection.connected) {
          setSharedSyncState({ status: "failed", online: true, cloud: "unavailable", lastError: connection.error });
          return;
        }
        let firstBatchResult = { queueSize: 0, failed: 0 };
        let secondBatchResult = { queueSize: 0, failed: 0 };
        let thirdBatchResult = { queueSize: 0, failed: 0 };
        let fourthBatchResult = { queueSize: 0, failed: 0 };
        let finalFinanceResult = { queueSize: 0, failed: 0, errors: [] as string[] };
        let failedBatches = 0;
        const batchErrors: string[] = [];

        try {
          firstBatchResult = await runFirstBatchSyncCycle(client, accountId, deviceId, !blockedRef.current);
          if (firstBatchResult.failed) batchErrors.push("第一批同步失败");
        } catch {
          failedBatches += 1;
          batchErrors.push("第一批同步失败");
        }
        try {
          secondBatchResult = await runSecondBatchSyncCycle(client, accountId, deviceId);
          if (secondBatchResult.failed) batchErrors.push("第二批同步失败");
        } catch {
          failedBatches += 1;
          batchErrors.push("第二批同步失败");
        }
        try {
          thirdBatchResult = await runThirdBatchSyncCycle(client, accountId, deviceId);
          if (thirdBatchResult.failed) batchErrors.push("第三批同步失败");
        } catch {
          failedBatches += 1;
          batchErrors.push("第三批同步失败");
        }
        try {
          fourthBatchResult = await runFourthBatchSyncCycle(client, accountId, deviceId);
          if (fourthBatchResult.failed) batchErrors.push("第四批同步失败");
        } catch {
          failedBatches += 1;
          batchErrors.push("第四批同步失败");
        }
        try {
          finalFinanceResult = await runFinalFinanceSyncCycle(client, accountId, deviceId);
          if (finalFinanceResult.failed) batchErrors.push(...finalFinanceResult.errors);
        } catch {
          failedBatches += 1;
          batchErrors.push("个人财务同步失败");
        }
        const queueSize = readSyncQueue().length;
        const failed = firstBatchResult.failed + secondBatchResult.failed + thirdBatchResult.failed + fourthBatchResult.failed + finalFinanceResult.failed + failedBatches;
        const result = { queueSize, failed };
        const uniqueErrors = Array.from(new Set(batchErrors));
        setSharedSyncState({ status: result.queueSize || result.failed ? "pending" : "synced", online: true, cloud: "connected", lastSyncedAt: result.queueSize || result.failed ? readSyncState().lastSyncedAt : new Date().toISOString(), lastError: uniqueErrors.length ? `部分同步失败：${uniqueErrors.join("；")}。` : null });
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
    const handleSyncRequested = () => void runSyncCycle();
    const handleOnline = () => void runSyncCycle();
    const handleOffline = () => setSharedSyncState({ status: "offline", online: false, lastError: null });
    const handleFocus = () => void runSyncCycle();
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void runSyncCycle(); };
    window.addEventListener(FIRST_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(SECOND_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(THIRD_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(FOURTH_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(FINAL_FINANCE_STORAGE_CHANGED_EVENT, handleStorageChanged);
    window.addEventListener(FIRST_BATCH_MIGRATION_COMPLETED_EVENT, handleMigrationCompleted);
    window.addEventListener(FIRST_BATCH_SYNC_REQUESTED_EVENT, handleSyncRequested);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(FIRST_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(SECOND_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(THIRD_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(FOURTH_BATCH_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(FINAL_FINANCE_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(FIRST_BATCH_MIGRATION_COMPLETED_EVENT, handleMigrationCompleted);
      window.removeEventListener(FIRST_BATCH_SYNC_REQUESTED_EVENT, handleSyncRequested);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [runSyncCycle]);

  return { runSyncCycle };
}
