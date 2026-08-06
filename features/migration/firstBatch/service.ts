import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { FirstBatchItem, FirstBatchMigrationResult } from "./types";
import { FIRST_BATCH_MIGRATION_KEY } from "./types";

type MigrationServiceResult = { result?: FirstBatchMigrationResult; error?: string };

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

  const rows = items.map((item) => ({
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
  const dataResult = await client.from("user_data_items").upsert(rows, { onConflict: "user_id,module,item_type,entity_id", ignoreDuplicates: true });
  if (dataResult.error) {
    await client.from("user_migration_runs").update({ status: "failed" }).eq("user_id", userId).eq("migration_key", FIRST_BATCH_MIGRATION_KEY).eq("source_device_id", deviceId);
    return { error: "首批数据上传失败，本地数据和本地备份均已保留。" };
  }

  const completeResult = await client.from("user_migration_runs").update({ status: "completed", item_count: items.length, completed_at: new Date().toISOString() }).eq("user_id", userId).eq("migration_key", FIRST_BATCH_MIGRATION_KEY).eq("source_device_id", deviceId);
  if (completeResult.error) return { error: "数据已写入云端，但迁移状态确认失败，请稍后重试检查。" };
  return { result: { processedCount: items.length, backupKey } };
}
