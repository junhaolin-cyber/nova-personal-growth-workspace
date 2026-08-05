import { addDays } from "./date";
import type { DailyLearningRecord, DailyWordPlan, EnglishLearningState } from "../types";

export type LearningStats = {
  planCount: number;
  learnedCount: number;
  masteredTodayCount: number;
  dueCount: number;
  completionRate: number;
  currentStreak: number;
  totalLearnedCount: number;
  totalMasteredCount: number;
};

export function buildDailyLearningRecord(state: EnglishLearningState, plan: DailyWordPlan): DailyLearningRecord {
  const completed = new Set(plan.completedWordIds);
  const learnedCount = plan.completedWordIds.length;
  const masteredCount = plan.completedWordIds.filter((id) => state.wordProgress[id]?.status === "mastered").length;
  const reviewedCount = plan.reviewedWordIds.filter((id) => completed.has(id)).length;
  const positiveCount = plan.completedWordIds.filter((id) => {
    const status = state.wordProgress[id]?.status;
    return status === "known" || status === "mastered";
  }).length;
  return {
    date: plan.date,
    learnedCount,
    masteredCount,
    reviewedCount,
    correctRate: learnedCount ? Math.round((positiveCount / learnedCount) * 100) : 0,
    durationMinutes: state.learningRecords[plan.date]?.durationMinutes ?? 0,
    targetCompleted: learnedCount >= plan.wordIds.length && plan.wordIds.length > 0,
  };
}

export function calculateCurrentStreak(records: Record<string, DailyLearningRecord>, today: string) {
  let cursor = records[today]?.learnedCount ? today : addDays(today, -1);
  let streak = 0;
  while (records[cursor]?.learnedCount) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(records: Record<string, DailyLearningRecord>) {
  let longest = 0;
  let current = 0;
  const dates = Object.keys(records).sort();
  let previous = "";
  for (const date of dates) {
    if (!records[date].learnedCount) {
      current = 0;
      previous = date;
      continue;
    }
    current = previous && addDays(previous, 1) === date ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

export function getLearningStats(state: EnglishLearningState, plan: DailyWordPlan, today: string): LearningStats {
  const masteredTodayCount = plan.completedWordIds.filter((id) => state.wordProgress[id]?.status === "mastered").length;
  const dueCount = Object.values(state.wordProgress).filter((progress) => progress.nextReviewAt && progress.nextReviewAt <= today).length;
  const totalLearnedCount = Object.values(state.wordProgress).filter((progress) => progress.firstLearnedAt).length;
  const totalMasteredCount = Object.values(state.wordProgress).filter((progress) => progress.status === "mastered").length;
  return {
    planCount: plan.wordIds.length,
    learnedCount: plan.completedWordIds.length,
    masteredTodayCount,
    dueCount,
    completionRate: plan.wordIds.length ? Math.round((plan.completedWordIds.length / plan.wordIds.length) * 100) : 0,
    currentStreak: calculateCurrentStreak(state.learningRecords, today),
    totalLearnedCount,
    totalMasteredCount,
  };
}

