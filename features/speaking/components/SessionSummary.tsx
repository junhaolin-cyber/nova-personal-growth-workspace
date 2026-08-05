import { Award, CalendarDays, CheckCircle2, Clock3, MessageCircle, Sparkles } from "lucide-react";
import type { SpeakingSessionRecord } from "../types";
import { formatDateLabel, formatDuration } from "../utils";

const summaryLabels: Record<SpeakingSessionRecord["summaryLevel"], string> = { "needs-practice": "需要更多练习", clear: "基础表达清楚", natural: "表达比较自然", fluent: "表达流畅" };

export function SessionSummary({ session, onBack }: { session: SpeakingSessionRecord; onBack: () => void }) {
  return <section className="rounded-[28px] border border-line bg-white p-6 shadow-card sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="flex items-center gap-2 text-sm font-semibold text-accent"><Sparkles size={16} />本次练习总结</p><h2 className="mt-2 text-2xl font-extrabold">{session.scenarioTitle}</h2><p className="mt-2 text-sm text-muted">{formatDateLabel(session.date)}</p></div><div className="rounded-2xl bg-[#F0F0FF] px-4 py-3 text-center"><p className="text-[11px] font-semibold text-accent">表达状态</p><p className="mt-1 font-bold text-ink">{summaryLabels[session.summaryLevel]}</p></div></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><SummaryStat icon={Clock3} label="练习时长" value={formatDuration(session.durationSeconds)} /><SummaryStat icon={MessageCircle} label="对话轮数" value={`${session.turnCount} 轮`} /><SummaryStat icon={CheckCircle2} label="回答次数" value={`${session.userMessages.length} 次`} /></div><div className="mt-7 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl bg-canvas p-5"><p className="flex items-center gap-2 text-sm font-bold"><Award size={16} className="text-accent" />本次建议</p><p className="mt-3 text-sm leading-6 text-muted">{session.improvement}</p></div><div className="rounded-2xl bg-canvas p-5"><p className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={16} className="text-accent" />继续练习</p><p className="mt-3 text-sm leading-6 text-muted">下次可以继续使用相同场景，尝试加入更多细节，或者挑战一个更高难度的情景。</p></div></div><button type="button" onClick={onBack} className="mt-7 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">返回场景选择</button></section>;
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="rounded-2xl border border-line bg-white px-4 py-4"><Icon size={17} className="text-accent" /><p className="mt-3 text-xs font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>;
}

