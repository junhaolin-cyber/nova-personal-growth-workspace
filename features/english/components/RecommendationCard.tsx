import { CheckCircle2, ExternalLink, Heart, PlayCircle } from "lucide-react";
import type { EnglishRecommendation, RecommendationState } from "../types";

const difficultyLabels = { beginner: "初级", intermediate: "中级", advanced: "高级" } as const;
const accentLabels = { us: "美式英语", uk: "英式英语", mixed: "混合口音" } as const;

export function RecommendationCard({ item, state, onToggleFavorite, onToggleWatched }: { item: EnglishRecommendation; state?: RecommendationState; onToggleFavorite: (id: string) => void; onToggleWatched: (id: string) => void }) {
  const details = item.type === "speech"
    ? `${item.speaker} · ${item.durationMinutes} 分钟`
    : item.type === "movie"
      ? `${item.year} · ${item.genre} · ${item.durationMinutes} 分钟`
      : `${item.genre} · 单集 ${item.episodeMinutes} 分钟 · ${item.seasons} 季`;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
      <div className={`relative flex h-36 items-end bg-gradient-to-br ${item.coverTone} p-4`}>
        <div className="absolute right-4 top-4 rounded-xl bg-white/75 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur">{item.coverLabel}</div>
        <div className="max-w-[85%] text-white"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">{item.type === "speech" ? "演讲" : item.type === "movie" ? "电影" : "电视剧"}</p><p className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight">{item.titleZh}</p></div>
      </div>
      <div className="space-y-4 p-5">
        <div><h3 className="font-bold leading-6">{item.titleZh}</h3><p className="mt-1 font-sans text-xs text-muted">{item.titleEn}</p><p className="mt-2 text-xs text-muted">{details}</p></div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-lg bg-[#F1F0FF] px-2 py-1 text-[#5E5CE6]">{difficultyLabels[item.difficulty]}</span><span className="rounded-lg bg-canvas px-2 py-1 text-muted">{accentLabels[item.accent]}</span>{item.topics.slice(0, 1).map((topic) => <span key={topic} className="rounded-lg bg-canvas px-2 py-1 text-muted">{topic}</span>)}</div>
        <p className="line-clamp-3 text-sm leading-6 text-muted">{item.summary}</p><p className="rounded-xl bg-canvas px-3 py-2 text-xs leading-5 text-ink"><span className="font-bold">推荐理由：</span>{item.reason}</p>
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button onClick={() => onToggleFavorite(item.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${state?.isFavorite ? "bg-[#F8EBD8] text-[#AD753C]" : "bg-canvas text-muted hover:text-ink"}`}><Heart size={14} fill={state?.isFavorite ? "currentColor" : "none"} />{state?.isFavorite ? "已收藏" : "收藏"}</button>
          <button onClick={() => onToggleWatched(item.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${state?.isWatched ? "bg-[#DDEFE4] text-[#43845D]" : "bg-canvas text-muted hover:text-ink"}`}><CheckCircle2 size={14} />{state?.isWatched ? "已看过" : "标记看过"}</button>
          {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-2 text-xs font-semibold text-white"><PlayCircle size={14} />查看内容<ExternalLink size={12} /></a> : <span className="ml-auto text-[11px] text-muted">暂无链接</span>}
        </div>
        {item.type === "speech" && <p className="text-[11px] text-muted">字幕：{item.captions.english ? "英文" : "无英文"}{item.captions.bilingual ? " · 中英双语" : ""}</p>}
        {item.type !== "speech" && <p className="text-[11px] text-muted">适合学习：{item.learningScenes.join("、")}</p>}
      </div>
    </article>
  );
}
