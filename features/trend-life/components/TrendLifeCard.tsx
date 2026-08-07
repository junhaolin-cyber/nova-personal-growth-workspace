import { Bookmark, ExternalLink, Play, Radio } from "lucide-react";
import { getTrendLifePlaceholder } from "../placeholder";
import type { TrendItem } from "../types";

type Props = { item: TrendItem; coverUrl?: string; isFavorite: boolean; onFavorite: () => void; onOpen: () => void };

export function TrendLifeCard({ item, coverUrl, isFavorite, onFavorite, onOpen }: Props) {
  const isVideo = item.kind === "video";
  const placeholderUrl = getTrendLifePlaceholder(item);
  const resolvedCoverUrl = coverUrl ?? item.coverUrl ?? placeholderUrl;
  return <article className="group rounded-[24px] border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-[#C9C8FA] hover:shadow-lg sm:p-6">
    <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#F6F3FF] sm:aspect-auto sm:h-[172px]">
      <img src={resolvedCoverUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = placeholderUrl; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
      <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4"><span className="grid size-10 place-items-center rounded-2xl bg-white/85 text-ink shadow-sm">{isVideo ? <Play size={18} fill="currentColor" /> : item.kind === "article" ? <Radio size={18} /> : <span className="text-lg font-extrabold">N</span>}</span><span className="max-w-[120px] truncate rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink sm:max-w-[180px]">{item.sourceName}</span></div>
      <button type="button" onClick={onFavorite} aria-label={isFavorite ? "取消收藏" : "收藏"} className={`absolute right-3 top-3 grid size-11 place-items-center rounded-xl bg-white/75 transition hover:bg-white sm:right-4 sm:top-4 sm:size-9 ${isFavorite ? "text-accent" : "text-muted"}`}><Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} /></button>
      <div className="absolute bottom-4 left-4 right-4 hidden items-end justify-between gap-3 text-white sm:flex"><p className="line-clamp-2 text-base font-extrabold leading-6">{item.title}</p><span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink">{isVideo ? "视频" : "文章"}</span></div>
    </div>
    <div className="mt-4 sm:hidden"><p className="line-clamp-2 text-lg font-extrabold leading-7">{item.title}</p><p className="mt-1 text-xs text-muted">{isVideo ? "视频推荐" : "文章推荐"}</p></div>
    <div className="mt-3 flex items-center gap-2 text-xs text-muted sm:mt-5"><span className="rounded-md bg-canvas px-2 py-1 font-semibold text-ink">{item.label}</span><span className="hidden sm:inline">{item.publishedAt}</span></div>
    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{item.summary}</p>
    {item.recommendation ? <p className="mt-3 hidden rounded-xl bg-[#F8F6FD] px-3 py-2 text-xs leading-5 text-[#7169B1] sm:block">推荐说明：{item.recommendation}</p> : null}
    <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{item.tags.slice(0, 2).map((tag) => <span key={tag} className="max-w-full truncate rounded-full bg-[#F6F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#7169B1]">{tag}</span>)}</div>
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted sm:mt-5 sm:gap-3 sm:pt-4"><span className="hidden truncate sm:inline">来源：{item.sourceName}</span>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" onClick={onOpen} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 font-bold text-white transition hover:opacity-90 sm:min-h-0">{isVideo ? "打开视频" : "查看来源"}<ExternalLink size={13} /></a> : <span className="shrink-0 rounded-lg bg-canvas px-3 py-2">灵感整理</span>}</div>
  </article>;
}
