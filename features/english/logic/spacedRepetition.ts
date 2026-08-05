import { addDays } from "./date";
import type { WordProgress, WordStatus } from "../types";

export const wordStatusLabels: Record<WordStatus, string> = {
  unknown: "不认识",
  fuzzy: "模糊",
  known: "已认识",
  mastered: "已掌握",
};

export const wordStatusTones: Record<WordStatus, string> = {
  unknown: "bg-[#F8E1E4] text-[#B75D6A]",
  fuzzy: "bg-[#F8EBD8] text-[#AD753C]",
  known: "bg-[#E4EDF5] text-[#557B9C]",
  mastered: "bg-[#DDEFE4] text-[#43845D]",
};

export function getReviewInterval(status: WordStatus, reviewCount: number) {
  if (status === "unknown" || status === "fuzzy") return 1;
  if (reviewCount >= 4) return 15;
  if (status === "mastered") return 7;
  return 3;
}

export function applyWordStatus(existing: WordProgress | undefined, wordId: string, status: WordStatus, date: string): WordProgress {
  const isPositive = status === "known" || status === "mastered";
  const reviewCount = isPositive ? (existing?.reviewCount ?? 0) + 1 : 0;
  return {
    wordId,
    status,
    firstLearnedAt: existing?.firstLearnedAt ?? date,
    lastLearnedAt: date,
    nextReviewAt: addDays(date, getReviewInterval(status, reviewCount)),
    reviewCount,
    correctCount: (existing?.correctCount ?? 0) + (isPositive ? 1 : 0),
    wrongCount: (existing?.wrongCount ?? 0) + (isPositive ? 0 : 1),
    isFavorite: existing?.isFavorite ?? false,
    isInVocabularyBook: status === "unknown" || status === "fuzzy" ? true : existing?.isInVocabularyBook ?? false,
  };
}

export function isDue(progress: WordProgress | undefined, date: string) {
  return Boolean(progress?.nextReviewAt && progress.nextReviewAt <= date);
}

