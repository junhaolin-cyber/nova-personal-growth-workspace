import type { DailyLearningRecord, DailyWordPlan, EnglishLearningSettings, EnglishLearningState, RecommendationState, WordProgress, WordStatus } from "./types";
import { notifyThirdBatchStorageChanged } from "@/features/sync/events";

export const ENGLISH_STORAGE_KEY = "nova:english-learning:v1";

const defaultSettings: EnglishLearningSettings = { dailyWordCount: 10, accent: "us" };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false) => typeof value === "boolean" ? value : fallback;
const validStatuses: WordStatus[] = ["unknown", "fuzzy", "known", "mastered"];

function normalizeProgress(value: unknown, wordId: string): WordProgress {
  const source = isRecord(value) ? value : {};
  const status = validStatuses.includes(source.status as WordStatus) ? source.status as WordStatus : "unknown";
  return {
    wordId,
    status,
    firstLearnedAt: typeof source.firstLearnedAt === "string" ? source.firstLearnedAt : undefined,
    lastLearnedAt: typeof source.lastLearnedAt === "string" ? source.lastLearnedAt : undefined,
    nextReviewAt: typeof source.nextReviewAt === "string" ? source.nextReviewAt : undefined,
    reviewCount: asNumber(source.reviewCount),
    correctCount: asNumber(source.correctCount),
    wrongCount: asNumber(source.wrongCount),
    isFavorite: asBoolean(source.isFavorite),
    isInVocabularyBook: typeof source.isInVocabularyBook === "boolean" ? source.isInVocabularyBook : status === "unknown" || status === "fuzzy",
  };
}

function normalizePlan(value: unknown, date: string): DailyWordPlan {
  const source = isRecord(value) ? value : {};
  const list = (candidate: unknown) => Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string") : [];
  return {
    date,
    wordIds: list(source.wordIds),
    completedWordIds: list(source.completedWordIds),
    reviewedWordIds: list(source.reviewedWordIds),
    startedAt: typeof source.startedAt === "string" ? source.startedAt : undefined,
    completedAt: typeof source.completedAt === "string" ? source.completedAt : undefined,
  };
}

function normalizeRecord(value: unknown, date: string): DailyLearningRecord {
  const source = isRecord(value) ? value : {};
  return {
    date,
    learnedCount: asNumber(source.learnedCount),
    masteredCount: asNumber(source.masteredCount),
    reviewedCount: asNumber(source.reviewedCount),
    correctRate: asNumber(source.correctRate),
    durationMinutes: asNumber(source.durationMinutes),
    targetCompleted: asBoolean(source.targetCompleted),
  };
}

function normalizeRecommendationState(value: unknown): RecommendationState {
  const source = isRecord(value) ? value : {};
  return {
    isFavorite: asBoolean(source.isFavorite),
    isWatched: asBoolean(source.isWatched),
    lastShownAt: typeof source.lastShownAt === "string" ? source.lastShownAt : undefined,
  };
}

export function createDefaultEnglishState(): EnglishLearningState {
  return { version: 1, settings: defaultSettings, dailyPlans: {}, wordProgress: {}, learningRecords: {}, recommendationState: {} };
}

export function loadEnglishState(): EnglishLearningState {
  if (typeof window === "undefined") return createDefaultEnglishState();
  try {
    const raw = window.localStorage.getItem(ENGLISH_STORAGE_KEY);
    if (!raw) return createDefaultEnglishState();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultEnglishState();

    const settingsSource = isRecord(parsed.settings) ? parsed.settings : {};
    const plansSource = isRecord(parsed.dailyPlans) ? parsed.dailyPlans : {};
    const progressSource = isRecord(parsed.wordProgress) ? parsed.wordProgress : {};
    const recordsSource = isRecord(parsed.learningRecords) ? parsed.learningRecords : {};
    const recommendationSource = isRecord(parsed.recommendationState) ? parsed.recommendationState : {};

    return {
      version: 1,
      settings: {
        dailyWordCount: Math.max(5, Math.min(30, asNumber(settingsSource.dailyWordCount, defaultSettings.dailyWordCount))),
        accent: settingsSource.accent === "uk" || settingsSource.accent === "any" ? settingsSource.accent : "us",
      },
      dailyPlans: Object.fromEntries(Object.entries(plansSource).map(([date, plan]) => [date, normalizePlan(plan, date)])),
      wordProgress: Object.fromEntries(Object.entries(progressSource).map(([wordId, progress]) => [wordId, normalizeProgress(progress, wordId)])),
      learningRecords: Object.fromEntries(Object.entries(recordsSource).map(([date, record]) => [date, normalizeRecord(record, date)])),
      recommendationState: Object.fromEntries(Object.entries(recommendationSource).map(([id, state]) => [id, normalizeRecommendationState(state)])),
    };
  } catch {
    return createDefaultEnglishState();
  }
}

export function saveEnglishState(state: EnglishLearningState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENGLISH_STORAGE_KEY, JSON.stringify(state));
    notifyThirdBatchStorageChanged("english");
  } catch {
    // A storage quota or privacy error should not make the page unusable.
  }
}
