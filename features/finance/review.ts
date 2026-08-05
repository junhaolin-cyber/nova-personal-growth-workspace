import type { FinanceKnowledgeStatus, FinanceProgress } from "./types";
import { getFinanceDateKey } from "./dailyPlan";

const reviewIntervals = [1, 3, 7, 15];

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return getFinanceDateKey(result);
}

export function getReviewInterval(status: FinanceKnowledgeStatus, reviewCount: number): number {
  if (status === "未开始" || status === "学习中") return 1;
  if (status === "已掌握") return reviewIntervals[Math.min(reviewCount, reviewIntervals.length - 1)] ?? 7;
  return status === "已完成" ? 3 : 1;
}

export function updateFinanceProgress(previous: FinanceProgress | undefined, knowledgeId: string, status: FinanceKnowledgeStatus, date: string): FinanceProgress {
  const current = previous ?? { knowledgeId, status: "未开始", reviewCount: 0, correctCount: 0, wrongCount: 0, completedCount: 0, isFavorite: false };
  const isPositive = status === "已完成" || status === "已掌握";
  const nextReviewCount = isPositive ? current.reviewCount + 1 : 0;
  const nextReviewAt = addDays(date, getReviewInterval(status, nextReviewCount));
  return { ...current, knowledgeId, status, firstLearnedAt: current.firstLearnedAt ?? date, lastStudiedAt: date, nextReviewAt, reviewCount: nextReviewCount, correctCount: current.correctCount + (isPositive ? 1 : 0), wrongCount: current.wrongCount + (isPositive ? 0 : 1), completedCount: current.completedCount + 1 };
}

export function markQuizResult(previous: FinanceProgress | undefined, knowledgeId: string, correct: boolean, date: string): FinanceProgress {
  const current = previous ?? { knowledgeId, status: "学习中", reviewCount: 0, correctCount: 0, wrongCount: 0, completedCount: 0, isFavorite: false };
  const status: FinanceKnowledgeStatus = correct ? "已掌握" : "学习中";
  const nextReviewCount = correct ? current.reviewCount + 1 : 0;
  return { ...current, knowledgeId, status, lastStudiedAt: date, nextReviewAt: addDays(date, correct ? reviewIntervals[Math.min(nextReviewCount, reviewIntervals.length - 1)] : 1), reviewCount: nextReviewCount, correctCount: current.correctCount + (correct ? 1 : 0), wrongCount: current.wrongCount + (correct ? 0 : 1) };
}
