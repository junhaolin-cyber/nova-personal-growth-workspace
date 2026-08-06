export type TrendItemKind = "trend" | "new" | "outfit" | "article" | "video";
export type TrendLifeView = "overview" | "new" | "outfit" | "brands" | "articles" | "videos" | "favorites" | "history";

export type TrendItem = {
  id: string;
  kind: TrendItemKind;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;
  tags: string[];
  brand?: string;
  tone: string;
  label: string;
  recommendation?: string;
  featuredInOutfit?: boolean;
};

export type TrendOutfitTheme = {
  id: string;
  title: string;
  reason: string;
  suitableFor: string;
  tags: string[];
  tone: string;
};

export type TrendBrand = {
  id: string;
  name: string;
  description: string;
  website: string;
  focus: string;
  tone: string;
};

export type TrendLifeState = {
  favoriteIds: string[];
  favoriteBrandIds: string[];
  favoriteThemeIds: string[];
  historyIds: string[];
  historyBrandIds: string[];
};
