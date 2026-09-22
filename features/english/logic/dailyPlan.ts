import type { DailyWordPlan, EnglishLearningSettings, EnglishLearningState, EnglishWord } from "../types";
import { isDue } from "./spacedRepetition";

function stableScore(value: string) {
  return [...value].reduce((score, character) => (score * 31 + character.charCodeAt(0)) % 1000003, 7);
}

function dateSeed(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : Math.floor(parsed.getTime() / 86400000);
}

function rotateByDate<T>(items: T[], date: string) {
  if (items.length < 2) return items;
  const offset = dateSeed(date) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function createDailyWordPlan(words: EnglishWord[], state: EnglishLearningState, date: string, settings: EnglishLearningSettings): DailyWordPlan {
  const limit = Math.max(1, Math.min(settings.dailyWordCount, words.length));
  const recentIds = new Set(
    Object.entries(state.dailyPlans)
      .filter(([planDate]) => planDate < date)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .flatMap(([, plan]) => plan.wordIds),
  );
  const dueWords = words
    .filter((word) => isDue(state.wordProgress[word.id], date))
    .sort((a, b) => {
      const left = state.wordProgress[a.id];
      const right = state.wordProgress[b.id];
      return (right?.wrongCount ?? 0) - (left?.wrongCount ?? 0) || a.id.localeCompare(b.id);
    });
  const newWords = words
    .filter((word) => !state.wordProgress[word.id]?.firstLearnedAt && !recentIds.has(word.id))
    .sort((a, b) => stableScore(a.id) - stableScore(b.id) || a.id.localeCompare(b.id));
  const fallbackWords = words
    .filter((word) => !dueWords.some((item) => item.id === word.id) && !newWords.some((item) => item.id === word.id))
    .sort((a, b) => stableScore(`fallback:${a.id}`) - stableScore(`fallback:${b.id}`) || a.id.localeCompare(b.id));
  const reviewTarget = Math.min(dueWords.length, Math.floor(limit * 0.6));
  const selectedReviewWords = dueWords.slice(0, reviewTarget);
  const selectedNewWords = rotateByDate(newWords, date).slice(0, limit - selectedReviewWords.length);
  const remainingSlots = limit - selectedReviewWords.length - selectedNewWords.length;
  const fillReviewWords = dueWords.slice(reviewTarget, reviewTarget + remainingSlots);
  const fillFallbackWords = rotateByDate(fallbackWords, date).slice(0, remainingSlots - fillReviewWords.length);
  const plannedReviewWords = [...selectedReviewWords, ...fillReviewWords];
  const wordIds = [...selectedReviewWords, ...selectedNewWords, ...fillReviewWords, ...fillFallbackWords].slice(0, limit).map((word) => word.id);

  return {
    date,
    wordIds,
    completedWordIds: [],
    reviewedWordIds: plannedReviewWords.map((word) => word.id),
  };
}

export function getOrCreateDailyPlan(words: EnglishWord[], state: EnglishLearningState, date: string) {
  const existing = state.dailyPlans[date];
  return existing?.wordIds.length ? existing : createDailyWordPlan(words, state, date, state.settings);
}
