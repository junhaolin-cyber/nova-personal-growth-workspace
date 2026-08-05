import type { NewsCategory } from "../types";
import { categoryTone } from "../utils";

type Props = { categories: NewsCategory[]; active: NewsCategory; onChange: (category: NewsCategory) => void };

export function NewsCategoryTabs({ categories, active, onChange }: Props) {
  return <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category} onClick={() => onChange(category)} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${active === category ? categoryTone(category) : "bg-white text-muted hover:text-ink"}`}>{category}</button>)}</div>;
}
