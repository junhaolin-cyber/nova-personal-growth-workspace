import { CalendarClock, RotateCcw } from "lucide-react";
import { formatDateLabel } from "../logic/date";
import { wordStatusLabels, wordStatusTones } from "../logic/spacedRepetition";
import type { EnglishWord, WordProgress } from "../types";

export function ReviewSection({ words, progress }: { words: EnglishWord[]; progress: Record<string, WordProgress> }) {
  return (
    <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold text-accent"><RotateCcw size={15} />今日复习</div><h2 className="mt-2 text-xl font-extrabold">把容易忘的再看一遍</h2></div><span className="rounded-xl bg-[#F1F0FF] px-3 py-2 text-xs font-bold text-accent">{words.length} 个待复习</span></div>
      {words.length > 0 ? <div className="mt-6 space-y-3">{words.slice(0, 5).map((word) => { const item = progress[word.id]; return <div key={word.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-4"><div className="min-w-0"><p className="font-sans text-base font-bold">{word.word}</p><p className="mt-1 truncate text-xs text-muted">{word.meaningZh} · {item?.nextReviewAt ? formatDateLabel(item.nextReviewAt, "zh-CN") : "今天"}</p></div><span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${item ? wordStatusTones[item.status] : "bg-canvas text-muted"}`}>{item ? wordStatusLabels[item.status] : "待复习"}</span></div>; })}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#D4D8DF] bg-canvas/40 px-5 py-10 text-center"><CalendarClock className="mx-auto mb-3 text-muted" size={26} /><p className="font-semibold">今天没有到期复习</p><p className="mt-2 text-xs text-muted">完成今天的单词学习后，复习计划会自动安排。</p></div>}
    </section>
  );
}

