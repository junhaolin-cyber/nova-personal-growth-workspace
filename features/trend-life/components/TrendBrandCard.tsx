import { Bookmark, ExternalLink } from "lucide-react";
import type { TrendBrand } from "../types";

type TrendBrandCardProps = {
  brand: TrendBrand;
  isFavorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
};

export function TrendBrandCard({ brand, isFavorite, onFavorite, onOpen }: TrendBrandCardProps) {
  return (
    <article className="flex items-center gap-4 rounded-[22px] border border-line bg-white p-4 shadow-card transition hover:border-[#C9C8FA] sm:p-5">
      <div className={`grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ${brand.tone}`}>
        {brand.name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold">{brand.name}</h3>
        <p className="mt-1 text-xs text-muted">{brand.focus} · {brand.description}</p>
      </div>
      <button
        type="button"
        onClick={onFavorite}
        aria-label={isFavorite ? `取消收藏 ${brand.name}` : `收藏 ${brand.name}`}
        className={`grid size-9 shrink-0 place-items-center rounded-xl transition ${isFavorite ? "bg-[#F1E8F6] text-[#8A5BA6]" : "bg-canvas text-muted hover:text-ink"}`}
      >
        <Bookmark size={15} fill={isFavorite ? "currentColor" : "none"} />
      </button>
      <a
        href={brand.website}
        target="_blank"
        rel="noreferrer"
        onClick={onOpen}
        aria-label={`打开 ${brand.name} 官网`}
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-muted hover:text-accent"
      >
        <ExternalLink size={15} />
      </a>
    </article>
  );
}
