import type { FinanceDailyPlan, FinanceHistoryRecord, FinanceLearningState, FinanceStats } from "./types";
import { getFinanceDateKey } from "./dailyPlan";

function dayBefore(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return getFinanceDateKey(value);
}

function streak(history: Record<string, FinanceHistoryRecord>, from: string): number {
  let count = 0;
  let cursor = from;
  while (history[cursor]?.learnedCount > 0) { count += 1; cursor = dayBefore(cursor); }
  return count;
}

export function getFinanceStats(state: FinanceLearningState, plan: FinanceDailyPlan, today: string): FinanceStats {
  const todayRecord = state.history[today];
  const historyValues = Object.values(state.history);
  const learnedCount = plan.completedKnowledgeIds.length;
  const plannedCount = plan.knowledgeIds.length;
  const correct = state.quizAttempts.filter((attempt) => attempt.date === today && attempt.correct).length;
  const totalAttempts = state.quizAttempts.filter((attempt) => attempt.date === today).length;
  const completedKnowledge = Object.values(state.progress).filter((item) => item.status === "已完成" || item.status === "已掌握").length;
  const todayMasteredCount = plan.completedKnowledgeIds.filter((id) => state.progress[id]?.status === "已掌握").length;
  const historyStreaks = historyValues.map((item) => streak(state.history, item.date));
  return { plannedCount, completedCount: learnedCount, todayMasteredCount, reviewCount: plan.reviewKnowledgeIds.length, completionRate: plannedCount ? Math.round((learnedCount / plannedCount) * 100) : 0, accuracy: totalAttempts ? Math.round((correct / totalAttempts) * 100) : todayRecord?.correctRate ?? 0, studyMinutes: todayRecord?.studyMinutes ?? 0, currentStreak: streak(state.history, today), longestStreak: Math.max(0, ...historyStreaks), totalCompletedKnowledge: completedKnowledge, totalStudyMinutes: historyValues.reduce((sum, item) => sum + item.studyMinutes, 0), favoriteCount: Object.keys(state.favorites).length };
}

export function buildFinanceHistory(state: FinanceLearningState, plan: FinanceDailyPlan, date: string): FinanceHistoryRecord {
  const attempts = state.quizAttempts.filter((attempt) => attempt.date === date);
  const correct = attempts.filter((attempt) => attempt.correct).length;
  return { date, learnedCount: plan.completedKnowledgeIds.length, completedCount: plan.completedKnowledgeIds.filter((id) => state.progress[id]?.status === "已完成" || state.progress[id]?.status === "已掌握").length, reviewCount: plan.reviewKnowledgeIds.filter((id) => plan.completedKnowledgeIds.includes(id)).length, correctRate: attempts.length ? Math.round((correct / attempts.length) * 100) : 0, studyMinutes: state.history[date]?.studyMinutes ?? 0, targetCompleted: plan.completedKnowledgeIds.length >= plan.knowledgeIds.length };
}
