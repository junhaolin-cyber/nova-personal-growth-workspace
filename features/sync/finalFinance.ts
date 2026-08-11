"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookkeepingAccount, BookkeepingCategory, BookkeepingRecord, BookkeepingState } from "@/features/bookkeeping/types";
import { defaultAccounts, defaultCategories } from "@/features/bookkeeping/mockData";
import { BOOKKEEPING_STORAGE_KEYS, loadBookkeepingState, saveBookkeepingState } from "@/features/bookkeeping/storage";
import type { Database, Json } from "@/lib/supabase/types";
import { compareVersionedSnapshots } from "./conflict";
import { enqueueSyncOperation, removeSyncOperations } from "./engine";
import { notifyFinalFinanceRemoteMerged } from "./events";
import { isNetworkOnline } from "./network";
import { readSyncQueue } from "./storage";
import type { SyncQueueItem } from "./types";

export const FINAL_FINANCE_MODULES = ["bookkeeping"] as const;
export type FinalFinanceModule = (typeof FINAL_FINANCE_MODULES)[number];
export type FinalFinanceItemType = "bookkeeping-record" | "bookkeeping-category" | "bookkeeping-account" | "bookkeeping-budget";

type RecordRow = Database["public"]["Tables"]["bookkeeping_records"]["Row"];
type CategoryRow = Database["public"]["Tables"]["bookkeeping_categories"]["Row"];
type AccountRow = Database["public"]["Tables"]["bookkeeping_accounts"]["Row"];
type BudgetRow = Database["public"]["Tables"]["bookkeeping_budgets"]["Row"];
type RowEnvelope =
  | { table: "bookkeeping_records"; row: RecordRow }
  | { table: "bookkeeping_categories"; row: CategoryRow }
  | { table: "bookkeeping_accounts"; row: AccountRow }
  | { table: "bookkeeping_budgets"; row: BudgetRow };

type LocalRecord = {
  key: string;
  module: FinalFinanceModule;
  itemType: FinalFinanceItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  clientUpdatedAt?: string;
};

type MetadataRecord = {
  module: FinalFinanceModule;
  itemType: FinalFinanceItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  signature: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt: string | null;
  localPresence: boolean;
};

type MetadataMap = Record<string, MetadataRecord>;
const META_STORAGE_KEY = "nova:sync:final-finance-metadata:v1";

