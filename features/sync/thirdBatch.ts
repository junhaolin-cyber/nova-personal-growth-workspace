"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { createDefaultEnglishState, loadEnglishState, saveEnglishState, ENGLISH_STORAGE_KEY } from "@/features/english/storage";
import type { EnglishLearningState, WordProgress, DailyWordPlan, DailyLearningRecord, RecommendationState } from "@/features/english/types";
import { loadSpeakingState, saveSavedExpressions, saveSpeakingDraft, saveSpeakingSessions, saveSpeakingSettings, SPEAKING_STORAGE_KEYS, defaultSpeakingSettings } from "@/features/speaking/storage";
import type { SavedExpression, SpeakingDraft, SpeakingSessionRecord, SpeakingSettings, SpeakingStorageState } from "@/features/speaking/types";
import { notifyThirdBatchRemoteMerged } from "./events";
import { compareVersionedSnapshots } from "./conflict";
import { enqueueSyncOperation, removeSyncOperations } from "./engine";
import { isNetworkOnline } from "./network";
import { readSyncQueue } from "./storage";
import type { SyncQueueItem } from "./types";

export const THIRD_BATCH_MODULES = ["english", "speaking"] as const;
export type ThirdBatchModule = (typeof THIRD_BATCH_MODULES)[number];
export type ThirdBatchItemType =
  | "english-settings"
  | "english-word-progress"
  | "english-daily-plan"
  | "english-learning-record"
  | "english-recommendation"
  | "speaking-settings"
  | "speaking-session"
  | "speaking-expression"
  | "speaking-draft";

type EnglishSettingsRow = Database["public"]["Tables"]["english_learning_settings"]["Row"];
type EnglishProgressRow = Database["public"]["Tables"]["english_word_progress"]["Row"];
type EnglishPlanRow = Database["public"]["Tables"]["english_daily_plans"]["Row"];
type EnglishRecordRow = Database["public"]["Tables"]["english_learning_records"]["Row"];
type EnglishRecommendationRow = Database["public"]["Tables"]["english_recommendation_states"]["Row"];
type SpeakingSettingsRow = Database["public"]["Tables"]["speaking_settings"]["Row"];
type SpeakingSessionRow = Database["public"]["Tables"]["speaking_sessions"]["Row"];
type SpeakingExpressionRow = Database["public"]["Tables"]["speaking_expressions"]["Row"];
type SpeakingDraftRow = Database["public"]["Tables"]["speaking_drafts"]["Row"];

type RowEnvelope =
  | { table: "english_learning_settings"; row: EnglishSettingsRow }
  | { table: "english_word_progress"; row: EnglishProgressRow }
  | { table: "english_daily_plans"; row: EnglishPlanRow }
  | { table: "english_learning_records"; row: EnglishRecordRow }
  | { table: "english_recommendation_states"; row: EnglishRecommendationRow }
  | { table: "speaking_settings"; row: SpeakingSettingsRow }
  | { table: "speaking_sessions"; row: SpeakingSessionRow }
  | { table: "speaking_expressions"; row: SpeakingExpressionRow }
  | { table: "speaking_drafts"; row: SpeakingDraftRow };

type LocalRecord = {
  key: string;
  module: ThirdBatchModule;
  itemType: ThirdBatchItemType;
  entityId: string;
  payload: Record<string, Json>;
  sourceStorageKey: string;
  clientCreatedAt: string;
  clientUpdatedAt?: string;
};

type MetadataRecord = {
  module: ThirdBatchModule;
  itemType: ThirdBatchItemType;
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
const META_STORAGE_KEY = "nova:sync:third-batch-metadata:v1";

function recordKey(module: ThirdBatchModule, itemType: ThirdBatchItemType, entityId: string): string {
  return `${module}:${itemType}:${entityId}`;
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
  try {
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metadata));
  } catch {
    // Sync metadata is optional; module data remains available locally.
  }
}

function signature(payload: Record<string, Json>): string {
  return JSON.stringify(payload);
}

function createLocalRecord(module: ThirdBatchModule, itemType: ThirdBatchItemType, entityId: string, payload: Record<string, Json>, sourceStorageKey: string, clientCreatedAt: string, clientUpdatedAt?: string): LocalRecord {
  return { key: recordKey(module, itemType, entityId), module, itemType, entityId, payload, sourceStorageKey, clientCreatedAt, clientUpdatedAt };
}

