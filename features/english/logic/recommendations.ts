import type { EnglishRecommendation, MovieRecommendation, SeriesRecommendation, SpeechRecommendation } from "../types";

const RECOMMENDATION_LIMIT = 3;
const DAY_MS = 86400000;

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function getDayIndex(dateKey: string) {
  const date = parseDateKey(dateKey);
  return date ? Math.floor(date.getTime() / DAY_MS) : 0;
}

export function getLocalWeekKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function getWeekIndex(dateKey: string) {
  return Math.floor(getDayIndex(getLocalWeekKey(dateKey)) / 7);
}

function takeStableCycle<T>(items: T[], periodIndex: number, limit = RECOMMENDATION_LIMIT) {
  if (items.length <= limit) return items;
  const count = Math.min(limit, items.length);
  const offset = ((periodIndex * count) % items.length + items.length) % items.length;
  return Array.from({ length: count }, (_, index) => items[(offset + index) % items.length]);
}

export function getDailySpeechRecommendations(items: SpeechRecommendation[], dateKey: string) {
  return takeStableCycle(items, getDayIndex(dateKey));
}

export function getWeeklyMovieRecommendations(items: MovieRecommendation[], dateKey: string) {
  return takeStableCycle(items, getWeekIndex(dateKey));
}

export function getWeeklySeriesRecommendations(items: SeriesRecommendation[], dateKey: string) {
  return takeStableCycle(items, getWeekIndex(dateKey));
}

export function getRotatingRecommendations(items: EnglishRecommendation[], type: EnglishRecommendation["type"], dateKey: string) {
  const typedItems = items.filter((item) => item.type === type);
  if (type === "speech") return getDailySpeechRecommendations(typedItems as SpeechRecommendation[], dateKey);
  if (type === "movie") return getWeeklyMovieRecommendations(typedItems as MovieRecommendation[], dateKey);
  return getWeeklySeriesRecommendations(typedItems as SeriesRecommendation[], dateKey);
}
