import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, ChevronUp, Lightbulb, Volume2 } from "lucide-react";
import type { FinanceKnowledge, FinanceProgress, FinanceKnowledgeStatus } from "../types";

interface DailyKnowledgeProps {
  knowledge: FinanceKnowledge;
  progress?: FinanceProgress;
  index: number;
  total: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onStatus: (status: FinanceKnowledgeStatus) => void;
  onFavorite: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeak: () => void;
}

const statusOptions: FinanceKnowledgeStatus[] = ["学习中", "已完成", "已掌握"];

export function DailyKnowledge({ knowledge, progress, index, total, expanded, onExpandedChange, onStatus, onFavorite, onPrevious, onNext, onSpeak }: DailyKnowledgeProps) {
  const status = progress?.status ?? "未开始";
  return <section className="rounded-[28px] border border-line bg-white p-6 shadow-card sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-accent"><Lightbulb size={16} />每日知识</p><p className="mt-2 text-sm text-muted">第 {index + 1} / {total} 个 · 约 {knowledge.estimatedMinutes} 分钟</p></div><button type="button" onClick={onFavorite} className={`grid size-10 place-items-center rounded-xl border transition ${progress?.isFavorite ? "border-[#E3B6C8] bg-[#FBEFF3] text-[#AC6681]" : "border-line bg-canvas text-muted hover:text-accent"}`} aria-label={progress?.isFavorite ? "取消收藏" : "收藏知识点"}><Bookmark size={18} fill={progress?.isFavorite ? "currentColor" : "none"} /></button></div>
    <div className="mt-7 rounded-[24px] bg-[#F7F7FB] p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#E9E5FA] px-3 py-1 text-xs font-bold text-[#7567B6]">{knowledge.category}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">{knowledge.difficulty}</span></div><h2 className="mt-5 text-3xl font-extrabold tracking-[-0.05em] text-ink">{knowledge.title}</h2><p className="mt-3 text-base leading-7 text-muted">{knowledge.summary}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onSpeak} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-muted transition hover:border-accent hover:text-accent"><Volume2 size={16} />朗读知识点</button><button type="button" onClick={() => onExpandedChange(!expanded)} className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white transition hover:opacity-90">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{expanded ? "收起详情" : "查看详情"}</button></div></div>
    {expanded && <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-bold text-ink">核心解释</p><p className="mt-2 text-sm leading-7 text-muted">{knowledge.detail}</p><div className="mt-4 rounded-xl bg-[#FFF8EC] p-4 text-sm leading-6 text-[#8A6C49]"><span className="font-bold">生活例子：</span>{knowledge.example}</div></div><div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-bold text-ink">容易忽略</p><ul className="mt-2 space-y-2 text-sm leading-6 text-muted">{knowledge.commonPitfalls.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#C07C3F]" />{item}</li>)}</ul><p className="mt-4 rounded-xl bg-[#F4F0FC] p-4 text-sm leading-6 text-[#685894]"><span className="font-bold">风险提醒：</span>{knowledge.riskReminder}</p></div></div>}
    <div className="mt-7"><p className="mb-3 text-sm font-bold text-ink">学习状态</p><div className="grid gap-2 sm:grid-cols-4">{statusOptions.map((item) => <button key={item} type="button" onClick={() => onStatus(item)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${status === item ? "border-accent bg-[#E9E5FA] text-[#625FA8]" : "border-line bg-white text-muted hover:border-accent/50 hover:text-ink"}`}>{status === item && <Check size={14} className="mr-1 inline" />}{item}</button>)}</div></div>
    <div className="mt-7 flex items-center justify-between border-t border-line pt-5"><button type="button" onClick={onPrevious} disabled={index === 0} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} />上一个</button><button type="button" onClick={onNext} disabled={index >= total - 1} className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">下一个<ArrowRight size={16} /></button></div>
  </section>;
}
