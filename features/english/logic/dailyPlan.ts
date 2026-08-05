import type { DailyWordPlan, EnglishLearningSettings, EnglishLearningState, EnglishWord } from "../types";
import { isDue } from "./spacedRepetition";

function stableScore(value: string) {
  return [...value].reduce((score, character) => (score * 31 + character.charCodeAt(0)) % 1000003, 7);
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
    .sort((a, b) => stableScore(`${date}:${a.id}`) - stableScore(`${date}:${b.id}`));
  const fallbackWords = words
    .filter((word) => !dueWords.some((item) => item.id === word.id) && !newWords.some((item) => item.id === word.id))
    .sort((a, b) => stableScore(`${date}:fallback:${a.id}`) - stableScore(`${date}:fallback:${b.id}`));
  const wordIds = [...dueWords, ...newWords, ...fallbackWords].slice(0, limit).map((word) => word.id);

  return {
    date,
    wordIds,
    completedWordIds: [],
    reviewedWordIds: dueWords.slice(0, limit).map((word) => word.id),
  };
}

export function getOrCreateDailyPlan(words: EnglishWord[], state: EnglishLearningState, date: string) {
  return state.dailyPlans[date] ?? createDailyWordPlan(words, state, date, state.settings);
}

