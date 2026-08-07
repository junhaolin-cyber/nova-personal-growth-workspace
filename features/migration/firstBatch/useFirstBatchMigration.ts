"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthAccount } from "@/features/auth/types";
import { migrateFirstBatch } from "./service";
import { scanFirstBatch } from "./scanner";
import { createFirstBatchBackup, hasCompletedFirstBatchMigration, markFirstBatchMigrationCompleted } from "./storage";
import type { FirstBatchCounts, FirstBatchMigrationController, FirstBatchMigrationResult, FirstBatchMigrationStatus, FirstBatchPreview } from "./types";

function previewForModules(preview: FirstBatchPreview, modules: Set<FirstBatchPreview["items"][number]["module"]>): FirstBatchPreview | null {
  const items = preview.items.filter((item) => modules.has(item.module));
  if (items.length === 0) return null;
  const counts: FirstBatchCounts = { "movies-tv": 0, food: 0, news: 0, "trend-life": 0 };
  for (const item of items) counts[item.module] += 1;
  return { items, counts, total: items.length };
}

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
      setResult(serviceResult.result);
      if (serviceResult.result.failedCount === 0) {
        markFirstBatchMigrationCompleted(userId, serviceResult.result.processedCount, backupKey);
        setPreview(null);
        setStatus("completed");
      } else {
        const failedModules = new Set(serviceResult.result.moduleResults.filter((module) => module.failedCount > 0).map((module) => module.module));
        setPreview(previewForModules(preview, failedModules));
        setStatus(serviceResult.result.successCount > 0 || serviceResult.result.skippedCount > 0 ? "partial" : "failed");
        setError(serviceResult.result.successCount > 0 || serviceResult.result.skippedCount > 0 ? "部分记录迁移完成，失败记录仍保留在预览中，可继续重试。" : "本次没有记录迁移成功，请检查网络或云端权限后重试。");
      }
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
    setResult(null);
  }, [status]);

  return { preview, status, error, result, confirm, dismiss };
}
