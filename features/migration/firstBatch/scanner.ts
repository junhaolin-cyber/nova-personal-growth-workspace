import type { Json } from "@/lib/supabase/types";
import { fallbackById } from "@/features/movies-tv/data";
import { readMoviesTvState } from "@/features/movies-tv/storage";
import { FOOD_STORAGE_KEYS, loadFoodState } from "@/features/food/storage";
import { NEWS_STORAGE_KEYS, loadNewsState } from "@/features/news/storage";
import { trendBrands, trendItems } from "@/features/trend-life/data";
import { getDailyOutfitContent, trendOutfitThemes } from "@/features/trend-life/outfitData";
import { readTrendLifeState } from "@/features/trend-life/storage";
import type { FirstBatchCounts, FirstBatchItem, FirstBatchModule, FirstBatchPreview, FirstBatchState } from "./types";
import { FIRST_BATCH_MIGRATION_KEY } from "./types";

const MOVIES_TV_STORAGE_KEY = "nova-movies-tv:v1";

const emptyCounts = (): FirstBatchCounts => ({ "movies-tv": 0, food: 0, news: 0, "trend-life": 0 });

function jsonString(value: string | undefined): Json { return value ?? null; }
function jsonNumber(value: number | undefined): Json { return typeof value === "number" ? value : null; }

function createItem(module: FirstBatchModule, itemType: FirstBatchItem["itemType"], entityId: string, state: FirstBatchState, payload: Record<string, Json>, sourceStorageKey: string, clientUpdatedAt: string): FirstBatchItem {
  return { module, itemType, entityId, state, payload, sourceStorageKey, version: 1, clientUpdatedAt };
}

function addItem(items: FirstBatchItem[], item: FirstBatchItem): void {
  if (!items.some((current) => current.module === item.module && current.itemType === item.itemType && current.entityId === item.entityId)) items.push(item);
}

export function scanFirstBatch(): FirstBatchPreview {
  const now = new Date().toISOString();
  const items: FirstBatchItem[] = [];
  const movies = readMoviesTvState();
  for (const mediaId of movies.favoriteIds) {
    const media = fallbackById.get(mediaId);
    addItem(items, createItem("movies-tv", "favorite", mediaId, "favorite", { mediaId, title: jsonString(media?.title), originalTitle: jsonString(media?.originalTitle), category: jsonString(media?.category), mediaType: jsonString(media?.mediaType), sourceName: jsonString(media?.sourceName), sourceUrl: jsonString(media?.sourceUrl), posterUrl: jsonString(media?.posterUrl) }, MOVIES_TV_STORAGE_KEY, now));
  }
  for (const record of movies.watchRecords) {
    const media = fallbackById.get(record.mediaId);
    addItem(items, createItem("movies-tv", "status", record.mediaId, record.status === "watched" ? "completed" : "want", { mediaId: record.mediaId, title: jsonString(media?.title), rating: jsonNumber(record.rating), watchedAt: jsonString(record.watchedAt), note: jsonString(record.note) }, MOVIES_TV_STORAGE_KEY, now));
  }

  const food = loadFoodState();
  const foodById = new Map(food.restaurants.map((restaurant) => [restaurant.id, restaurant]));
  for (const restaurantId of food.favoriteRestaurantIds) {
    const restaurant = foodById.get(restaurantId);
    if (!restaurant) continue;
    addItem(items, createItem("food", "favorite", restaurantId, "favorite", { restaurantId, name: restaurant.name, address: restaurant.address, city: restaurant.city, sourceLabel: restaurant.sourceLabel, sourcePlaceId: jsonString(restaurant.sourcePlaceId) }, FOOD_STORAGE_KEYS.favorite, now));
  }
  for (const restaurant of food.restaurants) {
    if (restaurant.status !== "want" && restaurant.status !== "visited") continue;
    addItem(items, createItem("food", "status", restaurant.id, restaurant.status === "visited" ? "visited" : "want", { restaurantId: restaurant.id, name: restaurant.name, address: restaurant.address, city: restaurant.city, lastVisitedAt: jsonString(restaurant.lastVisitedAt) }, FOOD_STORAGE_KEYS.discovery, now));
  }

  const news = loadNewsState();
  for (const article of news.favorites) {
    addItem(items, createItem("news", "favorite", article.id, "favorite", { articleId: article.id, title: article.originalTitle, sourceName: article.sourceName, articleUrl: article.articleUrl, publishedAt: article.publishedAt, description: jsonString(article.description), savedAt: article.savedAt }, NEWS_STORAGE_KEYS.favorites, now));
  }

  const trend = readTrendLifeState();
  const dailyOutfit = getDailyOutfitContent();
  const allTrendItems = [...trendItems, ...dailyOutfit.items];
  const trendItemsById = new Map(allTrendItems.map((item) => [item.id, item]));
  for (const itemId of trend.favoriteIds) {
    const item = trendItemsById.get(itemId);
    addItem(items, createItem("trend-life", "favorite", `item:${itemId}`, "favorite", { entityKind: "item", itemId, title: jsonString(item?.title), sourceName: jsonString(item?.sourceName), sourceUrl: jsonString(item?.sourceUrl), kind: jsonString(item?.kind) }, "nova-trend-life:v1", now));
  }
  const brandsById = new Map(trendBrands.map((brand) => [brand.id, brand]));
  for (const brandId of trend.favoriteBrandIds) {
    const brand = brandsById.get(brandId);
    addItem(items, createItem("trend-life", "favorite", `brand:${brandId}`, "favorite", { entityKind: "brand", brandId, name: jsonString(brand?.name), website: jsonString(brand?.website), focus: jsonString(brand?.focus) }, "nova-trend-life:v1", now));
  }
  const themesById = new Map(trendOutfitThemes.map((theme) => [theme.id, theme]));
  for (const themeId of trend.favoriteThemeIds) {
    const theme = themesById.get(themeId);
    addItem(items, createItem("trend-life", "favorite", `theme:${themeId}`, "favorite", { entityKind: "theme", themeId, title: jsonString(theme?.title), suitableFor: jsonString(theme?.suitableFor) }, "nova-trend-life:v1", now));
  }

  const counts = emptyCounts();
  for (const item of items) counts[item.module] += 1;
  return { items, counts, total: items.length };
}

export const FIRST_BATCH_SOURCE_KEYS = {
  movies: MOVIES_TV_STORAGE_KEY,
  foodFavorite: FOOD_STORAGE_KEYS.favorite,
  foodDiscovery: FOOD_STORAGE_KEYS.discovery,
  newsFavorites: NEWS_STORAGE_KEYS.favorites,
  trendLife: "nova-trend-life:v1",
  migrationKey: FIRST_BATCH_MIGRATION_KEY,
};
