"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthAccount } from "@/features/auth/types";
import { verifyCloudConnection, flushSyncQueue } from "./engine";
import { isNetworkOnline, subscribeNetworkStatus } from "./network";
import { readSyncQueue, readSyncState, writeSyncState } from "./storage";
import { SYNC_STATE_CHANGED_EVENT } from "./events";
import type { SyncState, SyncStatusController } from "./types";

function getOfflineState(state: SyncState): SyncState {
  return { ...state, online: false, status: "offline", lastError: null };
}

export function useSyncStatus(account: AuthAccount | null, externalSync?: () => Promise<void>): SyncStatusController {
  const [state, setState] = React.useState<SyncState>(() => readSyncState());
  const stateRef = React.useRef(state);
  const inFlightRef = React.useRef<Promise<void> | null>(null);
  const accountId = account?.user.id ?? null;

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = React.useCallback((patch: Partial<SyncState>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      writeSyncState(next);
      return next;
    });
  }, []);

  const runSyncCycle = React.useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      if (externalSync) {
        await externalSync();
        setState(readSyncState());
        return;
      }
      if (!isNetworkOnline()) {
        updateState(getOfflineState(stateRef.current));
        return;
      }

      const queueSize = readSyncQueue().length;
      updateState({ online: true, status: queueSize ? "pending" : "syncing", queueSize, lastError: null });

      if (!accountId) {
        updateState({ status: "pending", cloud: "unknown", queueSize });
        return;
      }

      try {
        const connection = await verifyCloudConnection(createSupabaseBrowserClient(), accountId);
        if (!connection.connected) {
          updateState({ status: "failed", cloud: "unavailable", lastError: connection.error });
          return;
        }

        const result = await flushSyncQueue(null);
        updateState({
          status: result.remaining ? "pending" : "synced",
          cloud: "connected",
          queueSize: result.remaining,
          lastSyncedAt: result.remaining ? stateRef.current.lastSyncedAt : new Date().toISOString(),
          lastError: result.remaining ? "等待业务模块接入同步适配器。" : null,
        });
      } catch {
        updateState({ status: "failed", cloud: "unavailable", lastError: "云端连接暂时不可用，请稍后重试。" });
      }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [accountId, externalSync, updateState]);

  React.useEffect(() => {
    const handleSyncStateChanged = () => setState(readSyncState());
    window.addEventListener(SYNC_STATE_CHANGED_EVENT, handleSyncStateChanged);
    updateState({ online: isNetworkOnline() });
    void runSyncCycle();

    const unsubscribeNetwork = subscribeNetworkStatus((online) => {
      if (!online) {
        setState((current) => {
          const next = getOfflineState(current);
          writeSyncState(next);
          return next;
        });
        return;
      }
      updateState({ online: true, status: readSyncQueue().length ? "pending" : "syncing" });
      void runSyncCycle();
    });
    return () => {
      window.removeEventListener(SYNC_STATE_CHANGED_EVENT, handleSyncStateChanged);
      unsubscribeNetwork();
    };
  }, [runSyncCycle, updateState]);

  return { ...state, retry: runSyncCycle };
}
