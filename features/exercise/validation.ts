import { isValidDateKey } from "./utils";
import type { ExerciseRecordInput } from "./types";

export function validateExerciseRecord(input: ExerciseRecordInput): string | undefined {
  if (!input.typeId) return "请选择运动类型。";
  if (!isValidDateKey(input.exerciseDate)) return "请选择有效的运动日期。";
  if (input.durationMinutes.trim()) {
    const duration = Number(input.durationMinutes);
    if (!Number.isFinite(duration) || duration < 0 || duration > 1440) return "运动时长需在 0 到 1440 分钟之间。";
  }
  if (input.imageUrl.trim()) {
    try {
      const url = new URL(input.imageUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") return "图片引用只支持 http 或 https 链接。";
    } catch {
      return "图片引用链接格式不正确。";
    }
  }
  return undefined;
}
