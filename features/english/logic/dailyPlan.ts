import type { DailyWordPlan, EnglishLearningSettings, EnglishLearningState, EnglishWord, WordProgress } from "../types";
import { isDue } from "./spacedRepetition";

function stableScore(value: string) {
  return [...value].reduce((score, character) => (score * 31 + character.charCodeAt(0)) % 1000003, 7);
}

function dateSeed(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : Math.floor(parsed.getTime() / 86400000);
}

function rotateByDate<T>(items: T[], date: string, blockSize = 1) {
  if (items.length < 2) return items;
  const offset = (dateSeed(date) * Math.max(1, blockSize)) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function isReviewCandidate(progress: WordProgress | undefined, date: string) {
  return (progress?.status === "unknown" || progress?.status === "fuzzy") && isDue(progress, date);
}

function isNewWordCandidate(progress: WordProgress | undefined) {
  return !progress?.firstLearnedAt && progress?.status !== "known" && progress?.status !== "mastered";
}

function isEligiblePlanWord(progress: WordProgress | undefined, date: string) {
  return isReviewCandidate(progress, date) || isNewWordCandidate(progress);
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
    .filter((word) => isReviewCandidate(state.wordProgress[word.id], date))
    .sort((a, b) => {
      const left = state.wordProgress[a.id];
      const right = state.wordProgress[b.id];
      return (right?.wrongCount ?? 0) - (left?.wrongCount ?? 0) || a.id.localeCompare(b.id);
    });
  const dueIds = new Set(dueWords.map((word) => word.id));
  const newWords = words
    .filter((word) => isNewWordCandidate(state.wordProgress[word.id]) && !dueIds.has(word.id) && !recentIds.has(word.id))
    .sort((a, b) => stableScore(a.id) - stableScore(b.id) || a.id.localeCompare(b.id));
  const newIds = new Set(newWords.map((word) => word.id));
  const fallbackWords = words
    .filter((word) => isNewWordCandidate(state.wordProgress[word.id]) && !dueIds.has(word.id) && !newIds.has(word.id))
    .sort((a, b) => stableScore(`fallback:${a.id}`) - stableScore(`fallback:${b.id}`) || a.id.localeCompare(b.id));
  const reviewTarget = Math.min(dueWords.length, Math.floor(limit * 0.6));
  const selectedReviewWords = dueWords.slice(0, reviewTarget);
  const newWordSlots = limit - selectedReviewWords.length;
  const selectedNewWords = rotateByDate(newWords, date, newWordSlots).slice(0, newWordSlots);
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
  if (!existing?.wordIds.length) return createDailyWordPlan(words, state, date, state.settings);

  const target = Math.max(1, Math.min(state.settings.dailyWordCount, words.length));
  const wordIdsInDictionary = new Set(words.map((word) => word.id));
  const completedIds = new Set(existing.completedWordIds);
  const keptIds = new Set<string>();
  for (const wordId of existing.wordIds) {
    if (!wordIdsInDictionary.has(wordId) || keptIds.has(wordId)) continue;
    if (completedIds.has(wordId) || isEligiblePlanWord(state.wordProgress[wordId], date)) keptIds.add(wordId);
  }
  const needsReconcile = keptIds.size < target || keptIds.size !== existing.wordIds.length;
  if (!needsReconcile) return existing;

  const replacementPlan = createDailyWordPlan(words, state, date, state.settings);
  const replacementIds = replacementPlan.wordIds.filter((wordId) => !keptIds.has(wordId));
  let replacementIndex = 0;
  const emittedIds = new Set<string>();
  const wordIds = existing.wordIds.flatMap((wordId) => {
    if (!wordIdsInDictionary.has(wordId) || keptIds.has(wordId)) {
      if (keptIds.has(wordId) && !emittedIds.has(wordId)) {
        emittedIds.add(wordId);
        return [wordId];
      }
      return [];
    }
    while (replacementIndex < replacementIds.length && keptIds.has(replacementIds[replacementIndex])) replacementIndex += 1;
    const replacementId = replacementIds[replacementIndex];
    replacementIndex += 1;
    if (!replacementId) return [];
    keptIds.add(replacementId);
    emittedIds.add(replacementId);
    return [replacementId];
  });
  const nextWordIds = [...wordIds];
  for (const wordId of replacementIds) {
    if (nextWordIds.length >= target) break;
    if (!nextWordIds.includes(wordId)) nextWordIds.push(wordId);
  }
  const wordIdSet = new Set(nextWordIds);
  const completedWordIds = existing.completedWordIds.filter((wordId) => wordIdSet.has(wordId));
  const reviewedWordIds = Array.from(new Set([
    ...existing.reviewedWordIds.filter((wordId) => wordIdSet.has(wordId)),
    ...replacementPlan.reviewedWordIds.filter((wordId) => wordIdSet.has(wordId)),
  ]));

  return {
    ...existing,
    wordIds: nextWordIds,
    completedWordIds,
    reviewedWordIds,
    completedAt: completedWordIds.length >= nextWordIds.length && nextWordIds.length > 0 ? existing.completedAt : undefined,
  };
}