function scanEnglish(): LocalRecord[] {
  const state = loadEnglishState();
  const records: LocalRecord[] = [createLocalRecord("english", "english-settings", "settings", {
    dailyWordCount: state.settings.dailyWordCount,
    accent: state.settings.accent,
  }, ENGLISH_STORAGE_KEY, new Date().toISOString())];

  Object.entries(state.wordProgress).forEach(([wordId, progress]) => records.push(createLocalRecord("english", "english-word-progress", wordId, {
    wordId,
    status: progress.status,
    firstLearnedAt: progress.firstLearnedAt ?? null,
    lastLearnedAt: progress.lastLearnedAt ?? null,
    nextReviewAt: progress.nextReviewAt ?? null,
    reviewCount: progress.reviewCount,
    correctCount: progress.correctCount,
    wrongCount: progress.wrongCount,
    isFavorite: progress.isFavorite,
    isInVocabularyBook: progress.isInVocabularyBook,
  }, ENGLISH_STORAGE_KEY, progress.firstLearnedAt ?? new Date().toISOString(), progress.lastLearnedAt)));

  Object.entries(state.dailyPlans).forEach(([date, plan]) => records.push(createLocalRecord("english", "english-daily-plan", date, {
    planDate: plan.date,
    wordIds: asJson(plan.wordIds),
    completedWordIds: asJson(plan.completedWordIds),
    reviewedWordIds: asJson(plan.reviewedWordIds),
    startedAt: plan.startedAt ?? null,
    completedAt: plan.completedAt ?? null,
  }, ENGLISH_STORAGE_KEY, plan.startedAt ?? new Date().toISOString(), plan.completedAt ?? plan.startedAt)));

  Object.entries(state.learningRecords).forEach(([date, record]) => records.push(createLocalRecord("english", "english-learning-record", date, {
    recordDate: record.date,
    learnedCount: record.learnedCount,
    masteredCount: record.masteredCount,
    reviewedCount: record.reviewedCount,
    correctRate: record.correctRate,
    durationMinutes: record.durationMinutes,
    targetCompleted: record.targetCompleted,
  }, ENGLISH_STORAGE_KEY, record.date, record.date)));

  Object.entries(state.recommendationState).forEach(([recommendationId, recommendation]) => records.push(createLocalRecord("english", "english-recommendation", recommendationId, {
    recommendationId,
    isFavorite: recommendation.isFavorite,
    isWatched: recommendation.isWatched,
    lastShownAt: recommendation.lastShownAt ?? null,
  }, ENGLISH_STORAGE_KEY, recommendation.lastShownAt ?? new Date().toISOString(), recommendation.lastShownAt)));

  return records;
}

function scanSpeaking(): LocalRecord[] {
  const state = loadSpeakingState();
  const records: LocalRecord[] = [createLocalRecord("speaking", "speaking-settings", "settings", {
    level: state.settings.level,
    accent: state.settings.accent,
    responseSpeed: state.settings.responseSpeed,
    showTranslation: state.settings.showTranslation,
    autoRead: state.settings.autoRead,
    dailyGoalMinutes: state.settings.dailyGoalMinutes,
    showFeedback: state.settings.showFeedback,
  }, SPEAKING_STORAGE_KEYS.settings, new Date().toISOString())];

  state.sessions.forEach((session) => records.push(createLocalRecord("speaking", "speaking-session", session.id, {
    sessionDate: session.date,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    scenarioId: session.scenarioId,
    scenarioTitle: session.scenarioTitle,
    difficulty: session.difficulty,
    turnCount: session.turnCount,
    userMessages: asJson(session.userMessages),
    aiMessages: asJson(session.aiMessages),
    feedback: asJson(session.feedback),
    savedExpressionIds: asJson(session.savedExpressionIds),
    durationSeconds: session.durationSeconds,
    summaryLevel: session.summaryLevel,
    improvement: session.improvement,
  }, SPEAKING_STORAGE_KEYS.sessions, session.startedAt, session.endedAt)));

  state.expressions.forEach((expression) => records.push(createLocalRecord("speaking", "speaking-expression", expression.id, {
    expression: expression.expression,
    explanation: expression.explanation,
    scenarioId: expression.scenarioId,
    scenarioTitle: expression.scenarioTitle,
    sourceDate: expression.sourceDate,
    originalText: expression.originalText,
    savedAt: expression.savedAt,
  }, SPEAKING_STORAGE_KEYS.expressions, expression.savedAt, expression.savedAt)));

  if (state.draft) records.push(createLocalRecord("speaking", "speaking-draft", "active", {
    scenarioId: state.draft.scenarioId,
    startedAt: state.draft.startedAt,
    messages: asJson(state.draft.messages),
    hintLevel: state.draft.hintLevel,
  }, SPEAKING_STORAGE_KEYS.draft, state.draft.startedAt, state.draft.startedAt));

  return records;
}

