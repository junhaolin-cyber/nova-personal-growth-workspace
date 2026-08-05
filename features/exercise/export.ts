import type { ExerciseData, ExerciseRecord, ExerciseType } from "./types";

export function createExerciseJson(data: ExerciseData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

export function createExerciseCsv(records: ExerciseRecord[], types: ExerciseType[]): string {
  const typeMap = new Map(types.map((type) => [type.id, type.name]));
  const header = ["日期", "时间", "运动类型", "时长（分钟）", "地点", "强度", "感受", "备注"].map(csvEscape).join(",");
  const rows = records.map((record) => [
    record.exerciseDate,
    record.startTime,
    typeMap.get(record.typeId) ?? "已停用类型",
    record.durationMinutes,
    record.location,
    record.intensity,
    record.feeling,
    record.note,
  ].map(csvEscape).join(","));
  return "\uFEFF" + [header, ...rows].join("\r\n");
}

export function downloadExerciseFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function readExerciseImportFile(file: File): Promise<unknown> {
  return file.text().then((text) => JSON.parse(text) as unknown);
}
