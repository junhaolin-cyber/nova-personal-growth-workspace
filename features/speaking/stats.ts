import type { SavedExpression, SpeakingSessionRecord, SpeakingStats } from "./types";

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return getDateKey(date);
}

export function calculateSpeakingStats(sessions: SpeakingSessionRecord[], expressions: SavedExpression[], today = getDateKey()): SpeakingStats {
  const todaySessions = sessions.filter((session) => session.date === today);
  const dates = new Set(sessions.map((session) => session.date));
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let currentStreak = 0;
  while (dates.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return {
    todaySessions: todaySessions.length,
    todayTurns: todaySessions.reduce((total, session) => total + session.turnCount, 0),
    todayMinutes: Math.round(todaySessions.reduce((total, session) => total + session.durationSeconds, 0) / 60),
    todayExpressions: expressions.filter((expression) => expression.sourceDate === today).length,
    currentStreak,
    totalSessions: sessions.length,
  };
}

