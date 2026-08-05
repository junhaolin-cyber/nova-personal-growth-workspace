import type { ExerciseType } from "./types";

const DEFAULT_TYPE_NAMES = [
  ["篮球", "🏀"],
  ["足球", "⚽"],
  ["网球", "🎾"],
  ["羽毛球", "🏸"],
  ["跑步", "🏃"],
  ["健身", "🏋️"],
  ["游泳", "🏊"],
  ["骑行", "🚴"],
  ["徒步", "🥾"],
  ["瑜伽", "🧘"],
  ["跳绳", "🪢"],
  ["其他", "✨"],
] as const;

export function createDefaultExerciseTypes(now = new Date().toISOString()): ExerciseType[] {
  return DEFAULT_TYPE_NAMES.map(([name, icon], index) => ({
    id: "exercise-type-" + String(index + 1),
    name,
    icon,
    sortOrder: index,
    isFavorite: index < 5,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export const EXERCISE_ICON_OPTIONS = ["🏀", "⚽", "🎾", "🏸", "🏃", "🏋️", "🏊", "🚴", "🥾", "🧘", "🪢", "🚶", "🛹", "💪", "✨"];
