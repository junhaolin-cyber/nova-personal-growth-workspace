import type { FinanceFavorite, FinanceHistoryRecord, FinanceLearningState, FinanceProgress, FinanceReflection, FinanceSettings, FinanceDailyPlan, FinanceQuizAttempt } from "./types";

export const FINANCE_STORAGE_KEYS = {
  settings: "nova:finance:settings:v1",
  daily: "nova:finance:daily:v1",
  history: "nova:finance:history:v1",
  favorites: "nova:finance:favorites:v1",
  reflections: "nova:finance:reflections:v1",
  quizAttempts: "nova:finance:quiz-attempts:v1",
} as const;

export const defaultFinanceSettings: FinanceSettings = {
  level: "初级",
  goal: "日常财务",
  dailyMinutes: 15,
  showBrief: true,
  practiceRequired: true,
  riskReminders: true,
  preferredCategory: "不限",
  detailExpanded: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asObject = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const asNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false) => typeof value === "boolean" ? value : fallback;
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const read = (key: string): unknown => {
  if (typeof window === "undefined") return undefined;
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown; } catch { return undefined; }
};
const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 存储异常不应阻塞学习 */ }
};

function normalizeSettings(value: unknown): FinanceSettings {
  const source = asObject(value);
  const level = source.level === "中级" || source.level === "高级" ? source.level : "初级";
  const goal = source.goal === "考试" || source.goal === "职场" || source.goal === "长期规划" ? source.goal : "日常财务";
  const category = typeof source.preferredCategory === "string" ? source.preferredCategory : "不限";
  return {
    ...defaultFinanceSettings,
    level,
    goal,
    dailyMinutes: Math.max(5, Math.min(60, asNumber(source.dailyMinutes, 15))),
    showBrief: asBoolean(source.showBrief, true),
    practiceRequired: asBoolean(source.practiceRequired, true),
    riskReminders: asBoolean(source.riskReminders, true),
    preferredCategory: category as FinanceSettings["preferredCategory"],
    detailExpanded: asBoolean(source.detailExpanded),
  };
}

function normalizeProgress(value: unknown, knowledgeId: string): FinanceProgress {
  const source = asObject(value);
  const statuses = ["未开始", "学习中", "已完成", "已掌握"] as const;
  const status = statuses.includes(source.status as FinanceProgress["status"]) ? source.status as FinanceProgress["status"] : "未开始";
  return { knowledgeId, status, firstLearnedAt: typeof source.firstLearnedAt === "string" ? source.firstLearnedAt : undefined, lastStudiedAt: typeof source.lastStudiedAt === "string" ? source.lastStudiedAt : undefined, nextReviewAt: typeof source.nextReviewAt === "string" ? source.nextReviewAt : undefined, reviewCount: asNumber(source.reviewCount), correctCount: asNumber(source.correctCount), wrongCount: asNumber(source.wrongCount), completedCount: asNumber(source.completedCount), isFavorite: asBoolean(source.isFavorite) };
}

function normalizePlan(value: unknown, date: string): FinanceDailyPlan {
  const source = asObject(value);
  return { date, knowledgeIds: asStringArray(source.knowledgeIds), reviewKnowledgeIds: asStringArray(source.reviewKnowledgeIds), completedKnowledgeIds: asStringArray(source.completedKnowledgeIds), completedQuizIds: asStringArray(source.completedQuizIds), startedAt: typeof source.startedAt === "string" ? source.startedAt : undefined, completedAt: typeof source.completedAt === "string" ? source.completedAt : undefined };
}

function normalizeHistory(value: unknown, date: string): FinanceHistoryRecord {
  const source = asObject(value);
  return { date, learnedCount: asNumber(source.learnedCount), completedCount: asNumber(source.completedCount), reviewCount: asNumber(source.reviewCount), correctRate: asNumber(source.correctRate), studyMinutes: asNumber(source.studyMinutes), targetCompleted: asBoolean(source.targetCompleted) };
}

function normalizeFavorite(value: unknown, id: string): FinanceFavorite {
  const source = asObject(value);
  const type = source.type === "brief" || source.type === "coach" ? source.type : "knowledge";
  return { id, type, title: asString(source.title, "收藏内容"), createdAt: asString(source.createdAt, new Date().toISOString()) };
}

function normalizeReflection(value: unknown, date: string): FinanceReflection {
  const source = asObject(value);
  return { date, content: asString(source.content), updatedAt: asString(source.updatedAt, new Date().toISOString()) };
}

function normalizeAttempt(value: unknown): FinanceQuizAttempt | null {
  const source = asObject(value);
  if (!source.id || !source.knowledgeId || !source.questionId) return null;
  return { id: asString(source.id), date: asString(source.date), knowledgeId: asString(source.knowledgeId), questionId: asString(source.questionId), selectedAnswer: asString(source.selectedAnswer), correct: asBoolean(source.correct) };
}

export function createDefaultFinanceState(): FinanceLearningState {
  return { version: 1, settings: defaultFinanceSettings, dailyPlans: {}, progress: {}, history: {}, favorites: {}, reflections: {}, quizAttempts: [] };
}

export function loadFinanceState(): FinanceLearningState {
  const fallback = createDefaultFinanceState();
  if (typeof window === "undefined") return fallback;
  const settings = normalizeSettings(read(FINANCE_STORAGE_KEYS.settings));
  const dailySource = asObject(read(FINANCE_STORAGE_KEYS.daily));
  const historySource = asObject(read(FINANCE_STORAGE_KEYS.history));
  const favoriteSource = asObject(read(FINANCE_STORAGE_KEYS.favorites));
  const reflectionSource = asObject(read(FINANCE_STORAGE_KEYS.reflections));
  const quizSource = read(FINANCE_STORAGE_KEYS.quizAttempts);
  const progressSource = asObject(dailySource.progress);
  const plansSource = asObject(dailySource.plans);
  return {
    version: 1,
    settings,
    dailyPlans: Object.fromEntries(Object.entries(plansSource).map(([date, plan]) => [date, normalizePlan(plan, date)])),
    progress: Object.fromEntries(Object.entries(progressSource).map(([id, progress]) => [id, normalizeProgress(progress, id)])),
    history: Object.fromEntries(Object.entries(historySource).map(([date, item]) => [date, normalizeHistory(item, date)])),
    favorites: Object.fromEntries(Object.entries(favoriteSource).map(([id, item]) => [id, normalizeFavorite(item, id)])),
    reflections: Object.fromEntries(Object.entries(reflectionSource).map(([date, item]) => [date, normalizeReflection(item, date)])),
    quizAttempts: Array.isArray(quizSource) ? quizSource.map(normalizeAttempt).filter((item): item is FinanceQuizAttempt => Boolean(item)).slice(-300) : [],
  };
}

export function saveFinanceState(state: FinanceLearningState) {
  write(FINANCE_STORAGE_KEYS.settings, state.settings);
  write(FINANCE_STORAGE_KEYS.daily, { plans: state.dailyPlans, progress: state.progress });
  write(FINANCE_STORAGE_KEYS.history, state.history);
  write(FINANCE_STORAGE_KEYS.favorites, state.favorites);
  write(FINANCE_STORAGE_KEYS.reflections, state.reflections);
  write(FINANCE_STORAGE_KEYS.quizAttempts, state.quizAttempts);
}
