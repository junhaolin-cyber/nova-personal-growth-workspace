import { addDays, getDateKey, getMonthKey, parseDateKey, startOfWeek } from "./utils";
import type { ExerciseData, ExerciseRecord, ExerciseStats, ExerciseType, ExerciseTypeBreakdown, ExerciseWeekTrend } from "./types";

function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function durationOf(records: ExerciseRecord[]): number {
  return records.reduce((total, record) => total + (record.durationMinutes ?? 0), 0);
}

function countByType(records: ExerciseRecord[], types: ExerciseType[]): ExerciseTypeBreakdown[] {
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(record.typeId, (counts.get(record.typeId) ?? 0) + 1));
  return Array.from(counts.entries()).map(([typeId, count]) => {
    const type = types.find((item) => item.id === typeId);
    return { typeId, name: type?.name ?? "已停用类型", icon: type?.icon ?? "◌", count, percentage: records.length ? Math.round((count / records.length) * 100) : 0 };
  }).sort((a, b) => b.count - a.count);
}

function calculateStreak(records: ExerciseRecord[], today: string): number {
  const activeDates = new Set(records.map((record) => record.exerciseDate));
  if (!activeDates.has(today)) return 0;
  let streak = 0;
  let cursor = today;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function buildWeekTrend(records: ExerciseRecord[], today: string): ExerciseWeekTrend[] {
  const currentWeek = startOfWeek(today);
  return Array.from({ length: 6 }, (_, index) => {
    const weekStart = addDays(currentWeek, (index - 5) * 7);
    const weekEnd = addDays(weekStart, 6);
    return { label: weekStart.slice(5).replace("-", "/"), count: records.filter((record) => isBetween(record.exerciseDate, weekStart, weekEnd)).length };
  });
}

export function calculateExerciseStats(data: ExerciseData, today = getDateKey()): ExerciseStats {
  const weekStart = startOfWeek(today);
  const month = getMonthKey(parseDateKey(today));
  const monthStart = month + "-01";
  const monthEndDate = new Date(parseDateKey(today).getFullYear(), parseDateKey(today).getMonth() + 1, 0);
  const monthEnd = getDateKey(monthEndDate);
  const todayRecords = data.records.filter((record) => record.exerciseDate === today);
  const weekRecords = data.records.filter((record) => isBetween(record.exerciseDate, weekStart, today));
  const monthRecords = data.records.filter((record) => isBetween(record.exerciseDate, monthStart, monthEnd));
  const typeBreakdown = countByType(data.records, data.types);
  const activeMonthDays = new Set(monthRecords.map((record) => record.exerciseDate)).size;
  return {
    todayCount: todayRecords.length,
    todayDuration: durationOf(todayRecords),
    weekCount: weekRecords.length,
    weekDuration: durationOf(weekRecords),
    monthCount: monthRecords.length,
    monthDuration: durationOf(monthRecords),
    totalCount: data.records.length,
    totalDuration: durationOf(data.records),
    streak: calculateStreak(data.records, today),
    monthActiveDays: activeMonthDays,
    mostFrequentType: typeBreakdown[0],
    latestRecord: [...data.records].sort((a, b) => (b.exerciseDate + (b.startTime ?? "" )).localeCompare(a.exerciseDate + (a.startTime ?? "")))[0],
    typeBreakdown,
    weekTrend: buildWeekTrend(data.records, today),
  };
}

export function summarizeDay(records: ExerciseRecord[], date: string) {
  const dayRecords = records.filter((record) => record.exerciseDate === date);
  return { count: dayRecords.length, durationMinutes: durationOf(dayRecords) };
}

export function getCalendarDays(monthKey: string): Array<{ date: string; isCurrentMonth: boolean }> {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(year, month - 1, index - offset + 1);
    return { date: getDateKey(date), isCurrentMonth: date.getMonth() === month - 1 };
  });
}