function recordKey(itemType: FinalFinanceItemType, entityId: string): string {
  return `bookkeeping:${itemType}:${entityId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJson(value: unknown): Json {
  return value as Json;
}

function readMetadata(): MetadataMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(META_STORAGE_KEY) ?? "null");
    return isObject(parsed) ? parsed as MetadataMap : {};
  } catch {
    return {};
  }
}

function writeMetadata(metadata: MetadataMap): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metadata)); } catch { /* 本地元数据不可用时不阻塞记账 */ }
}

function payloadString(payload: Record<string, Json> | null | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function payloadNumber(payload: Record<string, Json> | null | undefined, key: string): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function payloadBoolean(payload: Record<string, Json> | null | undefined, key: string): boolean | undefined {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function normalizeDecimalString(value: string, allowNegative = false): string | null {
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d{1,4})?$/.test(trimmed)) return null;
  if (!allowNegative && trimmed.startsWith("-")) return null;
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = unsigned.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  const normalizedFraction = fraction.replace(/0+$/, "");
  const result = normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
  return negative && result !== "0" ? `-${result}` : result;
}

function decimalFromNumber(value: number, allowNegative = false): string | null {
  if (!Number.isFinite(value) || (!allowNegative && value < 0)) return null;
  return normalizeDecimalString(value.toFixed(4), allowNegative);
}

function decimalPayload(value: unknown, allowNegative = false): string | null {
  if (typeof value === "string") return normalizeDecimalString(value, allowNegative);
  if (typeof value === "number") return decimalFromNumber(value, allowNegative);
  return null;
}

function decimalToUiNumber(value: string): number | null {
  const normalized = normalizeDecimalString(value, true);
  if (normalized === null) return null;
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function signature(payload: Record<string, Json>): string {
  return JSON.stringify(payload);
}

function createLocalRecord(itemType: FinalFinanceItemType, entityId: string, payload: Record<string, Json>, sourceStorageKey: string, clientCreatedAt: string, clientUpdatedAt?: string): LocalRecord {
  return { key: recordKey(itemType, entityId), module: "bookkeeping", itemType, entityId, payload, sourceStorageKey, clientCreatedAt, clientUpdatedAt };
}

function scanBookkeeping(): LocalRecord[] {
  const state = loadBookkeepingState();
  const records: LocalRecord[] = state.records.map((record: BookkeepingRecord) => createLocalRecord("bookkeeping-record", record.id, {
    recordType: record.type,
    amount: decimalFromNumber(record.amount) ?? "0",
    categoryLocalId: record.categoryId,
    accountLocalId: record.accountId,
    recordDate: record.date,
    recordTime: record.time,
    note: record.note,
  }, BOOKKEEPING_STORAGE_KEYS.records, record.createdAt, record.updatedAt));

  state.categories.forEach((category: BookkeepingCategory) => records.push(createLocalRecord("bookkeeping-category", category.id, {
    categoryType: category.type,
    name: category.name,
    icon: category.icon,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  }, BOOKKEEPING_STORAGE_KEYS.categories, category.createdAt)));

  state.accounts.forEach((account: BookkeepingAccount) => records.push(createLocalRecord("bookkeeping-account", account.id, {
    accountType: account.type,
    name: account.name,
    openingBalance: decimalFromNumber(account.openingBalance, true) ?? "0",
    isActive: account.isActive,
  }, BOOKKEEPING_STORAGE_KEYS.accounts, account.createdAt)));

  state.budgets.forEach((budget) => records.push(createLocalRecord("bookkeeping-budget", budget.id, {
    budgetMonth: budget.month,
    amount: decimalFromNumber(budget.amount) ?? "0",
    categoryLocalId: budget.categoryId ?? null,
    isActive: budget.isActive,
  }, BOOKKEEPING_STORAGE_KEYS.budgets, budget.updatedAt, budget.updatedAt)));
  return records;
}

export function scanLocalFinalFinanceRecords(): LocalRecord[] {
  return scanBookkeeping();
}

function isDefaultCategory(record: LocalRecord): boolean {
  if (record.itemType !== "bookkeeping-category") return false;
  const item = defaultCategories.find((candidate) => candidate.id === record.entityId);
  return Boolean(item && item.type === payloadString(record.payload, "categoryType") && item.name === payloadString(record.payload, "name") && item.icon === payloadString(record.payload, "icon") && item.sortOrder === payloadNumber(record.payload, "sortOrder") && item.isActive === payloadBoolean(record.payload, "isActive"));
}

function isDefaultAccount(record: LocalRecord): boolean {
  if (record.itemType !== "bookkeeping-account") return false;
  const item = defaultAccounts.find((candidate) => candidate.id === record.entityId);
  return Boolean(item && item.type === payloadString(record.payload, "accountType") && item.name === payloadString(record.payload, "name") && item.isActive === payloadBoolean(record.payload, "isActive") && decimalFromNumber(item.openingBalance, true) === payloadString(record.payload, "openingBalance"));
}

function shouldPreserveUntrackedLocal(record: LocalRecord): boolean {
  if (record.itemType === "bookkeeping-category") return !isDefaultCategory(record);
  if (record.itemType === "bookkeeping-account") return !isDefaultAccount(record);
  return true;
}

function rowSnapshot(row: RowEnvelope["row"]): { updatedAt: string; version: number; deviceId: string; deletedAt: string | null } {
  return { updatedAt: row.client_updated_at, version: row.version, deviceId: row.source_device_id ?? "cloud", deletedAt: row.deleted_at };
}

type FinalFinancePullResult = {
  pulled: number;
  failed: number;
  errors: string[];
};

const FINAL_FINANCE_TABLES = [
  "bookkeeping_records",
  "bookkeeping_categories",
  "bookkeeping_accounts",
  "bookkeeping_budgets",
] as const;

function safeSupabaseError(error: unknown): string {
  if (!isObject(error)) return "未知错误";
  const code = typeof error.code === "string" ? error.code : "未知代码";
  const status = typeof error.status === "number" ? ` HTTP ${error.status}` : "";
  const message = typeof error.message === "string" ? ` ${error.message.replace(/\s+/g, " ").slice(0, 160)}` : "";
  return `${code}${status}${message}`;
}

type FinalFinanceTable = (typeof FINAL_FINANCE_TABLES)[number];
type FinalFinanceQueryResult = { table: FinalFinanceTable; rows: unknown[]; error: unknown | null };

function isDecimalValue(value: unknown, allowNegative = false): boolean {
  if (typeof value === "string") return normalizeDecimalString(value, allowNegative) !== null;
  if (typeof value === "number") return decimalFromNumber(value, allowNegative) !== null;
  return false;
}

function isNullableText(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function hasCommonFinanceRowFields(value: Record<string, unknown>): boolean {
  return typeof value.local_id === "string"
    && value.local_id.trim().length > 0
    && (value.source_device_id === null || typeof value.source_device_id === "string")
    && typeof value.source_storage_key === "string"
    && Number.isInteger(value.version)
    && Number(value.version) > 0
    && typeof value.client_created_at === "string"
    && typeof value.client_updated_at === "string"
    && isNullableText(value.deleted_at);
}

function isValidFinalFinanceRow(table: FinalFinanceTable, value: unknown): boolean {
  if (!isObject(value) || !hasCommonFinanceRowFields(value)) return false;
  if (table === "bookkeeping_records") {
    return (value.record_type === "income" || value.record_type === "expense")
      && isDecimalValue(value.amount)
      && typeof value.category_local_id === "string"
      && value.category_local_id.trim().length > 0
      && typeof value.account_local_id === "string"
      && value.account_local_id.trim().length > 0
      && typeof value.record_date === "string"
      && typeof value.record_time === "string"
      && typeof value.note === "string";
  }
  if (table === "bookkeeping_categories") {
    return (value.category_type === "income" || value.category_type === "expense")
      && typeof value.name === "string"
      && value.name.trim().length > 0
      && typeof value.icon === "string"
      && Number.isInteger(value.sort_order)
      && typeof value.is_active === "boolean";
  }
  if (table === "bookkeeping_accounts") {
    return ["cash", "bank", "credit", "wallet", "other"].includes(String(value.account_type))
      && typeof value.name === "string"
      && value.name.trim().length > 0
      && isDecimalValue(value.opening_balance, true)
      && typeof value.is_active === "boolean";
  }
  return typeof value.budget_month === "string"
    && isDecimalValue(value.amount)
    && isNullableText(value.category_local_id)
    && typeof value.is_active === "boolean";
}

async function queryFinalFinanceTable<Row>(table: FinalFinanceTable, query: () => Promise<{ data: Row[] | null; error: unknown | null }>): Promise<FinalFinanceQueryResult> {
  try {
    const result = await query();
    return { table, rows: result.data ?? [], error: result.error };
  } catch (error) {
    return { table, rows: [], error };
  }
}

function mapFinalFinanceRows(result: FinalFinanceQueryResult, errors: string[]): RowEnvelope[] {
  if (result.error) {
    errors.push(`${result.table} 查询失败（${safeSupabaseError(result.error)}）`);
    return [];
  }
  const rows: RowEnvelope[] = [];
  result.rows.forEach((value) => {
    if (!isValidFinalFinanceRow(result.table, value)) {
      errors.push(`${result.table} 数据映射失败（云端字段与当前版本不一致或存在无效数据）`);
      return;
    }
    if (result.table === "bookkeeping_records") rows.push({ table: result.table, row: value as RecordRow });
    else if (result.table === "bookkeeping_categories") rows.push({ table: result.table, row: value as CategoryRow });
    else if (result.table === "bookkeeping_accounts") rows.push({ table: result.table, row: value as AccountRow });
    else rows.push({ table: result.table, row: value as BudgetRow });
  });
  return rows;
}

function envelopeSource(envelope: RowEnvelope): { itemType: FinalFinanceItemType; sourceStorageKey: string } {
  switch (envelope.table) {
    case "bookkeeping_records": return { itemType: "bookkeeping-record", sourceStorageKey: BOOKKEEPING_STORAGE_KEYS.records };
    case "bookkeeping_categories": return { itemType: "bookkeeping-category", sourceStorageKey: BOOKKEEPING_STORAGE_KEYS.categories };
    case "bookkeeping_accounts": return { itemType: "bookkeeping-account", sourceStorageKey: BOOKKEEPING_STORAGE_KEYS.accounts };
    case "bookkeeping_budgets": return { itemType: "bookkeeping-budget", sourceStorageKey: BOOKKEEPING_STORAGE_KEYS.budgets };
  }
}

function envelopeKey(envelope: RowEnvelope): string {
  return recordKey(envelopeSource(envelope).itemType, envelope.row.local_id);
}

function mergeBookkeeping(rows: RowEnvelope[]): boolean {
  if (!rows.length) return false;
  const current = loadBookkeepingState();
  const next: BookkeepingState = {
    ...current,
    records: [...current.records],
    categories: [...current.categories],
    accounts: [...current.accounts],
    budgets: [...current.budgets],
  };
  rows.forEach((envelope) => {
    if (envelope.table === "bookkeeping_records") {
      const row = envelope.row;
      next.records = row.deleted_at ? next.records.filter((item) => item.id !== row.local_id) : [...next.records.filter((item) => item.id !== row.local_id), {
        id: row.local_id,
        type: row.record_type as BookkeepingRecord["type"],
        amount: decimalToUiNumber(row.amount) ?? 0,
        categoryId: row.category_local_id,
        accountId: row.account_local_id,
        date: row.record_date,
        time: row.record_time,
        note: row.note,
        createdAt: row.client_created_at,
        updatedAt: row.client_updated_at,
      }];
    } else if (envelope.table === "bookkeeping_categories") {
      const row = envelope.row;
      next.categories = row.deleted_at ? next.categories.filter((item) => item.id !== row.local_id) : [...next.categories.filter((item) => item.id !== row.local_id), { id: row.local_id, type: row.category_type as BookkeepingCategory["type"], name: row.name, icon: row.icon, sortOrder: row.sort_order, isActive: row.is_active, createdAt: row.client_created_at }];
    } else if (envelope.table === "bookkeeping_accounts") {
      const row = envelope.row;
      next.accounts = row.deleted_at ? next.accounts.filter((item) => item.id !== row.local_id) : [...next.accounts.filter((item) => item.id !== row.local_id), { id: row.local_id, type: row.account_type as BookkeepingAccount["type"], name: row.name, openingBalance: decimalToUiNumber(row.opening_balance) ?? 0, isActive: row.is_active, createdAt: row.client_created_at }];
    } else {
      const row = envelope.row;
      const budget = { id: row.local_id, month: row.budget_month, amount: decimalToUiNumber(row.amount) ?? 0, categoryId: row.category_local_id ?? undefined, isActive: row.is_active, updatedAt: row.client_updated_at };
      next.budgets = row.deleted_at ? next.budgets.filter((item) => item.id !== row.local_id) : [...next.budgets.filter((item) => item.id !== row.local_id), budget];
    }
  });
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  if (changed) saveBookkeepingState(next);
  return changed;
}

export async function pullAndMergeFinalFinance(client: SupabaseClient<Database>, userId: string): Promise<FinalFinancePullResult> {
  const errors: string[] = [];
  const rawResults = await Promise.all([
    queryFinalFinanceTable("bookkeeping_records", async () => client.from("bookkeeping_records").select("*").eq("user_id", userId)),
    queryFinalFinanceTable("bookkeeping_categories", async () => client.from("bookkeeping_categories").select("*").eq("user_id", userId)),
    queryFinalFinanceTable("bookkeeping_accounts", async () => client.from("bookkeeping_accounts").select("*").eq("user_id", userId)),
    queryFinalFinanceTable("bookkeeping_budgets", async () => client.from("bookkeeping_budgets").select("*").eq("user_id", userId)),
  ]);
  const rows = rawResults.flatMap((result) => mapFinalFinanceRows(result, errors));
  let failed = rawResults.filter((result) => Boolean(result.error)).length;
  failed += errors.length - failed;
  const metadata = readMetadata();
  const local = new Map(scanBookkeeping().map((record) => [record.key, record]));
  const applicable: RowEnvelope[] = [];
  const skipped = new Set<string>();
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    const localRecord = local.get(key);
    if (!previous && localRecord && !envelope.row.deleted_at && shouldPreserveUntrackedLocal(localRecord)) { skipped.add(key); return; }
    applicable.push(envelope);
  });
  let changed = false;
  try {
    changed = mergeBookkeeping(applicable);
  } catch {
    failed += 1;
    errors.push("个人财务本地合并失败（云端数据无法写回当前设备）");
    return { pulled: 0, failed, errors };
  }
  const afterLocal = new Map(scanBookkeeping().map((record) => [record.key, record]));
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    if (skipped.has(key)) return;
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    const source = envelopeSource(envelope);
    const localRecord = afterLocal.get(key);
    metadata[key] = { module: "bookkeeping", itemType: source.itemType, entityId: envelope.row.local_id, payload: localRecord?.payload ?? {}, sourceStorageKey: localRecord?.sourceStorageKey ?? source.sourceStorageKey, clientCreatedAt: localRecord?.clientCreatedAt ?? envelope.row.client_created_at, signature: signature(localRecord?.payload ?? {}), updatedAt: envelope.row.client_updated_at, version: envelope.row.version, deviceId: envelope.row.source_device_id ?? "cloud", deletedAt: envelope.row.deleted_at, localPresence: Boolean(localRecord) };
  });
  writeMetadata(metadata);
  if (changed) notifyFinalFinanceRemoteMerged();
  return { pulled: applicable.length, failed, errors };
}

export function enqueueLocalFinalFinanceChanges(deviceId: string): number {
  const local = new Map(scanBookkeeping().map((record) => [record.key, record]));
  const metadata = readMetadata();
  let queued = 0;
  local.forEach((record) => {
    const previous = metadata[record.key];
    const nextSignature = signature(record.payload);
    if (previous && !previous.deletedAt && previous.signature === nextSignature) { previous.localPresence = true; return; }
    const updatedAt = record.clientUpdatedAt ?? (previous && previous.signature !== nextSignature ? new Date().toISOString() : previous?.updatedAt ?? new Date().toISOString());
    const nextVersion = (previous?.version ?? 0) + 1;
    metadata[record.key] = { module: "bookkeeping", itemType: record.itemType, entityId: record.entityId, payload: record.payload, sourceStorageKey: record.sourceStorageKey, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt, signature: nextSignature, updatedAt, version: nextVersion, deviceId, deletedAt: null, localPresence: true };
    enqueueSyncOperation({ module: "bookkeeping", itemType: record.itemType, entityId: record.entityId, operation: "upsert", payload: { ...record.payload, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt }, sourceStorageKey: record.sourceStorageKey, deletedAt: null, version: nextVersion, deviceId, updatedAt });
    queued += 1;
  });
  Object.values(metadata).forEach((previous) => {
    const key = recordKey(previous.itemType, previous.entityId);
    if (previous.module !== "bookkeeping" || !previous.localPresence || local.has(key) || previous.deletedAt) return;
    const deletedAt = new Date().toISOString();
    const nextVersion = previous.version + 1;
    metadata[key] = { ...previous, updatedAt: deletedAt, version: nextVersion, deviceId, deletedAt, localPresence: false };
    enqueueSyncOperation({ module: "bookkeeping", itemType: previous.itemType, entityId: previous.entityId, operation: "delete", payload: { ...previous.payload, clientCreatedAt: previous.clientCreatedAt }, sourceStorageKey: previous.sourceStorageKey, deletedAt, version: nextVersion, deviceId, updatedAt: deletedAt });
    queued += 1;
  });
  writeMetadata(metadata);
  return queued;
}

function itemPayload(item: SyncQueueItem): Record<string, Json> {
  return (item.payload ?? {}) as Record<string, Json>;
}

function commonInsert(item: SyncQueueItem, userId: string, sourceDeviceId: string | null) {
  return { user_id: userId, local_id: item.entityId, source_device_id: sourceDeviceId, source_storage_key: item.sourceStorageKey ?? "", version: item.version, client_created_at: payloadString(itemPayload(item), "clientCreatedAt") ?? new Date().toISOString(), client_updated_at: item.updatedAt, deleted_at: item.deletedAt ?? null };
}

async function pushOne(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem, sourceDeviceId: string | null): Promise<boolean> {
  const payload = itemPayload(item);
  const base = commonInsert(item, userId, sourceDeviceId);
  const snapshot = { updatedAt: item.updatedAt, version: item.version, deviceId: item.deviceId, deletedAt: item.deletedAt ?? null };
  if (item.itemType === "bookkeeping-record") {
    const { data: existing, error } = await client.from("bookkeeping_records").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), snapshot) > 0) return true;
    const row: Database["public"]["Tables"]["bookkeeping_records"]["Insert"] = { ...base, record_type: payloadString(payload, "recordType") ?? existing?.record_type ?? "expense", amount: decimalPayload(payload["amount"]) ?? existing?.amount ?? "0", category_local_id: payloadString(payload, "categoryLocalId") ?? existing?.category_local_id ?? "", account_local_id: payloadString(payload, "accountLocalId") ?? existing?.account_local_id ?? "", record_date: payloadString(payload, "recordDate") ?? existing?.record_date ?? new Date().toISOString().slice(0, 10), record_time: payloadString(payload, "recordTime") ?? existing?.record_time ?? "12:00", note: payloadString(payload, "note") ?? existing?.note ?? "" };
    const result = await client.from("bookkeeping_records").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (item.itemType === "bookkeeping-category") {
    const { data: existing, error } = await client.from("bookkeeping_categories").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), snapshot) > 0) return true;
    const row: Database["public"]["Tables"]["bookkeeping_categories"]["Insert"] = { ...base, category_type: payloadString(payload, "categoryType") ?? existing?.category_type ?? "expense", name: payloadString(payload, "name") ?? existing?.name ?? "未命名分类", icon: payloadString(payload, "icon") ?? existing?.icon ?? "", sort_order: payloadNumber(payload, "sortOrder") ?? existing?.sort_order ?? 0, is_active: payloadBoolean(payload, "isActive") ?? existing?.is_active ?? true };
    const result = await client.from("bookkeeping_categories").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (item.itemType === "bookkeeping-account") {
    const { data: existing, error } = await client.from("bookkeeping_accounts").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), snapshot) > 0) return true;
    const row: Database["public"]["Tables"]["bookkeeping_accounts"]["Insert"] = { ...base, account_type: payloadString(payload, "accountType") ?? existing?.account_type ?? "other", name: payloadString(payload, "name") ?? existing?.name ?? "未命名账户", opening_balance: decimalPayload(payload["openingBalance"], true) ?? existing?.opening_balance ?? "0", is_active: payloadBoolean(payload, "isActive") ?? existing?.is_active ?? true };
    const result = await client.from("bookkeeping_accounts").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  const { data: existing, error } = await client.from("bookkeeping_budgets").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
  if (error) throw error;
  if (existing && compareVersionedSnapshots(rowSnapshot(existing), snapshot) > 0) return true;
  const categoryLocalId = payloadString(payload, "categoryLocalId") ?? existing?.category_local_id ?? null;
  const row: Database["public"]["Tables"]["bookkeeping_budgets"]["Insert"] = { ...base, budget_month: payloadString(payload, "budgetMonth") ?? existing?.budget_month ?? new Date().toISOString().slice(0, 7), amount: decimalPayload(payload["amount"]) ?? existing?.amount ?? "0", category_local_id: categoryLocalId, is_active: payloadBoolean(payload, "isActive") ?? existing?.is_active ?? true };
  const result = await client.from("bookkeeping_budgets").upsert(row, { onConflict: "user_id,local_id" });
  if (result.error) throw result.error;
  return true;
}

export async function pushFinalFinanceQueue(client: SupabaseClient<Database>, userId: string): Promise<{ uploaded: number; failed: number; errors: string[] }> {
  const queue = readSyncQueue().filter((item) => item.module === "bookkeeping");
  const uploadedIds: string[] = [];
  let failed = 0;
  const errors: string[] = [];
  let sourceDeviceId: string | null = null;
  const deviceId = queue[0]?.deviceId;
  if (deviceId) {
    const { data } = await client.from("devices").select("id").eq("id", deviceId).eq("user_id", userId).maybeSingle();
    sourceDeviceId = data?.id ?? null;
  }
  for (const item of queue) {
    try {
      if (item.itemType) await pushOne(client, userId, item, sourceDeviceId);
      uploadedIds.push(item.id);
    } catch {
      failed += 1;
      errors.push(`${item.itemType ?? "bookkeeping"} 上传失败`);
    }
  }
  removeSyncOperations(uploadedIds);
  return { uploaded: uploadedIds.length, failed, errors };
}

export async function runFinalFinanceSyncCycle(client: SupabaseClient<Database>, userId: string, deviceId: string): Promise<{ queueSize: number; failed: number; errors: string[] }> {
  if (!isNetworkOnline()) throw new Error("当前处于离线状态。");
  let failed = 0;
  const errors: string[] = [];
  try {
    const result = await pullAndMergeFinalFinance(client, userId);
    failed += result.failed;
    errors.push(...result.errors);
  } catch {
    failed += 4;
    errors.push("个人财务查询失败");
  }
  enqueueLocalFinalFinanceChanges(deviceId);
  const pushed = await pushFinalFinanceQueue(client, userId);
  errors.push(...pushed.errors);
  try {
    const result = await pullAndMergeFinalFinance(client, userId);
    failed += result.failed;
    errors.push(...result.errors);
  } catch {
    failed += 4;
    errors.push("个人财务回读失败");
  }
  return { queueSize: readSyncQueue().filter((item) => item.module === "bookkeeping").length, failed: failed + pushed.failed, errors: Array.from(new Set(errors)) };
}
