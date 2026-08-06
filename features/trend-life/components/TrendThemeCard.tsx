import { Bookmark, Sparkles } from "lucide-react";
import type { TrendOutfitTheme } from "../types";

type TrendThemeCardProps = {
  theme: TrendOutfitTheme;
  isFavorite: boolean;
  onFavorite: () => void;
};

export function TrendThemeCard({ theme, isFavorite, onFavorite }: TrendThemeCardProps) {
  return (
    <article className={`rounded-[24px] border border-line bg-gradient-to-br ${theme.tone} p-5 shadow-card sm:p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold text-[#765E9B]"><Sparkles size={14} />今日穿搭主题</p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{theme.title}</h3>
        </div>
        <button type="button" onClick={onFavorite} aria-label={isFavorite ? "取消收藏今日穿搭主题" : "收藏今日穿搭主题"} className={`grid size-9 place-items-center rounded-xl bg-white/75 transition hover:bg-white ${isFavorite ? "text-accent" : "text-muted"}`}>
          <Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{theme.reason}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted"><span>适合：{theme.suitableFor}</span>{theme.tags.map((tag) => <span key={tag} className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-[#7169B1]">{tag}</span>)}</div>
    </article>
  );
}
