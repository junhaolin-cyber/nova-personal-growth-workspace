import { fallbackMedia } from "./data";
import type { MediaCategory, MediaDetail, MediaItem, MediaType } from "./types";

type TmdbMedia = {
  id?: unknown;
  media_type?: unknown;
  title?: unknown;
  name?: unknown;
  original_title?: unknown;
  original_name?: unknown;
  poster_path?: unknown;
  backdrop_path?: unknown;
  release_date?: unknown;
  first_air_date?: unknown;
  overview?: unknown;
  vote_average?: unknown;
  vote_count?: unknown;
  popularity?: unknown;
  genre_ids?: unknown;
  genres?: unknown;
  runtime?: unknown;
  episode_run_time?: unknown;
  production_countries?: unknown;
  credits?: unknown;
  videos?: unknown;
  "watch/providers"?: unknown;
};

type TmdbListResponse = { results?: unknown };

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_URL = "https://image.tmdb.org/t/p/w780";
const TMDB_REQUEST_TIMEOUT = 10_000;

const genreNames: Record<number, string> = {
  16: "动画", 18: "剧情", 35: "喜剧", 36: "历史", 53: "惊悚", 80: "犯罪", 99: "纪录片", 10749: "爱情", 10751: "家庭", 10759: "动作冒险", 10764: "真人秀", 10767: "脱口秀", 10765: "科幻与奇幻", 10768: "战争与政治",
};

export function hasTmdbToken(): boolean {
  return Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie";
}

function getCategory(mediaType: MediaType, override?: MediaCategory): MediaCategory {
  return override ?? (mediaType === "tv" ? "tv" : "movie");
}

function getGenres(payload: TmdbMedia): string[] {
  if (Array.isArray(payload.genres)) {
    return payload.genres.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const name = asString((item as Record<string, unknown>).name);
      return name ? [name] : [];
    });
  }
  if (!Array.isArray(payload.genre_ids)) return [];
  return payload.genre_ids.flatMap((id) => typeof id === "number" && genreNames[id] ? [genreNames[id]] : []);
}

function getCast(payload: TmdbMedia): string[] {
  const cast = payload.credits && typeof payload.credits === "object" ? (payload.credits as Record<string, unknown>).cast : undefined;
  if (!Array.isArray(cast)) return [];
  return cast.slice(0, 5).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const name = asString((item as Record<string, unknown>).name);
    return name ? [name] : [];
  });
}

function getDirector(payload: TmdbMedia): string | undefined {
  const crew = payload.credits && typeof payload.credits === "object" ? (payload.credits as Record<string, unknown>).crew : undefined;
  if (!Array.isArray(crew)) return undefined;
  const director = crew.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).job === "Director");
  return director && typeof director === "object" ? asString((director as Record<string, unknown>).name) : undefined;
}

function getTrailerUrl(payload: TmdbMedia): string | undefined {
  const results = payload.videos && typeof payload.videos === "object" ? (payload.videos as Record<string, unknown>).results : undefined;
  if (!Array.isArray(results)) return undefined;
  const trailer = results.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).site === "YouTube" && (item as Record<string, unknown>).type === "Trailer");
  const key = trailer && typeof trailer === "object" ? asString((trailer as Record<string, unknown>).key) : undefined;
  return key ? `https://www.youtube.com/watch?v=${encodeURIComponent(key)}` : undefined;
}

function getProviders(payload: TmdbMedia): Array<{ name: string; logoUrl?: string; link?: string }> {
  const providerRoot = payload["watch/providers"];
  if (!providerRoot || typeof providerRoot !== "object") return [];
  const results = (providerRoot as Record<string, unknown>).results;
  if (!results || typeof results !== "object") return [];
  const region = (results as Record<string, unknown>).CN ?? (results as Record<string, unknown>).US;
  if (!region || typeof region !== "object") return [];
  const regionRecord = region as Record<string, unknown>;
  const providers = [regionRecord.flatrate, regionRecord.rent, regionRecord.buy].flatMap((value) => Array.isArray(value) ? value : []);
  return providers.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = asString(record.provider_name);
    if (!name) return [];
    const logoPath = asString(record.logo_path);
    return [{ name, logoUrl: logoPath ? `${TMDB_IMAGE_URL}${logoPath}` : undefined, link: asString(regionRecord.link) }];
  });
}

