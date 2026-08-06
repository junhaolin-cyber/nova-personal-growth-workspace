"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthAccount } from "@/features/auth/types";
import { migrateFirstBatch } from "./service";
import { scanFirstBatch } from "./scanner";
import { createFirstBatchBackup, hasCompletedFirstBatchMigration, markFirstBatchMigrationCompleted } from "./storage";
import type { FirstBatchMigrationController, FirstBatchMigrationResult, FirstBatchMigrationStatus, FirstBatchPreview } from "./types";

export function useFirstBatchMigration(account: AuthAccount | null): FirstBatchMigrationController {
  const userId = account?.user.id ?? null;
  const deviceId = account?.currentDeviceId ?? null;
  const [preview, setPreview] = React.useState<FirstBatchPreview | null>(null);
  const [status, setStatus] = React.useState<FirstBatchMigrationStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<FirstBatchMigrationResult | null>(null);

  React.useEffect(() => {
    if (!userId || !deviceId) {
      setPreview(null);
      setStatus("idle");
      setError(null);
      setResult(null);
      return;
    }
    if (hasCompletedFirstBatchMigration(userId)) {
      setPreview(null);
      setStatus("completed");
      return;
    }
    const nextPreview = scanFirstBatch();
    setPreview(nextPreview.total > 0 ? nextPreview : null);
    setStatus(nextPreview.total > 0 ? "ready" : "idle");
    setError(null);
    setResult(null);
  }, [deviceId, userId]);

  const confirm = React.useCallback(async () => {
    if (!userId || !deviceId || !preview || status === "migrating") return;
    setStatus("migrating");
    setError(null);
    const backupKey = createFirstBatchBackup(userId, deviceId, preview.items);
    if (!backupKey) {
      setStatus("failed");
      setError("无法创建本地备份，迁移已停止，未上传任何数据。请检查浏览器存储空间后重试。");
      return;
    }
    try {
      const serviceResult = await migrateFirstBatch(createSupabaseBrowserClient(), userId, deviceId, preview.items, backupKey);
      if (!serviceResult.result) {
        setStatus("failed");
        setError(serviceResult.error ?? "迁移失败，本地数据和备份均已保留。");
        return;
      }
      markFirstBatchMigrationCompleted(userId, serviceResult.result.processedCount, backupKey);
      setResult(serviceResult.result);
      setPreview(null);
      setStatus("completed");
    } catch {
      setStatus("failed");
      setError("云端连接暂时不可用，迁移未完成，本地数据和备份均已保留。");
    }
  }, [deviceId, preview, status, userId]);

  const dismiss = React.useCallback(() => {
    if (status === "migrating") return;
    setPreview(null);
    setStatus("idle");
    setError(null);
  }, [status]);

  return { preview, status, error, result, confirm, dismiss };
}
