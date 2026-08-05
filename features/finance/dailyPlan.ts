import type { FinanceDailyPlan, FinanceKnowledge, FinanceLearningState, FinanceSettings } from "./types";

export function getFinanceDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateValue(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function stableOffset(date: string, index: number, total: number): number {
  const sum = Array.from(`${date}-${index}`).reduce((result, character) => result + character.charCodeAt(0), 0);
  return total === 0 ? 0 : sum % total;
}

export function isFinanceReviewDue(nextReviewAt: string | undefined, today: string): boolean {
  return Boolean(nextReviewAt && dateValue(nextReviewAt) <= dateValue(today));
}

export function createFinanceDailyPlan(knowledge: FinanceKnowledge[], state: FinanceLearningState, date: string, settings: FinanceSettings): FinanceDailyPlan {
  const existing = state.dailyPlans[date];
  if (existing?.knowledgeIds.length) return existing;
  const targetCount = Math.max(3, Math.min(12, Math.round(settings.dailyMinutes / 2)));
  const dueIds = knowledge.filter((item) => isFinanceReviewDue(state.progress[item.id]?.nextReviewAt, date)).sort((a, b) => dateValue(state.progress[a.id]?.nextReviewAt) - dateValue(state.progress[b.id]?.nextReviewAt)).map((item) => item.id);
  const recentIds = Object.values(state.dailyPlans).filter((plan) => plan.date !== date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).flatMap((plan) => plan.knowledgeIds);
  const recentSet = new Set(recentIds);
  const preferred = settings.preferredCategory === "不限" ? knowledge : knowledge.filter((item) => item.category === settings.preferredCategory);
  const pool = preferred.length ? preferred : knowledge;
  const candidates = [...pool].sort((a, b) => stableOffset(date, Number(a.id.slice(-2)), pool.length) - stableOffset(date, Number(b.id.slice(-2)), pool.length));
  const freshIds = candidates.filter((item) => !recentSet.has(item.id) && state.progress[item.id]?.status !== "已掌握").map((item) => item.id);
  const fallbackIds = candidates.filter((item) => !recentSet.has(item.id)).map((item) => item.id);
  const selected: string[] = [];
  [...dueIds, ...freshIds, ...fallbackIds].forEach((id) => { if (!selected.includes(id) && selected.length < targetCount) selected.push(id); });
  const reviewKnowledgeIds = dueIds.filter((id) => selected.includes(id));
  return { date, knowledgeIds: selected, reviewKnowledgeIds, completedKnowledgeIds: [], completedQuizIds: [] };
}
