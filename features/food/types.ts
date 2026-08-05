export type FoodListStatus = "want" | "visited" | "considering";
export type RestaurantSourceProvider = "local" | "amap";
export type EvidenceConfidence = "high" | "medium" | "low";

export interface SourcedValue<T> {
  value: T;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  isExplicitFact: boolean;
  confidence: EvidenceConfidence;
}

export interface OfficialRestaurantData {
  sourceUrl: SourcedValue<string>;
  openingHours?: SourcedValue<string>;
  menuUrl?: SourcedValue<string>;
  description?: SourcedValue<string>;
  phone?: SourcedValue<string>;
  photos?: SourcedValue<string[]>;
  activities?: SourcedValue<string>;
  dishes?: SourcedValue<string[]>;
}

export interface OfficialSourceRecord {
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  status: "success" | "failed";
  message?: string;
}

export interface RestaurantLocation {
  longitude: number;
  latitude: number;
}

export interface RestaurantRecord {
  id: string;
  name: string;
  address: string;
  city: string;
  status: FoodListStatus;
  source: "user-input" | "public-source";
  sourceLabel: string;
  sourceProvider?: RestaurantSourceProvider;
  sourcePlaceId?: string;
  queriedAt?: string;
  sourceUrl?: string;
  phone?: string;
  category?: string;
  location?: RestaurantLocation;
  openingHours?: string;
  photos?: string[];
  rating?: number;
  cost?: number;
  tags?: string[];
  officialSource?: OfficialSourceRecord;
  officialData?: OfficialRestaurantData;
  createdAt: string;
  updatedAt: string;
  lastVisitedAt?: string;
}

export interface VisitRecord {
  id: string;
  restaurantId: string;
  visitedAt: string;
  dishes: string;
  spendPerPerson: number | null;
  personalRating: number | null;
  note: string;
  wouldReturn: boolean | null;
}

export interface FoodDiscoveryState {
  version: 1;
  restaurants: RestaurantRecord[];
  favoriteRestaurantIds: string[];
  visits: VisitRecord[];
}

export interface RestaurantSearchInput {
  name: string;
  address: string;
  city: string;
}

export interface FoodAnalysis {
  summary: string;
  suitableFor: string[];
  suggestions: string[];
  cautions: string[];
  recommendationIndex: string;
  basis: string;
}
