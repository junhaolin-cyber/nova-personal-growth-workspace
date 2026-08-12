"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { createDefaultFinanceState, FINANCE_STORAGE_KEYS, loadFinanceState, saveFinanceState } from "@/features/finance/storage";
import type { FinanceDailyPlan, FinanceFavorite, FinanceHistoryRecord, FinanceKnowledgeStatus, FinanceLearningState, FinanceProgress, FinanceReflection, FinanceSettings, FinanceQuizAttempt } from "@/features/finance/types";
import { notifyFourthBatchRemoteMerged } from "./events";
import { compareVersionedSnapshots } from "./conflict";
import { enqueueSyncOperation, removeSyncOperations } from "./engine";
import { isNetworkOnline } from "./network";
import { readSyncQueue } from "./storage";
import type { SyncQueueItem } from "./types";

export const FOURTH_BATCH_MODULES = ["finance"] as const;
export type FourthBatchModule = (typeof FOURTH_BATCH_MODULES)[number];
export type FourthBatchItemType =
  | "finance-settings"
  | "finance-daily-plan"
  | "finance-progress"
  | "finance-learning-record"
  | "finance-favorite"
  | "finance-reflection"
  | "finance-quiz-attempt";

type FinanceSettingsRow = Database["public"]["Tables"]["finance_learning_settings"]["Row"];
type FinancePlanRow = Database["public"]["Tables"]["finance_daily_plans"]["Row"];
type FinanceProgressRow = Database["public"]["Tables"]["finance_knowledge_progress"]["Row"];
type FinanceRecordRow = Database["public"]["Tables"]["finance_learning_records"]["Row"];
type FinanceFavoriteRow = Database["public"]["Tables"]["finance_favorites"]["Row"];
type FinanceReflectionRow = Database["public"]["Tables"]["finance_reflections"]["Row"];
type FinanceQuizRow = Database["public"]["Tables"]["finance_quiz_attempts"]["Row"];

type FinanceRowEnvelope =
  | { table: "finance_learning_settings"; row: FinanceSettingsRow }
  | { table: "finance_daily_plans"; row: FinancePlanRow }
  | { table: "finance_knowledge_progress"; row: FinanceProgressRow }
  | { table: "finance_learning_records"; row: FinanceRecordRow }
  | { table: "finance_favorites"; row: FinanceFavoriteRow }
  | { table: "finance_reflections"; row: FinanceReflectionRow }
  | { table: "finance_quiz_attempts"; row: FinanceQuizRow };

type LocalRecord = {
  key: string;
  module: FourthBatchModule;
  itemType: FourthBatchItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  clientUpdatedAt?: string;
};

type MetadataRecord = {
  module: FourthBatchModule;
  itemType: FourthBatchItemType;
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
const META_STORAGE_KEY = "nova:sync:fourth-batch-metadata:v1";

const statusToRemote: Record<FinanceKnowledgeStatus, string> = {
  "未开始": "not-started",
  "学习中": "learning",
  "已完成": "completed",
  "已掌握": "mastered",
};
const statusFromRemote: Record<string, FinanceKnowledgeStatus> = {
  "not-started": "未开始",
  learning: "学习中",
  completed: "已完成",
  mastered: "已掌握",
};
const levelToRemote: Record<FinanceSettings["level"], string> = { "初级": "beginner", "中级": "intermediate", "高级": "advanced" };
const levelFromRemote: Record<string, FinanceSettings["level"]> = { beginner: "初级", intermediate: "中级", advanced: "高级" };
const goalToRemote: Record<FinanceSettings["goal"], string> = { "日常财务": "daily-finance", "考试": "exam", "职场": "career", "长期规划": "long-term-planning" };
const goalFromRemote: Record<string, FinanceSettings["goal"]> = { "daily-finance": "日常财务", exam: "考试", career: "职场", "long-term-planning": "长期规划" };

function recordKey(itemType: FourthBatchItemType, entityId: string): string {
  return `finance:${itemType}:${entityId}`;
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
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isObject(parsed) ? parsed as MetadataMap : {};
  } catch {
    return {};
  }
}