export function scanLocalThirdBatchRecords(): LocalRecord[] {
  return [...scanEnglish(), ...scanSpeaking()];
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

function rowSnapshot(row: RowEnvelope["row"]): { updatedAt: string; version: number; deviceId: string; deletedAt: string | null } {
  return { updatedAt: row.client_updated_at, version: row.version, deviceId: row.source_device_id ?? "cloud", deletedAt: row.deleted_at };
}

function envelopeKey(envelope: RowEnvelope): string {
  const { row } = envelope;
  switch (envelope.table) {
    case "english_learning_settings": return recordKey("english", "english-settings", row.local_id);
    case "english_word_progress": return recordKey("english", "english-word-progress", row.local_id);
    case "english_daily_plans": return recordKey("english", "english-daily-plan", row.local_id);
    case "english_learning_records": return recordKey("english", "english-learning-record", row.local_id);
    case "english_recommendation_states": return recordKey("english", "english-recommendation", row.local_id);
    case "speaking_settings": return recordKey("speaking", "speaking-settings", row.local_id);
    case "speaking_sessions": return recordKey("speaking", "speaking-session", row.local_id);
    case "speaking_expressions": return recordKey("speaking", "speaking-expression", row.local_id);
    case "speaking_drafts": return recordKey("speaking", "speaking-draft", row.local_id);
  }
}

function envelopeSource(envelope: RowEnvelope): { module: ThirdBatchModule; itemType: ThirdBatchItemType; sourceStorageKey: string } {
  switch (envelope.table) {
    case "english_learning_settings": return { module: "english", itemType: "english-settings", sourceStorageKey: ENGLISH_STORAGE_KEY };
    case "english_word_progress": return { module: "english", itemType: "english-word-progress", sourceStorageKey: ENGLISH_STORAGE_KEY };
    case "english_daily_plans": return { module: "english", itemType: "english-daily-plan", sourceStorageKey: ENGLISH_STORAGE_KEY };
    case "english_learning_records": return { module: "english", itemType: "english-learning-record", sourceStorageKey: ENGLISH_STORAGE_KEY };
    case "english_recommendation_states": return { module: "english", itemType: "english-recommendation", sourceStorageKey: ENGLISH_STORAGE_KEY };
    case "speaking_settings": return { module: "speaking", itemType: "speaking-settings", sourceStorageKey: SPEAKING_STORAGE_KEYS.settings };
    case "speaking_sessions": return { module: "speaking", itemType: "speaking-session", sourceStorageKey: SPEAKING_STORAGE_KEYS.sessions };
    case "speaking_expressions": return { module: "speaking", itemType: "speaking-expression", sourceStorageKey: SPEAKING_STORAGE_KEYS.expressions };
    case "speaking_drafts": return { module: "speaking", itemType: "speaking-draft", sourceStorageKey: SPEAKING_STORAGE_KEYS.draft };
  }
}

function envelopePayload(envelope: RowEnvelope): Record<string, Json> {
  switch (envelope.table) {
    case "english_learning_settings": { const row = envelope.row; return { dailyWordCount: row.daily_word_count, accent: row.accent }; }
    case "english_word_progress": { const row = envelope.row; return { wordId: row.word_id, status: row.status, firstLearnedAt: row.first_learned_at, lastLearnedAt: row.last_learned_at, nextReviewAt: row.next_review_at, reviewCount: row.review_count, correctCount: row.correct_count, wrongCount: row.wrong_count, isFavorite: row.is_favorite, isInVocabularyBook: row.is_in_vocabulary_book }; }
    case "english_daily_plans": { const row = envelope.row; return { planDate: row.plan_date, wordIds: row.word_ids, completedWordIds: row.completed_word_ids, reviewedWordIds: row.reviewed_word_ids, startedAt: row.started_at, completedAt: row.completed_at }; }
    case "english_learning_records": { const row = envelope.row; return { recordDate: row.record_date, learnedCount: row.learned_count, masteredCount: row.mastered_count, reviewedCount: row.reviewed_count, correctRate: row.correct_rate, durationMinutes: row.duration_minutes, targetCompleted: row.target_completed }; }
    case "english_recommendation_states": { const row = envelope.row; return { recommendationId: row.recommendation_id, isFavorite: row.is_favorite, isWatched: row.is_watched, lastShownAt: row.last_shown_at }; }
    case "speaking_settings": { const row = envelope.row; return { level: row.level, accent: row.accent, responseSpeed: row.response_speed, showTranslation: row.show_translation, autoRead: row.auto_read, dailyGoalMinutes: row.daily_goal_minutes, showFeedback: row.show_feedback }; }
    case "speaking_sessions": { const row = envelope.row; return { sessionDate: row.session_date, startedAt: row.started_at, endedAt: row.ended_at, scenarioId: row.scenario_id, scenarioTitle: row.scenario_title, difficulty: row.difficulty, turnCount: row.turn_count, userMessages: row.user_messages, aiMessages: row.ai_messages, feedback: row.feedback, savedExpressionIds: row.saved_expression_ids, durationSeconds: row.duration_seconds, summaryLevel: row.summary_level, improvement: row.improvement }; }
    case "speaking_expressions": { const row = envelope.row; return { expression: row.expression, explanation: row.explanation, scenarioId: row.scenario_id, scenarioTitle: row.scenario_title, sourceDate: row.source_date, originalText: row.original_text, savedAt: row.saved_at }; }
    case "speaking_drafts": { const row = envelope.row; return { scenarioId: row.scenario_id, startedAt: row.started_at, messages: row.messages, hintLevel: row.hint_level }; }
  }
}

function toWordProgress(row: EnglishProgressRow): WordProgress {
  return { wordId: row.word_id, status: row.status as WordProgress["status"], firstLearnedAt: row.first_learned_at ?? undefined, lastLearnedAt: row.last_learned_at ?? undefined, nextReviewAt: row.next_review_at ?? undefined, reviewCount: row.review_count, correctCount: row.correct_count, wrongCount: row.wrong_count, isFavorite: row.is_favorite, isInVocabularyBook: row.is_in_vocabulary_book };
}

function jsonStringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeEnglish(rows: RowEnvelope[]): boolean {
  if (!rows.some((envelope) => envelope.table.startsWith("english_"))) return false;
  const current = loadEnglishState();
  const next: EnglishLearningState = { ...current, settings: { ...current.settings }, dailyPlans: { ...current.dailyPlans }, wordProgress: { ...current.wordProgress }, learningRecords: { ...current.learningRecords }, recommendationState: { ...current.recommendationState } };
  let changed = false;
  rows.forEach((envelope) => {
    if (!envelope.table.startsWith("english_")) return;
    if (envelope.table === "english_learning_settings") {
      const row = envelope.row;
      if (row.deleted_at) next.settings = createDefaultEnglishState().settings;
      else next.settings = { dailyWordCount: row.daily_word_count, accent: row.accent as EnglishLearningState["settings"]["accent"] };
      changed = true;
    } else if (envelope.table === "english_word_progress") {
      const row = envelope.row;
      if (row.deleted_at) delete next.wordProgress[row.word_id]; else next.wordProgress[row.word_id] = toWordProgress(row);
      changed = true;
    } else if (envelope.table === "english_daily_plans") {
      const row = envelope.row;
      if (row.deleted_at) delete next.dailyPlans[row.plan_date]; else next.dailyPlans[row.plan_date] = { date: row.plan_date, wordIds: jsonStringArray(row.word_ids), completedWordIds: jsonStringArray(row.completed_word_ids), reviewedWordIds: jsonStringArray(row.reviewed_word_ids), startedAt: row.started_at ?? undefined, completedAt: row.completed_at ?? undefined } satisfies DailyWordPlan;
      changed = true;
    } else if (envelope.table === "english_learning_records") {
      const row = envelope.row;
      if (row.deleted_at) delete next.learningRecords[row.record_date]; else next.learningRecords[row.record_date] = { date: row.record_date, learnedCount: row.learned_count, masteredCount: row.mastered_count, reviewedCount: row.reviewed_count, correctRate: Number(row.correct_rate), durationMinutes: row.duration_minutes, targetCompleted: row.target_completed } satisfies DailyLearningRecord;
      changed = true;
    } else if (envelope.table === "english_recommendation_states") {
      const row = envelope.row;
      if (row.deleted_at) delete next.recommendationState[row.recommendation_id]; else next.recommendationState[row.recommendation_id] = { isFavorite: row.is_favorite, isWatched: row.is_watched, lastShownAt: row.last_shown_at ?? undefined } satisfies RecommendationState;
      changed = true;
    }
  });
  if (changed) saveEnglishState(next);
  return changed;
}

function toSpeakingSettings(row: SpeakingSettingsRow): SpeakingSettings {
  return { level: row.level as SpeakingSettings["level"], accent: row.accent as SpeakingSettings["accent"], responseSpeed: row.response_speed as SpeakingSettings["responseSpeed"], showTranslation: row.show_translation, autoRead: row.auto_read, dailyGoalMinutes: row.daily_goal_minutes as SpeakingSettings["dailyGoalMinutes"], showFeedback: row.show_feedback };
}

function toSpeakingSession(row: SpeakingSessionRow): SpeakingSessionRecord {
  return { id: row.local_id, date: row.session_date, startedAt: row.started_at, endedAt: row.ended_at, scenarioId: row.scenario_id, scenarioTitle: row.scenario_title, difficulty: row.difficulty as SpeakingSessionRecord["difficulty"], turnCount: row.turn_count, userMessages: row.user_messages as SpeakingSessionRecord["userMessages"], aiMessages: row.ai_messages as SpeakingSessionRecord["aiMessages"], feedback: row.feedback as SpeakingSessionRecord["feedback"], savedExpressionIds: jsonStringArray(row.saved_expression_ids), durationSeconds: row.duration_seconds, summaryLevel: row.summary_level as SpeakingSessionRecord["summaryLevel"], improvement: row.improvement };
}

function toSpeakingExpression(row: SpeakingExpressionRow): SavedExpression {
  return { id: row.local_id, expression: row.expression, explanation: row.explanation, scenarioId: row.scenario_id, scenarioTitle: row.scenario_title, sourceDate: row.source_date, originalText: row.original_text, savedAt: row.saved_at };
}

function toSpeakingDraft(row: SpeakingDraftRow): SpeakingDraft {
  return { scenarioId: row.scenario_id, startedAt: row.started_at, messages: row.messages as SpeakingDraft["messages"], hintLevel: row.hint_level };
}

function mergeSpeaking(rows: RowEnvelope[]): boolean {
  if (!rows.some((envelope) => envelope.table.startsWith("speaking_"))) return false;
  const current = loadSpeakingState();
  const next: SpeakingStorageState = { ...current, settings: current.settings, sessions: [...current.sessions], expressions: [...current.expressions], draft: current.draft };
  const sessions = new Map(next.sessions.map((session) => [session.id, session]));
  const expressions = new Map(next.expressions.map((expression) => [expression.id, expression]));
  let changed = false;
  rows.forEach((envelope) => {
    if (!envelope.table.startsWith("speaking_")) return;
    if (envelope.table === "speaking_settings") { const row = envelope.row; next.settings = row.deleted_at ? defaultSpeakingSettings : toSpeakingSettings(row); }
    if (envelope.table === "speaking_sessions") { const row = envelope.row; if (row.deleted_at) sessions.delete(row.local_id); else sessions.set(row.local_id, toSpeakingSession(row)); }
    if (envelope.table === "speaking_expressions") { const row = envelope.row; if (row.deleted_at) expressions.delete(row.local_id); else expressions.set(row.local_id, toSpeakingExpression(row)); }
    if (envelope.table === "speaking_drafts") { const row = envelope.row; next.draft = row.deleted_at ? null : toSpeakingDraft(row); }
    changed = true;
  });
  next.sessions = Array.from(sessions.values());
  next.expressions = Array.from(expressions.values());
  if (changed) {
    saveSpeakingSettings(next.settings);
    saveSpeakingSessions(next.sessions);
    saveSavedExpressions(next.expressions);
    saveSpeakingDraft(next.draft);
  }
  return changed;
}

export async function pullAndMergeThirdBatch(client: SupabaseClient<Database>, userId: string): Promise<number> {
  const results = await Promise.all([
    client.from("english_learning_settings").select("*").eq("user_id", userId),
    client.from("english_word_progress").select("*").eq("user_id", userId),
    client.from("english_daily_plans").select("*").eq("user_id", userId),
    client.from("english_learning_records").select("*").eq("user_id", userId),
    client.from("english_recommendation_states").select("*").eq("user_id", userId),
    client.from("speaking_settings").select("*").eq("user_id", userId),
    client.from("speaking_sessions").select("*").eq("user_id", userId),
    client.from("speaking_expressions").select("*").eq("user_id", userId),
    client.from("speaking_drafts").select("*").eq("user_id", userId),
  ]);
  if (results.some((result) => result.error)) throw new Error("第三批云端资料暂时无法读取，请稍后重试。");

  const rows: RowEnvelope[] = [
    ...(results[0].data ?? []).map((row) => ({ table: "english_learning_settings" as const, row })),
    ...(results[1].data ?? []).map((row) => ({ table: "english_word_progress" as const, row })),
    ...(results[2].data ?? []).map((row) => ({ table: "english_daily_plans" as const, row })),
    ...(results[3].data ?? []).map((row) => ({ table: "english_learning_records" as const, row })),
    ...(results[4].data ?? []).map((row) => ({ table: "english_recommendation_states" as const, row })),
    ...(results[5].data ?? []).map((row) => ({ table: "speaking_settings" as const, row })),
    ...(results[6].data ?? []).map((row) => ({ table: "speaking_sessions" as const, row })),
    ...(results[7].data ?? []).map((row) => ({ table: "speaking_expressions" as const, row })),
    ...(results[8].data ?? []).map((row) => ({ table: "speaking_drafts" as const, row })),
  ];
  const metadata = readMetadata();
  const local = new Map(scanLocalThirdBatchRecords().map((record) => [record.key, record]));
  const applicable: RowEnvelope[] = [];
  const skippedLocalKeys = new Set<string>();
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    if (!previous && local.has(key) && !envelope.row.deleted_at) { skippedLocalKeys.add(key); return; }
    applicable.push(envelope);
  });

  mergeEnglish(applicable);
  mergeSpeaking(applicable);
  const afterLocal = new Map(scanLocalThirdBatchRecords().map((record) => [record.key, record]));
  rows.forEach((envelope) => {
    const key = envelopeKey(envelope);
    if (skippedLocalKeys.has(key)) return;
    const previous = metadata[key];
    if (previous && compareVersionedSnapshots(rowSnapshot(envelope.row), previous) < 0) return;
    const source = envelopeSource(envelope);
    const localRecord = afterLocal.get(key);
    const payload = envelopePayload(envelope);
    metadata[key] = {
      module: source.module,
      itemType: source.itemType,
      entityId: envelope.row.local_id,
      payload: localRecord?.payload ?? payload,
      sourceStorageKey: localRecord?.sourceStorageKey ?? source.sourceStorageKey,
      clientCreatedAt: localRecord?.clientCreatedAt ?? envelope.row.client_created_at,
      signature: localRecord ? signature(localRecord.payload) : signature(payload),
      updatedAt: envelope.row.client_updated_at,
      version: envelope.row.version,
      deviceId: envelope.row.source_device_id ?? "cloud",
      deletedAt: envelope.row.deleted_at,
      localPresence: Boolean(localRecord),
    };
  });
  writeMetadata(metadata);
  if (applicable.length > 0) notifyThirdBatchRemoteMerged();
  return applicable.length;
}

