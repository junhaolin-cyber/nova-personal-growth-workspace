import * as React from "react";
import { Clapperboard, Mic2, SlidersHorizontal, Tv } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import type { EnglishRecommendation, RecommendationFilter, RecommendationState, RecommendationType } from "../types";

const tabs: Array<{ key: RecommendationType; label: string; icon: typeof Mic2 }> = [
  { key: "speech", label: "英语演讲", icon: Mic2 },
  { key: "movie", label: "英语电影", icon: Clapperboard },
  { key: "series", label: "英语电视剧", icon: Tv },
];
const filters: Array<{ key: RecommendationFilter; label: string }> = [
  { key: "all", label: "全部" }, { key: "beginner", label: "初级" }, { key: "intermediate", label: "中级" }, { key: "advanced", label: "高级" }, { key: "us", label: "美式英语" }, { key: "uk", label: "英式英语" },
];

export function RecommendationSection({ items, recommendationState, onToggleFavorite, onToggleWatched }: { items: EnglishRecommendation[]; recommendationState: Record<string, RecommendationState>; onToggleFavorite: (id: string) => void; onToggleWatched: (id: string) => void }) {
  const [activeTab, setActiveTab] = React.useState<RecommendationType>("speech");
  const [filter, setFilter] = React.useState<RecommendationFilter>("all");
  const visibleItems = items.filter((item) => item.type === activeTab && (filter === "all" || item.difficulty === filter || item.accent === filter));
  return (
    <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold text-accent"><SlidersHorizontal size={15} />精选推荐</div><h2 className="mt-2 text-2xl font-extrabold">把英语放进真实语境里</h2><p className="mt-2 text-sm text-muted">先从你感兴趣的内容开始，慢慢建立自己的英语输入库。</p></div><span className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">本地精选内容</span></div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setActiveTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${activeTab === key ? "bg-ink text-white" : "bg-canvas text-muted hover:text-ink"}`}><Icon size={15} />{label}</button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">{filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${filter === item.key ? "bg-[#F1F0FF] text-[#5E5CE6]" : "text-muted hover:bg-canvas"}`}>{item.label}</button>)}</div>
      {visibleItems.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <RecommendationCard key={item.id} item={item} state={recommendationState[item.id]} onToggleFavorite={onToggleFavorite} onToggleWatched={onToggleWatched} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#D4D8DF] bg-canvas/40 px-5 py-10 text-center text-sm text-muted">当前筛选下暂无推荐内容。</div>}
    </section>
  );
}
