import * as React from "react";
import { Edit3, NotebookPen, Save, Trash2 } from "lucide-react";
import type { FinanceReflection } from "../types";

interface DailyReflectionProps { date: string; reflection?: FinanceReflection; onSave: (content: string) => void; onDelete: () => void; }

export function DailyReflection({ date, reflection, onSave, onDelete }: DailyReflectionProps) {
  const [content, setContent] = React.useState(reflection?.content ?? "");
  React.useEffect(() => setContent(reflection?.content ?? ""), [reflection?.content, date]);
  return <section className="rounded-[28px] border border-line bg-white p-6 shadow-card sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-accent"><NotebookPen size={16} />今日反思</p><h2 className="mt-2 text-xl font-extrabold">把理解变成自己的话</h2></div>{reflection && <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-[#FFF1F1] hover:text-[#A95151]" aria-label="删除今日反思"><Trash2 size={16} /></button>}</div><div className="mt-5 flex items-start gap-3"><Edit3 size={16} className="mt-3 text-muted" /><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="今天学到的一个概念、一个疑问，或者一个想核验的财经信息……" className="min-h-[130px] flex-1 resize-y rounded-2xl border border-line bg-canvas p-4 text-sm leading-6 outline-none transition focus:border-accent" /></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-muted">记录日期：{date}</p><button type="button" onClick={() => onSave(content)} disabled={!content.trim()} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><Save size={15} />保存反思</button></div></section>;
}
