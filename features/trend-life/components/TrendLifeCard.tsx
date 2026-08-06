import { Bookmark, ExternalLink, Play, Radio } from "lucide-react";
import type { TrendItem } from "../types";

type Props = { item: TrendItem; isFavorite: boolean; onFavorite: () => void; onOpen: () => void };

export function TrendLifeCard({ item, isFavorite, onFavorite, onOpen }: Props) {
  const isVideo = item.kind === "video";
  return <article className="group rounded-[24px] border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[#C9C8FA] hover:shadow-lg sm:p-6">
    <div className={`flex min-h-[116px] items-start justify-between gap-4 rounded-[18px] bg-gradient-to-br ${item.tone} p-4`}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-ink shadow-sm">{isVideo ? <Play size={18} fill="currentColor" /> : item.kind === "article" ? <Radio size={18} /> : <span className="text-lg font-extrabold">N</span>}</div>
      <button type="button" onClick={onFavorite} aria-label={isFavorite ? "取消收藏" : "收藏"} className={`grid size-9 place-items-center rounded-xl bg-white/75 transition hover:bg-white ${isFavorite ? "text-accent" : "text-muted"}`}><Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} /></button>
    </div>
    <div className="mt-5 flex items-center gap-2 text-xs text-muted"><span className="rounded-md bg-canvas px-2 py-1 font-semibold text-ink">{item.label}</span><span>{item.publishedAt}</span></div>
    <h3 className="mt-3 text-base font-extrabold leading-6">{item.title}</h3>
    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.summary}</p>
    {item.recommendation ? <p className="mt-3 rounded-xl bg-[#F8F6FD] px-3 py-2 text-xs leading-5 text-[#7169B1]">推荐说明：{item.recommendation}</p> : null}
    <div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F6F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#7169B1]">{tag}</span>)}</div>
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted"><span className="truncate">来源：{item.sourceName}</span>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" onClick={onOpen} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 font-bold text-white transition hover:opacity-90">{isVideo ? "打开视频" : "查看来源"}<ExternalLink size={13} /></a> : <span className="shrink-0 rounded-lg bg-canvas px-3 py-2">灵感整理</span>}</div>
  </article>;
}