export function mapTmdbMedia(payload: TmdbMedia, categoryOverride?: MediaCategory): MediaItem | null {
  const id = asNumber(payload.id);
  const title = asString(payload.title) ?? asString(payload.name);
  if (!id || !title) return null;
  const mediaType = getMediaType(payload.media_type);
  const releaseDate = asString(payload.release_date) ?? asString(payload.first_air_date);
  const posterPath = asString(payload.poster_path);
  const backdropPath = asString(payload.backdrop_path);
  const rating = asNumber(payload.vote_average);
  return {
    id: `tmdb:${mediaType}:${id}`,
    externalId: id,
    mediaType,
    category: getCategory(mediaType, categoryOverride),
    title,
    originalTitle: asString(payload.original_title) ?? asString(payload.original_name),
    posterUrl: posterPath ? `${TMDB_IMAGE_URL}${posterPath}` : backdropPath ? `${TMDB_BACKDROP_URL}${backdropPath}` : undefined,
    releaseDate,
    genres: getGenres(payload),
    runtimeMinutes: asNumber(payload.runtime) ?? (Array.isArray(payload.episode_run_time) ? asNumber(payload.episode_run_time[0]) : undefined),
    rating,
    ratingCount: asNumber(payload.vote_count),
    director: getDirector(payload),
    cast: getCast(payload),
    overview: asString(payload.overview) ?? "暂无公开剧情简介。",
    trailerUrl: getTrailerUrl(payload),
    officialUrl: `https://www.themoviedb.org/${mediaType}/${id}`,
    sourceName: "TMDB",
    sourceUrl: `https://www.themoviedb.org/${mediaType}/${id}`,
    popularity: asNumber(payload.popularity),
    aiReason: rating ? `根据 TMDB 公开评分、热度和类型信息整理，具体信息请以原页面为准。` : "当前公开资料不足，建议打开原页面了解完整信息。",
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) return null;
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  try {
    const response = await fetch(url, { headers: { accept: "application/json", Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TMDB_REQUEST_TIMEOUT), next: { revalidate: 900 } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function scopeQuery(scope: string): { path: string; params: Record<string, string>; category?: MediaCategory } {
  const common = { language: "zh-CN", include_adult: "false", page: "1" };
  if (scope === "movie") return { path: "/movie/popular", params: common, category: "movie" };
  if (scope === "tv") return { path: "/tv/popular", params: common, category: "tv" };
  if (scope === "documentary") return { path: "/discover/movie", params: { ...common, sort_by: "popularity.desc", with_genres: "99" }, category: "documentary" };
  if (scope === "anime") return { path: "/discover/tv", params: { ...common, sort_by: "popularity.desc", with_genres: "16" }, category: "anime" };
  if (scope === "variety") return { path: "/discover/tv", params: { ...common, sort_by: "popularity.desc", with_genres: "10764|10767" }, category: "variety" };
  return { path: "/trending/all/day", params: { language: "zh-CN" } };
}

export async function discoverMedia(scope: string): Promise<{ items: MediaItem[]; live: boolean; sourceName: string; warning?: string }> {
  if (!hasTmdbToken()) return { items: fallbackMedia, live: false, sourceName: "本地公开精选", warning: "尚未配置 TMDB API Key，当前显示真实影视基础片单，不代表实时热度。" };
  const query = scopeQuery(scope);
  const payload = await tmdbFetch<TmdbListResponse>(query.path, query.params);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const items = results.flatMap((item) => item && typeof item === "object" ? [mapTmdbMedia(item as TmdbMedia, query.category)].filter((value): value is MediaItem => value !== null) : []).slice(0, 20);
  return items.length ? { items, live: true, sourceName: "TMDB", warning: undefined } : { items: fallbackMedia, live: false, sourceName: "本地公开精选", warning: "TMDB 暂时没有返回内容，当前显示真实影视基础片单。" };
}

export async function searchMedia(query: string): Promise<{ items: MediaItem[]; live: boolean; sourceName: string; warning?: string }> {
  if (!hasTmdbToken()) return { items: fallbackMedia.filter((item) => `${item.title} ${item.originalTitle ?? ""} ${item.genres.join(" ")}`.toLowerCase().includes(query.toLowerCase())), live: false, sourceName: "本地公开精选", warning: "尚未配置 TMDB API Key，当前仅搜索基础公开片单。" };
  const payload = await tmdbFetch<TmdbListResponse>("/search/multi", { query, language: "zh-CN", include_adult: "false", page: "1" });
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const items = results.flatMap((item) => item && typeof item === "object" && ((item as TmdbMedia).media_type === "movie" || (item as TmdbMedia).media_type === "tv") ? [mapTmdbMedia(item as TmdbMedia)].filter((value): value is MediaItem => value !== null) : []).slice(0, 20);
  return { items, live: true, sourceName: "TMDB", warning: undefined };
}

export async function getMediaDetail(id: number, mediaType: MediaType): Promise<MediaDetail | null> {
  const payload = await tmdbFetch<TmdbMedia>(`/${mediaType}/${id}`, { language: "zh-CN", append_to_response: "credits,videos,watch/providers" });
  const item = payload ? mapTmdbMedia({ ...payload, media_type: mediaType }, undefined) : null;
  if (!item) return null;
  return { ...item, providers: payload ? getProviders(payload) : [] };
}