function writeMetadata(metadata: MetadataMap): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metadata)); } catch { /* 元数据不可用不应阻塞理财学习 */ }
}

function payloadString(payload: Record<string, Json> | null | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function payloadNumber(payload: Record<string, Json> | null | undefined, key: string): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" ? value : undefined;
}

function payloadBoolean(payload: Record<string, Json> | null | undefined, key: string): boolean | undefined {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function payloadJson(payload: Record<string, Json> | null | undefined, key: string, fallback: Json): Json {
  return payload?.[key] ?? fallback;
}

function jsonStringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function signature(payload: Record<string, Json>): string {
  return JSON.stringify(payload);
}

function createLocalRecord(itemType: FourthBatchItemType, entityId: string, payload: Record<string, Json>, sourceStorageKey: string, clientCreatedAt: string, clientUpdatedAt?: string): LocalRecord {
  return { key: recordKey(itemType, entityId), module: "finance", itemType, entityId, payload, sourceStorageKey, clientCreatedAt, clientUpdatedAt };
}

function scanFinance(): LocalRecord[] {
  const state = loadFinanceState();
  const records: LocalRecord[] = [createLocalRecord("finance-settings", "settings", {
    level: levelToRemote[state.settings.level],
    goal: goalToRemote[state.settings.goal],
    dailyMinutes: state.settings.dailyMinutes,
    showBrief: state.settings.showBrief,
    practiceRequired: state.settings.practiceRequired,
    riskReminders: state.settings.riskReminders,
    preferredCategory: state.settings.preferredCategory,
  }, FINANCE_STORAGE_KEYS.settings, new Date().toISOString())];

  Object.entries(state.dailyPlans).forEach(([date, plan]) => records.push(createLocalRecord("finance-daily-plan", date, {
    planDate: plan.date,
    knowledgeIds: asJson(plan.knowledgeIds),
    reviewKnowledgeIds: asJson(plan.reviewKnowledgeIds),
    completedKnowledgeIds: asJson(plan.completedKnowledgeIds),
    completedQuizIds: asJson(plan.completedQuizIds),
    startedAt: plan.startedAt ?? null,
    completedAt: plan.completedAt ?? null,
  }, FINANCE_STORAGE_KEYS.daily, plan.startedAt ?? new Date().toISOString(), plan.completedAt ?? plan.startedAt)));

  Object.entries(state.progress).forEach(([knowledgeId, progress]) => records.push(createLocalRecord("finance-progress", knowledgeId, {
    knowledgeId,
    status: statusToRemote[progress.status],
    firstLearnedAt: progress.firstLearnedAt ?? null,
    lastStudiedAt: progress.lastStudiedAt ?? null,
    nextReviewAt: progress.nextReviewAt ?? null,
    reviewCount: progress.reviewCount,
    correctCount: progress.correctCount,
    wrongCount: progress.wrongCount,
    completedCount: progress.completedCount,
    isFavorite: progress.isFavorite,
  }, FINANCE_STORAGE_KEYS.daily, progress.firstLearnedAt ?? new Date().toISOString(), progress.lastStudiedAt)));

  Object.entries(state.history).forEach(([date, item]) => records.push(createLocalRecord("finance-learning-record", date, {
    recordDate: item.date,
    learnedCount: item.learnedCount,
    completedCount: item.completedCount,
    reviewCount: item.reviewCount,
    correctRate: item.correctRate,
    studyMinutes: item.studyMinutes,
    targetCompleted: item.targetCompleted,
  }, FINANCE_STORAGE_KEYS.history, item.date, item.date)));

  Object.entries(state.favorites).forEach(([id, item]) => records.push(createLocalRecord("finance-favorite", id, {
    favoriteType: item.type,
    itemTitle: item.title,
    createdAt: item.createdAt,
  }, FINANCE_STORAGE_KEYS.favorites, item.createdAt, item.createdAt)));

  Object.entries(state.reflections).forEach(([date, item]) => records.push(createLocalRecord("finance-reflection", date, {
    reflectionDate: item.date,
    content: item.content,
    reflectionUpdatedAt: item.updatedAt,
  }, FINANCE_STORAGE_KEYS.reflections, item.updatedAt, item.updatedAt)));

  state.quizAttempts.forEach((attempt) => records.push(createLocalRecord("finance-quiz-attempt", attempt.id, {
    attemptDate: attempt.date,
    knowledgeId: attempt.knowledgeId,
    questionId: attempt.questionId,
    selectedAnswer: attempt.selectedAnswer,
    isCorrect: attempt.correct,
  }, FINANCE_STORAGE_KEYS.quizAttempts, attempt.date, attempt.date)));
  return records;
}

export function scanLocalFourthBatchRecords(): LocalRecord[] {
  return scanFinance();
}

function isDefaultSettings(payload: Record<string, Json>): boolean {
  return payloadString(payload, "level") === "beginner"
    && payloadString(payload, "goal") === "daily-finance"
    && payloadNumber(payload, "dailyMinutes") === 15
    && payloadBoolean(payload, "showBrief") === true
    && payloadBoolean(payload, "practiceRequired") === true
    && payloadBoolean(payload, "riskReminders") === true
    && payloadString(payload, "preferredCategory") === "不限";
}

function shouldPreserveUntrackedLocal(record: LocalRecord): boolean {
  if (record.itemType === "finance-settings") return !isDefaultSettings(record.payload);
  if (record.itemType === "finance-daily-plan") return Boolean(record.payload.startedAt || record.payload.completedAt || jsonStringArray(payloadJson(record.payload, "completedKnowledgeIds", [])).length || jsonStringArray(payloadJson(record.payload, "completedQuizIds", [])).length);
  if (record.itemType === "finance-progress") return Boolean(record.payload.firstLearnedAt || record.payload.lastStudiedAt || record.payload.nextReviewAt || payloadNumber(record.payload, "reviewCount") || payloadNumber(record.payload, "correctCount") || payloadNumber(record.payload, "wrongCount") || payloadNumber(record.payload, "completedCount") || payloadBoolean(record.payload, "isFavorite"));
  if (record.itemType === "finance-learning-record") return Boolean(payloadNumber(record.payload, "learnedCount") || payloadNumber(record.payload, "completedCount") || payloadNumber(record.payload, "reviewCount") || payloadNumber(record.payload, "correctRate") || payloadNumber(record.payload, "studyMinutes") || payloadBoolean(record.payload, "targetCompleted"));
  return true;
}

function rowSnapshot(row: FinanceRowEnvelope["row"]): { updatedAt: string; version: number; deviceId: string; deletedAt: string | null } {
  return { updatedAt: row.client_updated_at, version: row.version, deviceId: row.source_device_id ?? "cloud", deletedAt: row.deleted_at };
}

function envelopeKey(envelope: FinanceRowEnvelope): string {
  return recordKey(envelope.table === "finance_learning_settings" ? "finance-settings" : envelope.table === "finance_daily_plans" ? "finance-daily-plan" : envelope.table === "finance_knowledge_progress" ? "finance-progress" : envelope.table === "finance_learning_records" ? "finance-learning-record" : envelope.table === "finance_favorites" ? "finance-favorite" : envelope.table === "finance_reflections" ? "finance-reflection" : "finance-quiz-attempt", envelope.row.local_id);
}

function envelopeSource(envelope: FinanceRowEnvelope): { itemType: FourthBatchItemType; sourceStorageKey: string } {
  switch (envelope.table) {
    case "finance_learning_settings": return { itemType: "finance-settings", sourceStorageKey: FINANCE_STORAGE_KEYS.settings };
    case "finance_daily_plans": return { itemType: "finance-daily-plan", sourceStorageKey: FINANCE_STORAGE_KEYS.daily };
    case "finance_knowledge_progress": return { itemType: "finance-progress", sourceStorageKey: FINANCE_STORAGE_KEYS.daily };
    case "finance_learning_records": return { itemType: "finance-learning-record", sourceStorageKey: FINANCE_STORAGE_KEYS.history };
    case "finance_favorites": return { itemType: "finance-favorite", sourceStorageKey: FINANCE_STORAGE_KEYS.favorites };
    case "finance_reflections": return { itemType: "finance-reflection", sourceStorageKey: FINANCE_STORAGE_KEYS.reflections };
    case "finance_quiz_attempts": return { itemType: "finance-quiz-attempt", sourceStorageKey: FINANCE_STORAGE_KEYS.quizAttempts };
  }
}

function envelopePayload(envelope: FinanceRowEnvelope): Record<string, Json> {
  switch (envelope.table) {
    case "finance_learning_settings": { const row = envelope.row as FinanceSettingsRow; return { level: row.level, goal: row.goal, dailyMinutes: row.daily_minutes, showBrief: row.show_brief, practiceRequired: row.practice_required, riskReminders: row.risk_reminders, preferredCategory: row.preferred_category }; }
    case "finance_daily_plans": { const row = envelope.row as FinancePlanRow; return { planDate: row.plan_date, knowledgeIds: row.knowledge_ids, reviewKnowledgeIds: row.review_knowledge_ids, completedKnowledgeIds: row.completed_knowledge_ids, completedQuizIds: row.completed_quiz_ids, startedAt: row.started_at, completedAt: row.completed_at }; }
    case "finance_knowledge_progress": { const row = envelope.row as FinanceProgressRow; return { knowledgeId: row.knowledge_id, status: row.status, firstLearnedAt: row.first_learned_at, lastStudiedAt: row.last_studied_at, nextReviewAt: row.next_review_at, reviewCount: row.review_count, correctCount: row.correct_count, wrongCount: row.wrong_count, completedCount: row.completed_count, isFavorite: row.is_favorite }; }
    case "finance_learning_records": { const row = envelope.row as FinanceRecordRow; return { recordDate: row.record_date, learnedCount: row.learned_count, completedCount: row.completed_count, reviewCount: row.review_count, correctRate: Number(row.correct_rate), studyMinutes: row.study_minutes, targetCompleted: row.target_completed }; }
    case "finance_favorites": { const row = envelope.row as FinanceFavoriteRow; return { favoriteType: row.favorite_type, itemTitle: row.item_title, createdAt: row.created_at_client }; }
    case "finance_reflections": { const row = envelope.row as FinanceReflectionRow; return { reflectionDate: row.reflection_date, content: row.content, reflectionUpdatedAt: row.reflection_updated_at }; }
    case "finance_quiz_attempts": { const row = envelope.row as FinanceQuizRow; return { attemptDate: row.attempt_date, knowledgeId: row.knowledge_id, questionId: row.question_id, selectedAnswer: row.selected_answer, isCorrect: row.is_correct }; }
  }
}

function mergeFinance(rows: FinanceRowEnvelope[]): boolean {
  if (!rows.length) return false;
  const current = loadFinanceState();
  const next: FinanceLearningState = {
    ...current,
    settings: { ...current.settings },
    dailyPlans: { ...current.dailyPlans },
    progress: { ...current.progress },
    history: { ...current.history },
    favorites: { ...current.favorites },
    reflections: { ...current.reflections },
    quizAttempts: [...current.quizAttempts],
  };
  const attempts = new Map(next.quizAttempts.map((item) => [item.id, item]));
  rows.forEach((envelope) => {
    if (envelope.table === "finance_learning_settings") {
      const row = envelope.row as FinanceSettingsRow;
      if (row.deleted_at) next.settings = createDefaultFinanceState().settings;
      else next.settings = { ...current.settings, level: levelFromRemote[row.level] ?? current.settings.level, goal: goalFromRemote[row.goal] ?? current.settings.goal, dailyMinutes: row.daily_minutes, showBrief: row.show_brief, practiceRequired: row.practice_required, riskReminders: row.risk_reminders, preferredCategory: row.preferred_category as FinanceSettings["preferredCategory"] };
    } else if (envelope.table === "finance_daily_plans") {
      const row = envelope.row as FinancePlanRow;
      if (row.deleted_at) delete next.dailyPlans[row.plan_date];
      else next.dailyPlans[row.plan_date] = { date: row.plan_date, knowledgeIds: jsonStringArray(row.knowledge_ids), reviewKnowledgeIds: jsonStringArray(row.review_knowledge_ids), completedKnowledgeIds: jsonStringArray(row.completed_knowledge_ids), completedQuizIds: jsonStringArray(row.completed_quiz_ids), startedAt: row.started_at ?? undefined, completedAt: row.completed_at ?? undefined } satisfies FinanceDailyPlan;
    } else if (envelope.table === "finance_knowledge_progress") {
      const row = envelope.row as FinanceProgressRow;
      if (row.deleted_at) delete next.progress[row.knowledge_id];
      else next.progress[row.knowledge_id] = { knowledgeId: row.knowledge_id, status: statusFromRemote[row.status] ?? "未开始", firstLearnedAt: row.first_learned_at ?? undefined, lastStudiedAt: row.last_studied_at ?? undefined, nextReviewAt: row.next_review_at ?? undefined, reviewCount: row.review_count, correctCount: row.correct_count, wrongCount: row.wrong_count, completedCount: row.completed_count, isFavorite: row.is_favorite } satisfies FinanceProgress;
    } else if (envelope.table === "finance_learning_records") {
      const row = envelope.row as FinanceRecordRow;
      if (row.deleted_at) delete next.history[row.record_date];
      else next.history[row.record_date] = { date: row.record_date, learnedCount: row.learned_count, completedCount: row.completed_count, reviewCount: row.review_count, correctRate: Number(row.correct_rate), studyMinutes: row.study_minutes, targetCompleted: row.target_completed } satisfies FinanceHistoryRecord;
    } else if (envelope.table === "finance_favorites") {
      const row = envelope.row as FinanceFavoriteRow;
      if (row.deleted_at) delete next.favorites[row.local_id];
      else next.favorites[row.local_id] = { id: row.local_id, type: row.favorite_type as FinanceFavorite["type"], title: row.item_title, createdAt: row.created_at_client };
      if (row.favorite_type === "knowledge") {
        const progress = next.progress[row.local_id];
        if (progress) next.progress[row.local_id] = { ...progress, isFavorite: !row.deleted_at };
        else if (!row.deleted_at) next.progress[row.local_id] = { knowledgeId: row.local_id, status: "未开始", reviewCount: 0, correctCount: 0, wrongCount: 0, completedCount: 0, isFavorite: true };
      }
    } else if (envelope.table === "finance_reflections") {
      const row = envelope.row as FinanceReflectionRow;
      if (row.deleted_at) delete next.reflections[row.reflection_date];
      else next.reflections[row.reflection_date] = { date: row.reflection_date, content: row.content, updatedAt: row.reflection_updated_at } satisfies FinanceReflection;
    } else if (envelope.table === "finance_quiz_attempts") {
      const row = envelope.row as FinanceQuizRow;
      if (row.deleted_at) attempts.delete(row.local_id);
      else attempts.set(row.local_id, { id: row.local_id, date: row.attempt_date, knowledgeId: row.knowledge_id, questionId: row.question_id, selectedAnswer: row.selected_answer, correct: row.is_correct } satisfies FinanceQuizAttempt);
    }
  });
  next.quizAttempts = Array.from(attempts.values()).slice(-300);
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  if (changed) saveFinanceState(next);
  return changed;
}

export async function pullAndMergeFourthBatch(client: SupabaseClient<Database>, userId: string): Promise<number> {
  const results = await Promise.all([
    client.from("finance_learning_settings").select("*").eq("user_id", userId),
    client.from("finance_daily_plans").select("*").eq("user_id", userId),
    client.from("finance_knowledge_progress").select("*").eq("user_id", userId),
    client.from("finance_learning_records").select("*").eq("user_id", userId),
    client.from("finance_favorites").select("*").eq("user_id", userId),
    client.from("finance_reflections").select("*").eq("user_id", userId),
    client.from("finance_quiz_attempts").select("*").eq("user_id", userId),
  ]);
  if (results.some((result) => result.error)) throw new Error("理财学习云端资料暂时无法读取，请稍后重试。");
  const rows: FinanceRowEnvelope[] = [
    ...(results[0].data ?? []).map((row) => ({ table: "finance_learning_settings" as const, row })),
    ...(results[1].data ?? []).map((row) => ({ table: "finance_daily_plans" as const, row })),
    ...(results[2].data ?? []).map((row) => ({ table: "finance_knowledge_progress" as const, row })),
    ...(results[3].data ?? []).map((row) => ({ table: "finance_learning_records" as const, row })),
    ...(results[4].data ?? []).map((row) => ({ table: "finance_favorites" as const, row })),
    ...(results[5].data ?? []).map((row) => ({ table: "finance_reflections" as const, row })),
    ...(results[6].data ?? []).map((row) => ({ table: "finance_quiz_attempts" as const, row })),
  ];
  const metadata = readMetadata();
  const local = new Map(scanFinance().map((record) => [record.key, record]));
  const applicable: FinanceRowEnvelope[] = [];
  const skippedLocalKeys = new Set<string>();
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    const localRecord = local.get(key);
    if (!previous && localRecord && !envelope.row.deleted_at && shouldPreserveUntrackedLocal(localRecord)) { skippedLocalKeys.add(key); return; }
    applicable.push(envelope);
  });
  const changed = mergeFinance(applicable);
  const afterLocal = new Map(scanFinance().map((record) => [record.key, record]));
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    if (skippedLocalKeys.has(key)) return;
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    const source = envelopeSource(envelope);
    const localRecord = afterLocal.get(key);
    const payload = envelopePayload(envelope);
    metadata[key] = { module: "finance", itemType: source.itemType, entityId: envelope.row.local_id, payload: localRecord?.payload ?? payload, sourceStorageKey: localRecord?.sourceStorageKey ?? source.sourceStorageKey, clientCreatedAt: localRecord?.clientCreatedAt ?? envelope.row.client_created_at, signature: signature(localRecord?.payload ?? payload), updatedAt: envelope.row.client_updated_at, version: envelope.row.version, deviceId: envelope.row.source_device_id ?? "cloud", deletedAt: envelope.row.deleted_at, localPresence: Boolean(localRecord) };
  });
  writeMetadata(metadata);
  if (changed) notifyFourthBatchRemoteMerged();
  return applicable.length;
}

