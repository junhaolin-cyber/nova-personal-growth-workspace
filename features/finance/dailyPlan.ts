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

function rotateByDate<T>(items: T[], date: string): T[] {
  if (items.length < 2) return items;
  const offset = stableOffset(date, 0, items.length);
  return [...items.slice(offset), ...items.slice(0, offset)];
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
  const candidates = rotateByDate([...pool].sort((a, b) => a.id.localeCompare(b.id)), date);
  const dueSet = new Set(dueIds);
  const newIds = candidates.filter((item) => !dueSet.has(item.id) && !recentSet.has(item.id) && !state.progress[item.id]?.firstLearnedAt).map((item) => item.id);
  const freshIds = candidates.filter((item) => !dueSet.has(item.id) && !recentSet.has(item.id) && state.progress[item.id]?.status !== "已掌握").map((item) => item.id);
  const fallbackIds = candidates.filter((item) => !dueSet.has(item.id) && !recentSet.has(item.id)).map((item) => item.id);
  const reviewTarget = dueIds.length && newIds.length ? Math.min(dueIds.length, Math.max(1, Math.floor(targetCount * 0.6))) : Math.min(dueIds.length, targetCount);
  const selectedReviewIds = dueIds.slice(0, reviewTarget);
  const selectedNewIds = newIds.filter((id) => !selectedReviewIds.includes(id)).slice(0, targetCount - selectedReviewIds.length);
  const remainingSlots = targetCount - selectedReviewIds.length - selectedNewIds.length;
  const fillReviewIds = dueIds.filter((id) => !selectedReviewIds.includes(id)).slice(0, remainingSlots);
  const selectedIds = new Set([...selectedReviewIds, ...selectedNewIds, ...fillReviewIds]);
  const fillFreshIds = freshIds.filter((id) => !selectedIds.has(id)).slice(0, targetCount - selectedIds.size);
  fillFreshIds.forEach((id) => selectedIds.add(id));
  const fillFallbackIds = fallbackIds.filter((id) => !selectedIds.has(id)).slice(0, targetCount - selectedIds.size);
  fillFallbackIds.forEach((id) => selectedIds.add(id));
  const selected = [...selectedReviewIds, ...selectedNewIds, ...fillReviewIds, ...fillFreshIds, ...fillFallbackIds].slice(0, targetCount);
  const reviewKnowledgeIds = dueIds.filter((id) => selected.includes(id));
  return { date, knowledgeIds: selected, reviewKnowledgeIds, completedKnowledgeIds: [], completedQuizIds: [] };
}
