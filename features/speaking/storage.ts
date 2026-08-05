import type { SavedExpression, SpeakingDraft, SpeakingSessionRecord, SpeakingSettings, SpeakingStorageState } from "./types";

export const SPEAKING_STORAGE_KEYS = {
  settings: "nova:speaking:settings:v1",
  sessions: "nova:speaking:sessions:v1",
  expressions: "nova:speaking:expressions:v1",
  draft: "nova:speaking:draft:v1",
} as const;

export const defaultSpeakingSettings: SpeakingSettings = {
  level: "beginner",
  accent: "us",
  responseSpeed: "normal",
  showTranslation: true,
  autoRead: false,
  dailyGoalMinutes: 10,
  showFeedback: true,
};

function readValue<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failures should never make the speaking page unusable.
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSettings(value: unknown): value is SpeakingSettings {
  if (!isObject(value)) return false;
  return ["beginner", "intermediate", "advanced"].includes(String(value.level))
    && ["us", "uk"].includes(String(value.accent))
    && ["slow", "normal"].includes(String(value.responseSpeed))
    && [5, 10, 15, 20].includes(Number(value.dailyGoalMinutes))
    && typeof value.showTranslation === "boolean"
    && typeof value.autoRead === "boolean"
    && typeof value.showFeedback === "boolean";
}

function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isObject);
}

function isSessions(value: unknown): value is SpeakingSessionRecord[] {
  return isArrayOfObjects(value) && value.every((item) => typeof item.id === "string" && typeof item.date === "string" && typeof item.scenarioId === "string" && typeof item.turnCount === "number" && Array.isArray(item.userMessages) && Array.isArray(item.aiMessages));
}

function isExpressions(value: unknown): value is SavedExpression[] {
  return isArrayOfObjects(value) && value.every((item) => typeof item.id === "string" && typeof item.expression === "string" && typeof item.scenarioId === "string");
}

function isDraft(value: unknown): value is SpeakingDraft {
  return isObject(value) && typeof value.scenarioId === "string" && typeof value.startedAt === "string" && Array.isArray(value.messages) && typeof value.hintLevel === "number";
}

export function loadSpeakingSettings() {
  return readValue(SPEAKING_STORAGE_KEYS.settings, defaultSpeakingSettings, isSettings);
}

export function saveSpeakingSettings(settings: SpeakingSettings) {
  writeValue(SPEAKING_STORAGE_KEYS.settings, settings);
}

export function loadSpeakingSessions() {
  return readValue<SpeakingSessionRecord[]>(SPEAKING_STORAGE_KEYS.sessions, [], isSessions);
}

export function saveSpeakingSessions(sessions: SpeakingSessionRecord[]) {
  writeValue(SPEAKING_STORAGE_KEYS.sessions, sessions);
}

export function loadSavedExpressions() {
  return readValue<SavedExpression[]>(SPEAKING_STORAGE_KEYS.expressions, [], isExpressions);
}

export function saveSavedExpressions(expressions: SavedExpression[]) {
  writeValue(SPEAKING_STORAGE_KEYS.expressions, expressions);
}

export function loadSpeakingDraft() {
  return readValue<SpeakingDraft | null>(SPEAKING_STORAGE_KEYS.draft, null, (value): value is SpeakingDraft | null => value === null || isDraft(value));
}

export function saveSpeakingDraft(draft: SpeakingDraft | null) {
  if (draft) writeValue(SPEAKING_STORAGE_KEYS.draft, draft);
  else if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(SPEAKING_STORAGE_KEYS.draft); } catch { /* ignore storage failures */ }
  }
}

export function loadSpeakingState(): SpeakingStorageState {
  return { settings: loadSpeakingSettings(), sessions: loadSpeakingSessions(), expressions: loadSavedExpressions(), draft: loadSpeakingDraft() };
}

