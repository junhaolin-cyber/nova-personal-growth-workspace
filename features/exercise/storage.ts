import { createDefaultExerciseTypes } from "./exerciseTypes";
import { getMonthKey } from "./utils";
import { notifySecondBatchStorageChanged } from "@/features/sync/events";
import type { ExerciseData, ExerciseFeeling, ExerciseIntensity, ExerciseRecord, ExerciseSettings, ExerciseType } from "./types";

export const EXERCISE_STORAGE_KEYS = {
  types: "nova:exercise:types:v1",
  records: "nova:exercise:records:v1",
  settings: "nova:exercise:settings:v1",
} as const;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asObject = (value: unknown): Record<string, unknown> => isObject(value) ? value : {};
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asBoolean = (value: unknown, fallback = false) => typeof value === "boolean" ? value : fallback;
const asNumber = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const asIntensity = (value: unknown): ExerciseIntensity | undefined => value === "easy" || value === "moderate" || value === "high" ? value : undefined;
const asFeeling = (value: unknown): ExerciseFeeling | undefined => value === "great" || value === "normal" || value === "tired" ? value : undefined;

function read(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as unknown : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 单个模块的存储异常不能阻断页面 */ }
}

function normalizeType(value: unknown, fallbackOrder: number): ExerciseType | null {
  const source = asObject(value);
  const name = asString(source.name).trim();
  if (!source.id || !name) return null;
  return {
    id: asString(source.id),
    name: name.slice(0, 40),
    icon: asString(source.icon, "✨"),
    sortOrder: typeof source.sortOrder === "number" && Number.isFinite(source.sortOrder) ? source.sortOrder : fallbackOrder,
    isFavorite: asBoolean(source.isFavorite),
    isActive: source.isActive !== false,
    createdAt: asString(source.createdAt, new Date().toISOString()),
    updatedAt: asString(source.updatedAt, new Date().toISOString()),
  };
}

function normalizeRecord(value: unknown): ExerciseRecord | null {
  const source = asObject(value);
  const typeId = asString(source.typeId);
  const date = asString(source.exerciseDate);
  if (!source.id || !typeId || !date) return null;
  const duration = asNumber(source.durationMinutes);
  return {
    id: asString(source.id),
    typeId,
    exerciseDate: date,
    startTime: typeof source.startTime === "string" ? source.startTime : undefined,
    durationMinutes: duration !== null && duration >= 0 && duration <= 1440 ? duration : null,
    location: typeof source.location === "string" ? source.location.slice(0, 100) : undefined,
    intensity: asIntensity(source.intensity),
    feeling: asFeeling(source.feeling),
    note: typeof source.note === "string" ? source.note.slice(0, 500) : undefined,
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl.slice(0, 1000) : undefined,
    createdAt: asString(source.createdAt, new Date().toISOString()),
    updatedAt: asString(source.updatedAt, new Date().toISOString()),
  };
}

function normalizeSettings(value: unknown): ExerciseSettings {
  const source = asObject(value);
  return { version: 1, calendarMonth: /^\d{4}-\d{2}$/.test(asString(source.calendarMonth)) ? asString(source.calendarMonth) : getMonthKey() };
}

export function normalizeExerciseData(value: unknown): ExerciseData {
  const source = asObject(value);
  const rawTypes = Array.isArray(source.types) ? source.types : [];
  const rawRecords = Array.isArray(source.records) ? source.records : [];
  const types = rawTypes.map((item, index) => normalizeType(item, index)).filter((item): item is ExerciseType => Boolean(item));
  const records = rawRecords.map(normalizeRecord).filter((item): item is ExerciseRecord => Boolean(item));
  return { version: 1, types, records, settings: normalizeSettings(source.settings) };
}

export function createDefaultExerciseData(): ExerciseData {
  return { version: 1, types: createDefaultExerciseTypes(), records: [], settings: { version: 1, calendarMonth: getMonthKey() } };
}

export function loadExerciseData(): ExerciseData {
  const typesValue = read(EXERCISE_STORAGE_KEYS.types);
  const recordsValue = read(EXERCISE_STORAGE_KEYS.records);
  const settingsValue = read(EXERCISE_STORAGE_KEYS.settings);
  const types = Array.isArray(typesValue) ? typesValue.map((item, index) => normalizeType(item, index)).filter((item): item is ExerciseType => Boolean(item)) : createDefaultExerciseTypes();
  const records = Array.isArray(recordsValue) ? recordsValue.map(normalizeRecord).filter((item): item is ExerciseRecord => Boolean(item)) : [];
  return { version: 1, types: types.length ? types : createDefaultExerciseTypes(), records, settings: normalizeSettings(settingsValue) };
}

export function saveExerciseData(data: ExerciseData): void {
  write(EXERCISE_STORAGE_KEYS.types, data.types);
  write(EXERCISE_STORAGE_KEYS.records, data.records);
  write(EXERCISE_STORAGE_KEYS.settings, data.settings);
  notifySecondBatchStorageChanged("exercise");
}