export function enqueueLocalThirdBatchChanges(deviceId: string): number {
  const local = new Map(scanLocalThirdBatchRecords().map((record) => [record.key, record]));
  const metadata = readMetadata();
  let queued = 0;
  local.forEach((record) => {
    const previous = metadata[record.key];
    const nextSignature = signature(record.payload);
    if (previous && !previous.deletedAt && previous.signature === nextSignature) { previous.localPresence = true; return; }
    const updatedAt = record.clientUpdatedAt ?? new Date().toISOString();
    const nextVersion = (previous?.version ?? 0) + 1;
    metadata[record.key] = { module: record.module, itemType: record.itemType, entityId: record.entityId, payload: record.payload, sourceStorageKey: record.sourceStorageKey, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt, signature: nextSignature, updatedAt, version: nextVersion, deviceId, deletedAt: null, localPresence: true };
    enqueueSyncOperation({ module: record.module, itemType: record.itemType, entityId: record.entityId, operation: "upsert", payload: { ...record.payload, clientCreatedAt: previous?.clientCreatedAt ?? record.clientCreatedAt }, sourceStorageKey: record.sourceStorageKey, deletedAt: null, version: nextVersion, deviceId, updatedAt });
    queued += 1;
  });
  Object.values(metadata).forEach((previous) => {
    if (!THIRD_BATCH_MODULES.includes(previous.module) || !previous.localPresence || local.has(recordKey(previous.module, previous.itemType, previous.entityId)) || previous.deletedAt) return;
    const deletedAt = new Date().toISOString();
    const nextVersion = previous.version + 1;
    metadata[recordKey(previous.module, previous.itemType, previous.entityId)] = { ...previous, updatedAt: deletedAt, version: nextVersion, deviceId, deletedAt, localPresence: false };
    enqueueSyncOperation({ module: previous.module, itemType: previous.itemType, entityId: previous.entityId, operation: "delete", payload: { ...previous.payload, clientCreatedAt: previous.clientCreatedAt }, sourceStorageKey: previous.sourceStorageKey, deletedAt, version: nextVersion, deviceId, updatedAt: deletedAt });
    queued += 1;
  });
  writeMetadata(metadata);
  return queued;
}

