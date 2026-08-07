import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { FirstBatchItem, FirstBatchMigrationResult, FirstBatchModule, FirstBatchModuleResult } from "./types";
import { FIRST_BATCH_MIGRATION_KEY } from "./types";

type MigrationServiceResult = { result?: FirstBatchMigrationResult; error?: string };

const modules: FirstBatchModule[] = ["movies-tv", "food", "news", "trend-life"];

function updateMigrationRun(client: SupabaseClient<Database>, userId: string, deviceId: string, values: { status: "completed" | "failed"; item_count: number; completed_at: string | null }): PromiseLike<{ error: { message: string } | null }> {
  return client.from("user_migration_runs").update(values).eq("user_id", userId).eq("migration_key", FIRST_BATCH_MIGRATION_KEY).eq("source_device_id", deviceId);
}

export async function migrateFirstBatch(client: SupabaseClient<Database>, userId: string, deviceId: string, items: FirstBatchItem[], backupKey: string): Promise<MigrationServiceResult> {
  const run = {
    user_id: userId,
    migration_key: FIRST_BATCH_MIGRATION_KEY,
    source_device_id: deviceId,
    status: "started",
    item_count: items.length,
  };
  const runResult = await client.from("user_migration_runs").upsert(run, { onConflict: "user_id,migration_key,source_device_id" });
  if (runResult.error) return { error: "迁移记录暂时无法保存，请稍后重试。" };

  const existingResult = await client.from("user_data_items").select("module,item_type,entity_id").eq("user_id", userId).in("module", modules);
  if (existingResult.error) {
    await updateMigrationRun(client, userId, deviceId, { status: "failed", item_count: items.length, completed_at: null });
    return { error: "无法读取云端已有记录，迁移未开始，本地数据和备份均已保留。" };
  }

  const existingKeys = new Set((existingResult.data ?? []).map((item) => `${item.module}:${item.item_type}:${item.entity_id}`));
  const moduleResults: FirstBatchModuleResult[] = [];

  for (const module of modules) {
    const moduleItems = items.filter((item) => item.module === module);
    const candidates = moduleItems.filter((item) => !existingKeys.has(`${item.module}:${item.itemType}:${item.entityId}`));
    const moduleResult: FirstBatchModuleResult = {
      module,
      totalCount: moduleItems.length,
      successCount: 0,
      skippedCount: moduleItems.length - candidates.length,
      failedCount: 0,
    };

    if (candidates.length > 0) {
      const rows = candidates.map((item) => ({
        user_id: userId,
        module: item.module,
        item_type: item.itemType,
        entity_id: item.entityId,
        state: item.state,
        payload: item.payload,
        source_storage_key: item.sourceStorageKey,
        source_device_id: deviceId,
        version: item.version,
        client_updated_at: item.clientUpdatedAt,
      }));
      const dataResult = await client.from("user_data_items").insert(rows);
      if (dataResult.error) moduleResult.failedCount = candidates.length;
      else moduleResult.successCount = candidates.length;
    }
    moduleResults.push(moduleResult);
  }

  const successCount = moduleResults.reduce((sum, module) => sum + module.successCount, 0);
  const skippedCount = moduleResults.reduce((sum, module) => sum + module.skippedCount, 0);
  const failedCount = moduleResults.reduce((sum, module) => sum + module.failedCount, 0);
  const completeResult = await updateMigrationRun(client, userId, deviceId, {
    status: failedCount === 0 ? "completed" : "failed",
    item_count: items.length,
    completed_at: failedCount === 0 ? new Date().toISOString() : null,
  });
  if (completeResult.error) return { error: "数据已处理，但迁移状态确认失败，请稍后重试检查。" };
  return { result: { processedCount: successCount + skippedCount, successCount, skippedCount, failedCount, moduleResults, backupKey } };
}