export function enqueueLocalFourthBatchChanges(deviceId: string): number {
  const local = new Map(scanFinance().map((record) => [record.key, record]));
  const metadata = readMetadata();
  let queued = 0;
  local.forEach((record) => {
    const previous = metadata[record.key];
    const nextSignature = signature(record.payload);
    if (previous && !previous.deletedAt && previous.signature === nextSignature) { previous.localPresence = true; return; }
    const updatedAt = record.clientUpdatedAt ?? new Date().toISOString();
    const nextVersion = (previous?.version ?? 0) + 1;
    metadata[record.key] = { module: "finance", itemType: record.itemType, entityId: record.entityId, payload: record.payload, sourceStorageKey: record.sourceStorageKey, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt, signature: nextSignature, updatedAt, version: nextVersion, deviceId, deletedAt: null, localPresence: true };
    enqueueSyncOperation({ module: "finance", itemType: record.itemType, entityId: record.entityId, operation: "upsert", payload: { ...record.payload, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt }, sourceStorageKey: record.sourceStorageKey, deletedAt: null, version: nextVersion, deviceId, updatedAt });
    queued += 1;
  });
  Object.values(metadata).forEach((previous) => {
    if (previous.module !== "finance" || !previous.localPresence || local.has(recordKey(previous.itemType, previous.entityId)) || previous.deletedAt) return;
    const deletedAt = new Date().toISOString();
    const nextVersion = previous.version + 1;
    metadata[recordKey(previous.itemType, previous.entityId)] = { ...previous, updatedAt: deletedAt, version: nextVersion, deviceId, deletedAt, localPresence: false };
    enqueueSyncOperation({ module: "finance", itemType: previous.itemType, entityId: previous.entityId, operation: "delete", payload: { ...previous.payload, clientCreatedAt: previous.clientCreatedAt }, sourceStorageKey: previous.sourceStorageKey, deletedAt, version: nextVersion, deviceId, updatedAt: deletedAt });
    queued += 1;
  });
  writeMetadata(metadata);
  return queued;
}

