import type { EvidenceConfidence, FoodDiscoveryState, OfficialRestaurantData, OfficialSourceRecord, RestaurantRecord, RestaurantSourceProvider, SourcedValue, VisitRecord } from "./types";
import { notifyFirstBatchStorageChanged } from "@/features/sync/events";

export const FOOD_STORAGE_KEYS = {
  discovery: "nova:food-discovery:v1",
  favorite: "nova:food-favorite:v1",
  history: "nova:food-history:v1",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const asObject = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asNumberOrNull = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const asBooleanOrNull = (value: unknown): boolean | null => typeof value === "boolean" ? value : null;
const asConfidence = (value: unknown): EvidenceConfidence => value === "high" || value === "low" ? value : "medium";

function read(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown; } catch { return undefined; }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 本地存储异常不能阻断页面 */ }
}

function normalizeSourcedValue<T>(value: unknown, normalize: (item: unknown) => T | undefined): SourcedValue<T> | undefined {
  const source = asObject(value);
  const normalizedValue = normalize(source.value);
  if (normalizedValue === undefined || !source.sourceUrl || !source.fetchedAt) return undefined;
  return {
    value: normalizedValue,
    sourceName: asString(source.sourceName, "官网页面"),
    sourceUrl: asString(source.sourceUrl),
    fetchedAt: asString(source.fetchedAt),
    isExplicitFact: source.isExplicitFact !== false,
    confidence: asConfidence(source.confidence),
  };
}

function normalizeStringValue(value: unknown): string | undefined {
  return typeof value === "string" && Boolean(value.trim()) ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return items.length ? items : undefined;
}

function normalizeOfficialData(value: unknown): OfficialRestaurantData | undefined {
  const source = asObject(value);
  const sourceUrl = normalizeSourcedValue(source.sourceUrl, normalizeStringValue);
  if (!sourceUrl) return undefined;
  return {
    sourceUrl,
    openingHours: normalizeSourcedValue(source.openingHours, normalizeStringValue),
    menuUrl: normalizeSourcedValue(source.menuUrl, normalizeStringValue),
    description: normalizeSourcedValue(source.description, normalizeStringValue),
    phone: normalizeSourcedValue(source.phone, normalizeStringValue),
    photos: normalizeSourcedValue(source.photos, normalizeStringArray),
    activities: normalizeSourcedValue(source.activities, normalizeStringValue),
    dishes: normalizeSourcedValue(source.dishes, normalizeStringArray),
  };
}

function normalizeOfficialSource(value: unknown): OfficialSourceRecord | undefined {
  const source = asObject(value);
  if (typeof source.sourceUrl !== "string" || !source.sourceUrl || typeof source.fetchedAt !== "string" || !source.fetchedAt) return undefined;
  return {
    sourceName: asString(source.sourceName, "官网页面"),
    sourceUrl: source.sourceUrl,
    fetchedAt: source.fetchedAt,
    status: source.status === "success" ? "success" : "failed",
    message: typeof source.message === "string" ? source.message : undefined,
  };
}

function normalizeRestaurant(value: unknown): RestaurantRecord | null {
  const source = asObject(value);
  const status = source.status === "want" || source.status === "visited" || source.status === "considering" ? source.status : "considering";
  const sourceProvider: RestaurantSourceProvider = source.sourceProvider === "amap" ? "amap" : "local";
  if (!source.id || !source.name) return null;
  return {
    id: asString(source.id),
    name: asString(source.name),
    address: asString(source.address),
    city: asString(source.city),
    status,
    source: source.source === "public-source" ? "public-source" : "user-input",
    sourceLabel: asString(source.sourceLabel, sourceProvider === "amap" ? "高德地图" : "用户输入（未连接公开数据源）"),
    sourceProvider,
    sourcePlaceId: typeof source.sourcePlaceId === "string" ? source.sourcePlaceId : undefined,
    queriedAt: typeof source.queriedAt === "string" ? source.queriedAt : undefined,
    sourceUrl: typeof source.sourceUrl === "string" ? source.sourceUrl : undefined,
    phone: typeof source.phone === "string" ? source.phone : undefined,
    category: typeof source.category === "string" ? source.category : undefined,
    location: typeof source.location === "object" && source.location !== null && typeof (source.location as { longitude?: unknown }).longitude === "number" && typeof (source.location as { latitude?: unknown }).latitude === "number" ? { longitude: (source.location as { longitude: number }).longitude, latitude: (source.location as { latitude: number }).latitude } : undefined,
    openingHours: typeof source.openingHours === "string" ? source.openingHours : undefined,
    photos: Array.isArray(source.photos) ? source.photos.filter((item): item is string => typeof item === "string") : undefined,
    rating: asNumberOrNull(source.rating) ?? undefined,
    cost: asNumberOrNull(source.cost) ?? undefined,
    tags: Array.isArray(source.tags) ? source.tags.filter((item): item is string => typeof item === "string") : undefined,
    officialSource: normalizeOfficialSource(source.officialSource),
    officialData: normalizeOfficialData(source.officialData),
    createdAt: asString(source.createdAt, new Date().toISOString()),
    updatedAt: asString(source.updatedAt, new Date().toISOString()),
    lastVisitedAt: typeof source.lastVisitedAt === "string" ? source.lastVisitedAt : undefined,
  };
}

function normalizeVisit(value: unknown): VisitRecord | null {
  const source = asObject(value);
  if (!source.id || !source.restaurantId || !source.visitedAt) return null;
  return {
    id: asString(source.id),
    restaurantId: asString(source.restaurantId),
    visitedAt: asString(source.visitedAt),
    dishes: asString(source.dishes),
    spendPerPerson: asNumberOrNull(source.spendPerPerson),
    personalRating: asNumberOrNull(source.personalRating),
    note: asString(source.note),
    wouldReturn: asBooleanOrNull(source.wouldReturn),
  };
}

const normalizeRestaurants = (value: unknown) => Array.isArray(value) ? value.map(normalizeRestaurant).filter((item): item is RestaurantRecord => Boolean(item)) : [];
const normalizeVisits = (value: unknown) => Array.isArray(value) ? value.map(normalizeVisit).filter((item): item is VisitRecord => Boolean(item)) : [];
const normalizeIds = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function createDefaultFoodState(): FoodDiscoveryState {
  return { version: 1, restaurants: [], favoriteRestaurantIds: [], visits: [] };
}

export function loadFoodState(): FoodDiscoveryState {
  const discovery = asObject(read(FOOD_STORAGE_KEYS.discovery));
  const restaurants = normalizeRestaurants(discovery.restaurants);
  const favoriteRestaurantIds = normalizeIds(read(FOOD_STORAGE_KEYS.favorite)).filter((id) => restaurants.some((restaurant) => restaurant.id === id));
  const visits = normalizeVisits(read(FOOD_STORAGE_KEYS.history));
  return { version: 1, restaurants, favoriteRestaurantIds, visits };
}

export function saveFoodState(state: FoodDiscoveryState) {
  write(FOOD_STORAGE_KEYS.discovery, { version: 1, restaurants: state.restaurants });
  write(FOOD_STORAGE_KEYS.favorite, state.favoriteRestaurantIds);
  write(FOOD_STORAGE_KEYS.history, state.visits);
  notifyFirstBatchStorageChanged("food");
}
