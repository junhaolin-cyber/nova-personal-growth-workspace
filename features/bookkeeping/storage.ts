import { defaultAccounts, defaultCategories } from "./mockData";
import type { BookkeepingAccount, BookkeepingBudget, BookkeepingCategory, BookkeepingRecord, BookkeepingState, RecordType } from "./types";

export const BOOKKEEPING_STORAGE_KEYS = {
  records: "nova:bookkeeping:v1",
  categories: "nova:bookkeeping-category:v1",
  accounts: "nova:bookkeeping-account:v1",
  budgets: "nova:bookkeeping-budget:v1",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asObject = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = true) => typeof value === "boolean" ? value : fallback;
const read = (key: string): unknown => {
  if (typeof window === "undefined") return undefined;
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown; } catch { return undefined; }
};
const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 存储异常不能阻断记账 */ }
};

function normalizeRecord(value: unknown): BookkeepingRecord | null {
  const source = asObject(value);
  const amount = asNumber(source.amount, -1);
  const type = source.type === "income" || source.type === "expense" ? source.type : null;
  if (!source.id || !type || amount < 0 || !source.categoryId || !source.accountId || !source.date) return null;
  return { id: asString(source.id), type, amount, categoryId: asString(source.categoryId), accountId: asString(source.accountId), date: asString(source.date), time: asString(source.time, "12:00"), note: asString(source.note), createdAt: asString(source.createdAt, new Date().toISOString()), updatedAt: asString(source.updatedAt, new Date().toISOString()) };
}

function normalizeCategory(value: unknown): BookkeepingCategory | null {
  const source = asObject(value);
  const type: RecordType | null = source.type === "income" || source.type === "expense" ? source.type : null;
  if (!source.id || !type || !source.name) return null;
  return { id: asString(source.id), type, name: asString(source.name), icon: asString(source.icon, "•"), sortOrder: asNumber(source.sortOrder), isActive: asBoolean(source.isActive), createdAt: asString(source.createdAt, new Date().toISOString()) };
}

function normalizeAccount(value: unknown): BookkeepingAccount | null {
  const source = asObject(value);
  const types = ["cash", "bank", "credit", "wallet", "other"] as const;
  const type = types.includes(source.type as BookkeepingAccount["type"]) ? source.type as BookkeepingAccount["type"] : "other";
  if (!source.id || !source.name) return null;
  return { id: asString(source.id), name: asString(source.name), type, openingBalance: asNumber(source.openingBalance), isActive: asBoolean(source.isActive), createdAt: asString(source.createdAt, new Date().toISOString()) };
}

function normalizeBudget(value: unknown): BookkeepingBudget | null {
  const source = asObject(value);
  const amount = asNumber(source.amount, -1);
  if (!source.id || !source.month || amount < 0) return null;
  return { id: asString(source.id), month: asString(source.month), amount, categoryId: typeof source.categoryId === "string" ? source.categoryId : undefined, isActive: asBoolean(source.isActive), updatedAt: asString(source.updatedAt, new Date().toISOString()) };
}

function normalizeArray<T>(value: unknown, normalizer: (item: unknown) => T | null): T[] {
  return Array.isArray(value) ? value.map(normalizer).filter((item): item is T => Boolean(item)) : [];
}

export function createDefaultBookkeepingState(): BookkeepingState { return { version: 1, records: [], categories: defaultCategories, accounts: defaultAccounts, budgets: [] }; }

export function loadBookkeepingState(): BookkeepingState {
  const fallback = createDefaultBookkeepingState();
  if (typeof window === "undefined") return fallback;
  const records = normalizeArray(read(BOOKKEEPING_STORAGE_KEYS.records), normalizeRecord);
  const categories = normalizeArray(read(BOOKKEEPING_STORAGE_KEYS.categories), normalizeCategory);
  const accounts = normalizeArray(read(BOOKKEEPING_STORAGE_KEYS.accounts), normalizeAccount);
  const budgets = normalizeArray(read(BOOKKEEPING_STORAGE_KEYS.budgets), normalizeBudget);
  return { version: 1, records, categories: categories.length ? categories : defaultCategories, accounts: accounts.length ? accounts : defaultAccounts, budgets };
}

export function saveBookkeepingState(state: BookkeepingState) {
  write(BOOKKEEPING_STORAGE_KEYS.records, state.records);
  write(BOOKKEEPING_STORAGE_KEYS.categories, state.categories);
  write(BOOKKEEPING_STORAGE_KEYS.accounts, state.accounts);
  write(BOOKKEEPING_STORAGE_KEYS.budgets, state.budgets);
}

export function validateBookkeepingPayload(value: unknown): { valid: true; payload: BookkeepingState } | { valid: false; message: string } {
  if (!isRecord(value) || !Array.isArray(value.records) || !Array.isArray(value.categories) || !Array.isArray(value.accounts) || !Array.isArray(value.budgets)) return { valid: false, message: "文件缺少账单、分类、账户或预算数据。" };
  const records = normalizeArray(value.records, normalizeRecord);
  const categories = normalizeArray(value.categories, normalizeCategory);
  const accounts = normalizeArray(value.accounts, normalizeAccount);
  const budgets = normalizeArray(value.budgets, normalizeBudget);
  if (records.length !== value.records.length || categories.length !== value.categories.length || accounts.length !== value.accounts.length || budgets.length !== value.budgets.length) return { valid: false, message: "文件中存在格式不完整或金额无效的数据，未导入任何内容。" };
  return { valid: true, payload: { version: 1, records, categories, accounts, budgets } };
}