function itemPayload(item: SyncQueueItem): Record<string, Json> {
  return (item.payload ?? {}) as Record<string, Json>;
}

function itemSnapshot(item: SyncQueueItem) {
  return { updatedAt: item.updatedAt, version: item.version, deviceId: item.deviceId, deletedAt: item.deletedAt ?? null };
}

function commonInsert(item: SyncQueueItem, userId: string) {
  return { user_id: userId, local_id: item.entityId, source_device_id: item.deviceId, source_storage_key: item.sourceStorageKey ?? "", version: item.version, client_created_at: payloadString(itemPayload(item), "clientCreatedAt") ?? new Date().toISOString(), client_updated_at: item.updatedAt, deleted_at: item.deletedAt ?? null };
}

async function pushOne(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  const payload = itemPayload(item);
  const base = commonInsert(item, userId);
  const key = `${item.module}:${item.itemType}`;
  if (key === "finance:finance-settings") {
    const { data: existing, error } = await client.from("finance_learning_settings").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_learning_settings"]["Insert"] = { ...base, level: payloadString(payload, "level") ?? existing?.level ?? "beginner", goal: payloadString(payload, "goal") ?? existing?.goal ?? "daily-finance", daily_minutes: payloadNumber(payload, "dailyMinutes") ?? existing?.daily_minutes ?? 15, show_brief: payloadBoolean(payload, "showBrief") ?? existing?.show_brief ?? true, practice_required: payloadBoolean(payload, "practiceRequired") ?? existing?.practice_required ?? true, risk_reminders: payloadBoolean(payload, "riskReminders") ?? existing?.risk_reminders ?? true, preferred_category: payloadString(payload, "preferredCategory") ?? existing?.preferred_category ?? "不限" };
    const result = await client.from("finance_learning_settings").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-daily-plan") {
    const { data: existing, error } = await client.from("finance_daily_plans").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_daily_plans"]["Insert"] = { ...base, plan_date: payloadString(payload, "planDate") ?? existing?.plan_date ?? item.entityId, knowledge_ids: payloadJson(payload, "knowledgeIds", []), review_knowledge_ids: payloadJson(payload, "reviewKnowledgeIds", []), completed_knowledge_ids: payloadJson(payload, "completedKnowledgeIds", []), completed_quiz_ids: payloadJson(payload, "completedQuizIds", []), started_at: payloadString(payload, "startedAt") ?? existing?.started_at ?? null, completed_at: payloadString(payload, "completedAt") ?? existing?.completed_at ?? null };
    const result = await client.from("finance_daily_plans").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-progress") {
    const { data: existing, error } = await client.from("finance_knowledge_progress").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_knowledge_progress"]["Insert"] = { ...base, knowledge_id: payloadString(payload, "knowledgeId") ?? existing?.knowledge_id ?? item.entityId, status: payloadString(payload, "status") ?? existing?.status ?? "not-started", first_learned_at: payloadString(payload, "firstLearnedAt") ?? existing?.first_learned_at ?? null, last_studied_at: payloadString(payload, "lastStudiedAt") ?? existing?.last_studied_at ?? null, next_review_at: payloadString(payload, "nextReviewAt") ?? existing?.next_review_at ?? null, review_count: payloadNumber(payload, "reviewCount") ?? existing?.review_count ?? 0, correct_count: payloadNumber(payload, "correctCount") ?? existing?.correct_count ?? 0, wrong_count: payloadNumber(payload, "wrongCount") ?? existing?.wrong_count ?? 0, completed_count: payloadNumber(payload, "completedCount") ?? existing?.completed_count ?? 0, is_favorite: payloadBoolean(payload, "isFavorite") ?? existing?.is_favorite ?? false };
    const result = await client.from("finance_knowledge_progress").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-learning-record") {
    const { data: existing, error } = await client.from("finance_learning_records").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_learning_records"]["Insert"] = { ...base, record_date: payloadString(payload, "recordDate") ?? existing?.record_date ?? item.entityId, learned_count: payloadNumber(payload, "learnedCount") ?? existing?.learned_count ?? 0, completed_count: payloadNumber(payload, "completedCount") ?? existing?.completed_count ?? 0, review_count: payloadNumber(payload, "reviewCount") ?? existing?.review_count ?? 0, correct_rate: payloadNumber(payload, "correctRate") ?? existing?.correct_rate ?? 0, study_minutes: payloadNumber(payload, "studyMinutes") ?? existing?.study_minutes ?? 0, target_completed: payloadBoolean(payload, "targetCompleted") ?? existing?.target_completed ?? false };
    const result = await client.from("finance_learning_records").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-favorite") {
    const { data: existing, error } = await client.from("finance_favorites").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_favorites"]["Insert"] = { ...base, favorite_type: payloadString(payload, "favoriteType") ?? existing?.favorite_type ?? "knowledge", item_title: payloadString(payload, "itemTitle") ?? existing?.item_title ?? item.entityId, created_at_client: payloadString(payload, "createdAt") ?? existing?.created_at_client ?? item.updatedAt };
    const result = await client.from("finance_favorites").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-reflection") {
    const { data: existing, error } = await client.from("finance_reflections").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_reflections"]["Insert"] = { ...base, reflection_date: payloadString(payload, "reflectionDate") ?? existing?.reflection_date ?? item.entityId, content: payloadString(payload, "content") ?? existing?.content ?? "", reflection_updated_at: payloadString(payload, "reflectionUpdatedAt") ?? existing?.reflection_updated_at ?? item.updatedAt };
    const result = await client.from("finance_reflections").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  if (key === "finance:finance-quiz-attempt") {
    const { data: existing, error } = await client.from("finance_quiz_attempts").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
    if (error) throw error;
    if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
    const row: Database["public"]["Tables"]["finance_quiz_attempts"]["Insert"] = { ...base, attempt_date: payloadString(payload, "attemptDate") ?? existing?.attempt_date ?? new Date().toISOString().slice(0, 10), knowledge_id: payloadString(payload, "knowledgeId") ?? existing?.knowledge_id ?? "unknown", question_id: payloadString(payload, "questionId") ?? existing?.question_id ?? "unknown", selected_answer: payloadString(payload, "selectedAnswer") ?? existing?.selected_answer ?? "", is_correct: payloadBoolean(payload, "isCorrect") ?? existing?.is_correct ?? false };
    const result = await client.from("finance_quiz_attempts").upsert(row, { onConflict: "user_id,local_id" });
    if (result.error) throw result.error;
    return true;
  }
  return false;
}

export async function pushFourthBatchQueue(client: SupabaseClient<Database>, userId: string): Promise<{ uploaded: number; failed: number }> {
  const queue = readSyncQueue().filter((item) => item.module === "finance");
  let uploaded = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      if (await pushOne(client, userId, item)) { uploaded += 1; removeSyncOperations([item.id]); } else failed += 1;
    } catch { failed += 1; }
  }
  return { uploaded, failed };
}

export type FourthBatchSyncResult = { queueSize: number; failed: number };

export async function runFourthBatchSyncCycle(client: SupabaseClient<Database>, userId: string, deviceId: string): Promise<FourthBatchSyncResult> {
  if (!isNetworkOnline()) throw new Error("当前处于离线状态。");
  enqueueLocalFourthBatchChanges(deviceId);
  await pullAndMergeFourthBatch(client, userId);
  const pushed = await pushFourthBatchQueue(client, userId);
  await pullAndMergeFourthBatch(client, userId);
  return { queueSize: readSyncQueue().filter((item) => item.module === "finance").length, failed: pushed.failed };
}
