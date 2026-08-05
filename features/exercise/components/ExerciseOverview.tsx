"use client";

import { Activity, CalendarDays, Clock3, Flame, History, Trophy } from "lucide-react";
import type { ExerciseStats } from "../types";

function formatDuration(minutes: number): string {
  if (!minutes) return "0 分钟";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + " 小时 " + rest + " 分钟" : minutes + " 分钟";
}

export function ExerciseOverview({ stats }: { stats: ExerciseStats }) {
  const cards = [
    { label: "今日运动次数", value: String(stats.todayCount), icon: <Activity size={17} />, tone: "bg-[#E0F0E2] text-[#4F9060]" },
    { label: "今日累计时长", value: formatDuration(stats.todayDuration), icon: <Clock3 size={17} />, tone: "bg-[#E7F2E8] text-[#4F9060]" },
    { label: "本周运动次数", value: String(stats.weekCount), icon: <CalendarDays size={17} />, tone: "bg-[#E4EDF5] text-[#557B9C]" },
    { label: "本周累计时长", value: formatDuration(stats.weekDuration), icon: <Clock3 size={17} />, tone: "bg-[#E4EDF5] text-[#557B9C]" },
    { label: "本月运动次数", value: String(stats.monthCount), icon: <History size={17} />, tone: "bg-[#F0E7F6] text-[#8A5BA6]" },
    { label: "连续运动天数", value: String(stats.streak) + " 天", icon: <Flame size={17} />, tone: "bg-[#F8E7D4] text-[#C07C3F]" },
    { label: "本月运动天数", value: String(stats.monthActiveDays), icon: <Trophy size={17} />, tone: "bg-[#F1E9DE] text-[#9A774C]" },
  ];
  return <section className="space-y-4">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#4F9060]">今日运动概览</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{stats.todayCount ? "今天已经动起来了" : "今天还没有运动记录"}</h2><p className="mt-2 text-sm text-muted">{stats.todayCount ? "今天的每一次运动都会被保留下来。" : "记录一次轻松的运动，给今天留下一点能量。"}</p></div><div className="hidden rounded-2xl border border-[#D9E8DB] bg-[#F7FBF7] px-4 py-3 text-xs font-bold text-[#4F9060] sm:block">累计 {stats.totalCount} 次运动</div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-[20px] border border-line bg-white px-5 py-5 shadow-card"><div className="flex items-center justify-between gap-3"><span className={"grid size-9 place-items-center rounded-xl " + card.tone}>{card.icon}</span><strong className="text-xl font-extrabold tracking-[-0.04em]">{card.value}</strong></div><p className="mt-4 text-sm font-semibold text-muted">{card.label}</p></div>)}</div>
  </section>;
}

export { formatDuration };
