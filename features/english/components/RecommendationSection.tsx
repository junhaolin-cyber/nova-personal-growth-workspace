import * as React from "react";
import { Clapperboard, Mic2, SlidersHorizontal, Tv } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { getDateKey } from "../logic/date";
import { getDailySpeechRecommendations, getWeeklyMovieRecommendations, getWeeklySeriesRecommendations } from "../logic/recommendations";
import type { EnglishRecommendation, RecommendationFilter, RecommendationState, RecommendationType } from "../types";
import type { OnlineRecommendation, OnlineRecommendationResponse, RecommendationItem } from "../onlineTypes";

const tabs: Array<{ key: RecommendationType; label: string; icon: typeof Mic2 }> = [
  { key: "speech", label: "英语演讲", icon: Mic2 },
  { key: "movie", label: "英语电影", icon: Clapperboard },
  { key: "series", label: "英语电视剧", icon: Tv },
];
const filters: Array<{ key: RecommendationFilter; label: string }> = [
  { key: "all", label: "全部" }, { key: "beginner", label: "初级" }, { key: "intermediate", label: "中级" }, { key: "advanced", label: "高级" }, { key: "us", label: "美式英语" }, { key: "uk", label: "英式英语" },
];

const onlineEndpoints: Record<RecommendationType, string> = {
  speech: "/api/english/recommendations/speeches",
  movie: "/api/english/recommendations/movies",
  series: "/api/english/recommendations/tv",
};

function isOnlineRecommendationResponse(value: unknown): value is OnlineRecommendationResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.source !== "online" && record.source !== "fallback") return false;
  if (!Array.isArray(record.items)) return false;
  return record.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const recommendation = item as Record<string, unknown>;
    return typeof recommendation.id === "string"
      && (recommendation.type === "speech" || recommendation.type === "movie" || recommendation.type === "series")
      && typeof recommendation.titleZh === "string"
      && typeof recommendation.titleEn === "string"
      && typeof recommendation.coverLabel === "string"
      && typeof recommendation.coverTone === "string"
      && Array.isArray(recommendation.topics)
      && typeof recommendation.summary === "string"
      && typeof recommendation.reason === "string"
      && Array.isArray(recommendation.learningScenes)
      && (recommendation.source === "TMDB" || recommendation.source === "YouTube")
      && typeof recommendation.detailText === "string";
  });
}

function supportsOnlineFilter(items: OnlineRecommendation[], filter: RecommendationFilter) {
  if (filter === "all") return true;
  const isDifficultyFilter = filter === "beginner" || filter === "intermediate" || filter === "advanced";
  return items.some((item) => isDifficultyFilter ? item.difficulty !== undefined : item.accent !== undefined);
}

export function RecommendationSection({ items, recommendationState, onToggleFavorite, onToggleWatched }: { items: EnglishRecommendation[]; recommendationState: Record<string, RecommendationState>; onToggleFavorite: (id: string) => void; onToggleWatched: (id: string) => void }) {
  const [activeTab, setActiveTab] = React.useState<RecommendationType>("speech");
  const [filter, setFilter] = React.useState<RecommendationFilter>("all");
  const [onlineByType, setOnlineByType] = React.useState<Partial<Record<RecommendationType, OnlineRecommendation[]>>>({});
  const [dateKey] = React.useState(() => getDateKey());
  React.useEffect(() => {
    let active = true;
    const loadOnlineRecommendations = async (type: RecommendationType) => {
      try {
        const response = await fetch(onlineEndpoints[type]);
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!active || !isOnlineRecommendationResponse(payload) || payload.source !== "online" || !payload.items.length) return;
        setOnlineByType((current) => ({ ...current, [type]: payload.items }));
      } catch {
        // Keep the local recommendation pool when an online source is unavailable.
      }
    };

    void Promise.all((Object.keys(onlineEndpoints) as RecommendationType[]).map(loadOnlineRecommendations));
    return () => {
      active = false;
    };
  }, []);

  const onlineItems = onlineByType[activeTab] ?? [];
  const isOnline = onlineItems.length > 0;
  const sourceItems: RecommendationItem[] = isOnline ? onlineItems : items.filter((item) => item.type === activeTab);
  const onlineFilterSupported = isOnline && supportsOnlineFilter(onlineItems, filter);
  const effectiveFilter = isOnline && filter !== "all" && !onlineFilterSupported ? "all" : filter;
  React.useEffect(() => {
    if (effectiveFilter !== filter) setFilter(effectiveFilter);
  }, [effectiveFilter, filter]);
  const filteredItems = sourceItems.filter((item) => effectiveFilter === "all" || !isOnline || item.difficulty === effectiveFilter || item.accent === effectiveFilter);
  const visibleItems: RecommendationItem[] = isOnline
    ? filteredItems.slice(0, 3)
    : activeTab === "speech"
      ? getDailySpeechRecommendations(filteredItems.filter((item): item is Extract<EnglishRecommendation, { type: "speech" }> => item.type === "speech"), dateKey)
      : activeTab === "movie"
        ? getWeeklyMovieRecommendations(filteredItems.filter((item): item is Extract<EnglishRecommendation, { type: "movie" }> => item.type === "movie"), dateKey)
        : getWeeklySeriesRecommendations(filteredItems.filter((item): item is Extract<EnglishRecommendation, { type: "series" }> => item.type === "series"), dateKey);
  return (
    <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold text-accent"><SlidersHorizontal size={15} />精选推荐</div><h2 className="mt-2 text-2xl font-extrabold">把英语放进真实语境里</h2><p className="mt-2 text-sm text-muted">先从你感兴趣的内容开始，慢慢建立自己的英语输入库。</p></div><span className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">{isOnline ? "在线精选内容" : "本地精选内容"}</span></div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setActiveTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${activeTab === key ? "bg-ink text-white" : "bg-canvas text-muted hover:text-ink"}`}><Icon size={15} />{label}</button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">{filters.map((item) => {
        const disabled = isOnline && item.key !== "all" && !supportsOnlineFilter(onlineItems, item.key);
        return <button key={item.key} type="button" disabled={disabled} onClick={() => setFilter(item.key)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${disabled ? "cursor-not-allowed opacity-40" : effectiveFilter === item.key ? "bg-[#F1F0FF] text-[#5E5CE6]" : "text-muted hover:bg-canvas"}`}>{item.label}</button>;
      })}</div>
      {visibleItems.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <RecommendationCard key={item.id} item={item} state={recommendationState[item.id]} onToggleFavorite={onToggleFavorite} onToggleWatched={onToggleWatched} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#D4D8DF] bg-canvas/40 px-5 py-10 text-center text-sm text-muted">当前筛选下暂无推荐内容。</div>}
    </section>
  );
}
