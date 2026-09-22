import type { Accent, EnglishLevel, EnglishRecommendation, RecommendationType } from "./types";

export type OnlineRecommendation = {
  id: string;
  type: RecommendationType;
  titleZh: string;
  titleEn: string;
  coverLabel: string;
  coverTone: string;
  posterUrl?: string;
  difficulty?: EnglishLevel;
  topics: string[];
  accent?: Exclude<Accent, "any"> | "mixed";
  summary: string;
  reason: string;
  learningScenes: string[];
  url?: string;
  source: "TMDB" | "YouTube";
  detailText: string;
  speaker?: string;
  durationMinutes?: number;
  captions?: { english: boolean; bilingual: boolean };
};

export type RecommendationItem = EnglishRecommendation | OnlineRecommendation;

export type OnlineRecommendationResponse = {
  source: "online" | "fallback";
  items: OnlineRecommendation[];
  warning?: string;
};
