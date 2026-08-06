import { Bookmark, CalendarDays, Clapperboard, Star } from "lucide-react";
import type { MediaItem } from "../types";

type MediaCardProps = { item: MediaItem; isFavorite: boolean; isWatched: boolean; onFavorite: () => void; onOpen: () => void };

export function MediaCard({ item, isFavorite, isWatched, onFavorite, onOpen }: MediaCardProps) {
  return (
    <article className="group rounded-[24px] border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-[#C9C8FA] hover:shadow-lg">
      <div className="relative h-[240px] overflow-hidden rounded-[18px] bg-gradient-to-br from-[#E9E7FA] via-[#F8F5FF] to-[#E9F1F4] bg-cover bg-center" style={item.posterUrl ? { backgroundImage: `url(${item.posterUrl})` } : undefined}>
        {!item.posterUrl ? <div className="grid h-full place-items-center text-[#8D87B6]"><Clapperboard size={34} /></div> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/5" />
        <div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-ink">{item.mediaType === "tv" ? "剧集" : "电影"}</span>{isWatched ? <span className="rounded-full bg-[#DDF1E5]/90 px-2.5 py-1 text-[11px] font-bold text-[#397A52]">已看</span> : null}</div>
        <button type="button" onClick={onFavorite} aria-label={isFavorite ? `取消收藏 ${item.title}` : `收藏 ${item.title}`} className={`absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-white/85 transition hover:bg-white ${isFavorite ? "text-accent" : "text-muted"}`}><Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} /></button>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white"><div className="min-w-0"><p className="truncate text-lg font-extrabold">{item.title}</p><p className="mt-1 truncate text-xs text-white/75">{item.originalTitle ?? item.country ?? "公开资料"}</p></div>{item.rating ? <span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Star size={14} fill="currentColor" />{item.rating.toFixed(1)}</span> : null}</div>
      </div>
      <button type="button" onClick={onOpen} className="mt-4 w-full text-left"><div className="flex items-center gap-2 text-xs text-muted"><CalendarDays size={13} />{item.releaseDate ?? "上映时间暂无公开资料"}<span>·</span><span>{item.genres.slice(0, 2).join(" / ") || "类型待补充"}</span></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{item.overview}</p><div className="mt-4 flex flex-wrap gap-2">{item.genres.slice(0, 3).map((genre) => <span key={genre} className="rounded-full bg-[#F6F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#7169B1]">{genre}</span>)}</div></button>
    </article>
  );
}
