export type EnglishLevel = "beginner" | "intermediate" | "advanced";
export type Accent = "us" | "uk" | "any";
export type WordStatus = "unknown" | "fuzzy" | "known" | "mastered";
export type RecommendationType = "speech" | "movie" | "series";
export type RecommendationFilter = "all" | EnglishLevel | "us" | "uk";

export type EnglishWord = {
  id: string;
  word: string;
  phonetic: string;
  meaningZh: string;
  definitionEn: string;
  partOfSpeech: string;
  collocations: string[];
  exampleSentence: string;
  exampleTranslation: string;
  difficulty: EnglishLevel;
  topic: string;
};

export type WordProgress = {
  wordId: string;
  status: WordStatus;
  firstLearnedAt?: string;
  lastLearnedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  isFavorite: boolean;
  isInVocabularyBook: boolean;
};

export type DailyWordPlan = {
  date: string;
  wordIds: string[];
  completedWordIds: string[];
  reviewedWordIds: string[];
  startedAt?: string;
  completedAt?: string;
};

export type DailyLearningRecord = {
  date: string;
  learnedCount: number;
  masteredCount: number;
  reviewedCount: number;
  correctRate: number;
  durationMinutes: number;
  targetCompleted: boolean;
};

export type EnglishLearningSettings = {
  dailyWordCount: number;
  accent: Accent;
};

export type RecommendationState = {
  isFavorite: boolean;
  isWatched: boolean;
  lastShownAt?: string;
};

export type RecommendationBase = {
  id: string;
  type: RecommendationType;
  titleZh: string;
  titleEn: string;
  coverLabel: string;
  coverTone: string;
  difficulty: EnglishLevel;
  topics: string[];
  accent: Exclude<Accent, "any"> | "mixed";
  summary: string;
  reason: string;
  learningScenes: string[];
  url?: string;
};

export type SpeechRecommendation = RecommendationBase & {
  type: "speech";
  speaker: string;
  durationMinutes: number;
  captions: { english: boolean; bilingual: boolean };
};

export type MovieRecommendation = RecommendationBase & {
  type: "movie";
  year: number;
  genre: string;
  durationMinutes: number;
};

export type SeriesRecommendation = RecommendationBase & {
  type: "series";
  genre: string;
  episodeMinutes: number;
  seasons: number;
};

export type EnglishRecommendation = SpeechRecommendation | MovieRecommendation | SeriesRecommendation;

export type EnglishLearningState = {
  version: 1;
  settings: EnglishLearningSettings;
  dailyPlans: Record<string, DailyWordPlan>;
  wordProgress: Record<string, WordProgress>;
  learningRecords: Record<string, DailyLearningRecord>;
  recommendationState: Record<string, RecommendationState>;
};

