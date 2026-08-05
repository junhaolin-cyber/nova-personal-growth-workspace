import { CalendarDays, Flame, History, Trophy } from "lucide-react";
import { addDays } from "../logic/date";
import { calculateLongestStreak } from "../logic/statistics";
import type { DailyLearningRecord } from "../types";

export function LearningHistory({ records, today, currentStreak, totalLearnedCount, totalMasteredCount }: { records: Record<string, DailyLearningRecord>; today: string; currentStreak: number; totalLearnedCount: number; totalMasteredCount: number }) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const longestStreak = calculateLongestStreak(records);
  return (
    <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold text-accent"><History size={15} />学习记录</div><h2 className="mt-2 text-xl font-extrabold">保持自己的学习节奏</h2></div><CalendarDays className="text-muted" size={22} /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-muted">当前连续</p><p className="mt-2 text-2xl font-extrabold">{currentStreak} 天</p></div><div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-muted">最长连续</p><p className="mt-2 text-2xl font-extrabold">{longestStreak} 天</p></div><div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-muted">累计学习</p><p className="mt-2 text-2xl font-extrabold">{totalLearnedCount}</p></div><div className="rounded-2xl bg-canvas p-4"><p className="text-xs text-muted">累计掌握</p><p className="mt-2 flex items-center gap-1 text-2xl font-extrabold"><Trophy size={18} className="text-[#AD753C]" />{totalMasteredCount}</p></div></div>
      <div className="mt-6 space-y-3">{dates.map((date) => { const record = records[date]; const rate = record?.correctRate ?? 0; return <div key={date} className="flex items-center gap-3"><span className="w-24 shrink-0 text-xs font-semibold text-muted">{date === today ? "今天" : new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(`${date}T12:00:00`))}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9EDF3]"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, record?.learnedCount ? Math.max(rate, 18) : 0)}%` }} /></div><span className="w-20 text-right text-xs font-semibold text-muted">{record?.learnedCount ?? 0} 个词</span></div>; })}</div>
      <p className="mt-5 flex items-center gap-2 text-xs text-muted"><Flame size={14} className="text-[#AD753C]" />连续学习从每天完成一点开始。</p>
    </section>
  );
}