function itemSnapshot(item: SyncQueueItem) {
  return { updatedAt: item.updatedAt, version: item.version, deviceId: item.deviceId, deletedAt: item.deletedAt ?? null };
}

function itemPayload(item: SyncQueueItem): Record<string, Json> {
  return (item.payload ?? {}) as Record<string, Json>;
}

function commonInsert(item: SyncQueueItem, userId: string) {
  return { user_id: userId, local_id: item.entityId, source_device_id: item.deviceId, source_storage_key: item.sourceStorageKey ?? "", version: item.version, client_created_at: payloadString(itemPayload(item), "clientCreatedAt") ?? new Date().toISOString(), client_updated_at: item.updatedAt, deleted_at: item.deletedAt ?? null };
}

async function pushOne(client: SupabaseClient<Database>, userId: string, item: SyncQueueItem): Promise<boolean> {
  const payload = itemPayload(item);
  const base = commonInsert(item, userId);
  switch (`${item.module}:${item.itemType}`) {
    case "english:english-settings": {
      const { data: existing, error: readError } = await client.from("english_learning_settings").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["english_learning_settings"]["Insert"] = { ...base, daily_word_count: payloadNumber(payload, "dailyWordCount") ?? existing?.daily_word_count ?? 10, accent: payloadString(payload, "accent") ?? existing?.accent ?? "us" };
      const { error } = await client.from("english_learning_settings").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "english:english-word-progress": {
      const { data: existing, error: readError } = await client.from("english_word_progress").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["english_word_progress"]["Insert"] = { ...base, word_id: payloadString(payload, "wordId") ?? existing?.word_id ?? item.entityId, status: payloadString(payload, "status") ?? existing?.status ?? "unknown", first_learned_at: payloadString(payload, "firstLearnedAt") ?? existing?.first_learned_at ?? null, last_learned_at: payloadString(payload, "lastLearnedAt") ?? existing?.last_learned_at ?? null, next_review_at: payloadString(payload, "nextReviewAt") ?? existing?.next_review_at ?? null, review_count: payloadNumber(payload, "reviewCount") ?? existing?.review_count ?? 0, correct_count: payloadNumber(payload, "correctCount") ?? existing?.correct_count ?? 0, wrong_count: payloadNumber(payload, "wrongCount") ?? existing?.wrong_count ?? 0, is_favorite: payloadBoolean(payload, "isFavorite") ?? existing?.is_favorite ?? false, is_in_vocabulary_book: payloadBoolean(payload, "isInVocabularyBook") ?? existing?.is_in_vocabulary_book ?? false };
      const { error } = await client.from("english_word_progress").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "english:english-daily-plan": {
      const { data: existing, error: readError } = await client.from("english_daily_plans").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["english_daily_plans"]["Insert"] = { ...base, plan_date: payloadString(payload, "planDate") ?? existing?.plan_date ?? item.entityId, word_ids: payloadJson(payload, "wordIds", []), completed_word_ids: payloadJson(payload, "completedWordIds", []), reviewed_word_ids: payloadJson(payload, "reviewedWordIds", []), started_at: payloadString(payload, "startedAt") ?? existing?.started_at ?? null, completed_at: payloadString(payload, "completedAt") ?? existing?.completed_at ?? null };
      const { error } = await client.from("english_daily_plans").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "english:english-learning-record": {
      const { data: existing, error: readError } = await client.from("english_learning_records").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["english_learning_records"]["Insert"] = { ...base, record_date: payloadString(payload, "recordDate") ?? existing?.record_date ?? item.entityId, learned_count: payloadNumber(payload, "learnedCount") ?? existing?.learned_count ?? 0, mastered_count: payloadNumber(payload, "masteredCount") ?? existing?.mastered_count ?? 0, reviewed_count: payloadNumber(payload, "reviewedCount") ?? existing?.reviewed_count ?? 0, correct_rate: payloadNumber(payload, "correctRate") ?? existing?.correct_rate ?? 0, duration_minutes: payloadNumber(payload, "durationMinutes") ?? existing?.duration_minutes ?? 0, target_completed: payloadBoolean(payload, "targetCompleted") ?? existing?.target_completed ?? false };
      const { error } = await client.from("english_learning_records").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "english:english-recommendation": {
      const { data: existing, error: readError } = await client.from("english_recommendation_states").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["english_recommendation_states"]["Insert"] = { ...base, recommendation_id: payloadString(payload, "recommendationId") ?? existing?.recommendation_id ?? item.entityId, is_favorite: payloadBoolean(payload, "isFavorite") ?? existing?.is_favorite ?? false, is_watched: payloadBoolean(payload, "isWatched") ?? existing?.is_watched ?? false, last_shown_at: payloadString(payload, "lastShownAt") ?? existing?.last_shown_at ?? null };
      const { error } = await client.from("english_recommendation_states").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "speaking:speaking-settings": {
      const { data: existing, error: readError } = await client.from("speaking_settings").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["speaking_settings"]["Insert"] = { ...base, level: payloadString(payload, "level") ?? existing?.level ?? "beginner", accent: payloadString(payload, "accent") ?? existing?.accent ?? "us", response_speed: payloadString(payload, "responseSpeed") ?? existing?.response_speed ?? "normal", show_translation: payloadBoolean(payload, "showTranslation") ?? existing?.show_translation ?? true, auto_read: payloadBoolean(payload, "autoRead") ?? existing?.auto_read ?? false, daily_goal_minutes: payloadNumber(payload, "dailyGoalMinutes") ?? existing?.daily_goal_minutes ?? 10, show_feedback: payloadBoolean(payload, "showFeedback") ?? existing?.show_feedback ?? true };
      const { error } = await client.from("speaking_settings").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "speaking:speaking-session": {
      const { data: existing, error: readError } = await client.from("speaking_sessions").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["speaking_sessions"]["Insert"] = { ...base, session_date: payloadString(payload, "sessionDate") ?? existing?.session_date ?? new Date().toISOString().slice(0, 10), started_at: payloadString(payload, "startedAt") ?? existing?.started_at ?? new Date().toISOString(), ended_at: payloadString(payload, "endedAt") ?? existing?.ended_at ?? new Date().toISOString(), scenario_id: payloadString(payload, "scenarioId") ?? existing?.scenario_id ?? "unknown", scenario_title: payloadString(payload, "scenarioTitle") ?? existing?.scenario_title ?? "", difficulty: payloadString(payload, "difficulty") ?? existing?.difficulty ?? "beginner", turn_count: payloadNumber(payload, "turnCount") ?? existing?.turn_count ?? 0, user_messages: payloadJson(payload, "userMessages", []), ai_messages: payloadJson(payload, "aiMessages", []), feedback: payloadJson(payload, "feedback", []), saved_expression_ids: payloadJson(payload, "savedExpressionIds", []), duration_seconds: payloadNumber(payload, "durationSeconds") ?? existing?.duration_seconds ?? 0, summary_level: payloadString(payload, "summaryLevel") ?? existing?.summary_level ?? "needs-practice", improvement: payloadString(payload, "improvement") ?? existing?.improvement ?? "" };
      const { error } = await client.from("speaking_sessions").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "speaking:speaking-expression": {
      const { data: existing, error: readError } = await client.from("speaking_expressions").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["speaking_expressions"]["Insert"] = { ...base, expression: payloadString(payload, "expression") ?? existing?.expression ?? "", explanation: payloadString(payload, "explanation") ?? existing?.explanation ?? "", scenario_id: payloadString(payload, "scenarioId") ?? existing?.scenario_id ?? "unknown", scenario_title: payloadString(payload, "scenarioTitle") ?? existing?.scenario_title ?? "", source_date: payloadString(payload, "sourceDate") ?? existing?.source_date ?? new Date().toISOString().slice(0, 10), original_text: payloadString(payload, "originalText") ?? existing?.original_text ?? "", saved_at: payloadString(payload, "savedAt") ?? existing?.saved_at ?? new Date().toISOString() };
      const { error } = await client.from("speaking_expressions").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    case "speaking:speaking-draft": {
      const { data: existing, error: readError } = await client.from("speaking_drafts").select("*").eq("user_id", userId).eq("local_id", item.entityId).maybeSingle();
      if (readError) throw readError;
      if (existing && compareVersionedSnapshots(rowSnapshot(existing), itemSnapshot(item)) > 0) return true;
      const row: Database["public"]["Tables"]["speaking_drafts"]["Insert"] = { ...base, scenario_id: payloadString(payload, "scenarioId") ?? existing?.scenario_id ?? "unknown", started_at: payloadString(payload, "startedAt") ?? existing?.started_at ?? new Date().toISOString(), messages: payloadJson(payload, "messages", []), hint_level: payloadNumber(payload, "hintLevel") ?? existing?.hint_level ?? 0 };
      const { error } = await client.from("speaking_drafts").upsert(row, { onConflict: "user_id,local_id" });
      if (error) throw error;
      return true;
    }
    default:
      return false;
  }
}

export async function pushThirdBatchQueue(client: SupabaseClient<Database>, userId: string): Promise<{ uploaded: number; failed: number }> {
  const queue = readSyncQueue().filter((item) => THIRD_BATCH_MODULES.includes(item.module as ThirdBatchModule));
  let uploaded = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      if (await pushOne(client, userId, item)) { uploaded += 1; removeSyncOperations([item.id]); } else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { uploaded, failed };
}

export type ThirdBatchSyncResult = { queueSize: number; failed: number };

export async function runThirdBatchSyncCycle(client: SupabaseClient<Database>, userId: string, deviceId: string): Promise<ThirdBatchSyncResult> {
  if (!isNetworkOnline()) throw new Error("当前处于离线状态。");
  enqueueLocalThirdBatchChanges(deviceId);
  const pushed = await pushThirdBatchQueue(client, userId);
  await pullAndMergeThirdBatch(client, userId);
  return { queueSize: readSyncQueue().filter((item) => THIRD_BATCH_MODULES.includes(item.module as ThirdBatchModule)).length, failed: pushed.failed };
}
