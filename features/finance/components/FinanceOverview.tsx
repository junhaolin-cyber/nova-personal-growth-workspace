import { BarChart3, BookOpen, Clock3, Flame, Heart, Target, Trophy, RotateCcw } from "lucide-react";
import type { FinanceStats } from "../types";

export function FinanceOverview({ stats }: { stats: FinanceStats }) {
  const cards = [
    { label: "今日计划", value: `${stats.plannedCount} 个知识点`, icon: Target, tone: "bg-[#E9E5FA] text-[#7D68B7]" },
    { label: "今日已学习", value: `${stats.completedCount} 个`, icon: BookOpen, tone: "bg-[#E5EDF7] text-[#557B9C]" },
    { label: "今日已掌握", value: `${stats.todayMasteredCount} 个`, icon: Trophy, tone: "bg-[#E1F0E5] text-[#4F9060]" },
    { label: "今日待复习", value: `${stats.reviewCount} 个`, icon: RotateCcw, tone: "bg-[#F8E8D4] text-[#BF7A39]" },
    { label: "今日完成率", value: `${stats.completionRate}%`, icon: BarChart3, tone: "bg-[#EEEAFB] text-[#7567B6]" },
    { label: "连续学习", value: `${stats.currentStreak} 天`, icon: Flame, tone: "bg-[#F9E6D6] text-[#C07C3F]" },
    { label: "累计学习时长", value: `${stats.totalStudyMinutes} 分钟`, icon: Clock3, tone: "bg-[#E3EEF0] text-[#3D8290]" },
    { label: "累计掌握知识", value: `${stats.totalCompletedKnowledge} 个`, icon: Trophy, tone: "bg-[#E8F0E5] text-[#628852]" },
    { label: "收藏知识点", value: `${stats.favoriteCount} 个`, icon: Heart, tone: "bg-[#F6E6ED] text-[#AC6681]" },
  ];
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-[24px] border border-line bg-white px-5 py-5 shadow-card"><div className={`grid size-10 place-items-center rounded-2xl ${tone}`}><Icon size={19} strokeWidth={1.8} /></div><p className="mt-5 text-sm font-semibold text-muted">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">{value}</p></article>)}</section>;
}
