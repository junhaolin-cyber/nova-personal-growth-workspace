export type MediaType = "movie" | "tv";
export type MediaCategory = "movie" | "tv" | "documentary" | "anime" | "variety";
export type MediaView = "today" | MediaCategory | "favorites" | "history";
export type WatchStatus = "want" | "watched";

export type MediaItem = {
  id: string;
  externalId?: number;
  mediaType: MediaType;
  category: MediaCategory;
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  country?: string;
  genres: string[];
  runtimeMinutes?: number;
  rating?: number;
  ratingCount?: number;
  director?: string;
  cast: string[];
  overview: string;
  trailerUrl?: string;
  officialUrl?: string;
  sourceName: string;
  sourceUrl: string;
  popularity?: number;
  aiReason: string;
};

export type WatchRecord = {
  mediaId: string;
  status: WatchStatus;
  rating?: number;
  watchedAt?: string;
  note?: string;
};

export type MoviesTvState = {
  favoriteIds: string[];
  watchRecords: WatchRecord[];
};

export type MediaDetail = MediaItem & {
  productionCompanies?: string[];
  providers?: Array<{ name: string; logoUrl?: string; link?: string }>;
  relatedItems?: MediaItem[];
};
