import { Flame, Heart, MessageCircle, Repeat2, Timer, Trophy } from "lucide-react";
import type { SpeakingStats } from "../types";

const cards = [
  { key: "todaySessions", label: "今日练习", icon: Repeat2, tone: "bg-[#F7E5D5] text-[#B26F3C]" },
  { key: "todayTurns", label: "今日对话轮数", icon: MessageCircle, tone: "bg-[#E7E9FF] text-[#5452C7]" },
  { key: "todayMinutes", label: "今日练习时长", icon: Timer, tone: "bg-[#DDEFE4] text-[#43845D]", suffix: "分钟" },
  { key: "todayExpressions", label: "今日收藏表达", icon: Heart, tone: "bg-[#F8EBD8] text-[#AD753C]" },
  { key: "currentStreak", label: "连续练习", icon: Flame, tone: "bg-[#E9E5FA] text-[#7D68B7]", suffix: "天" },
  { key: "totalSessions", label: "累计练习", icon: Trophy, tone: "bg-[#E4EDF5] text-[#557B9C]" },
] as const;

export function SpeakingOverview({ stats }: { stats: SpeakingStats }) {
  return <section className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card) => { const Icon = card.icon; const value = stats[card.key]; const suffix = "suffix" in card ? card.suffix : ""; return <article key={card.key} className="flex min-h-[118px] items-center gap-4 rounded-3xl border border-line bg-white px-5 py-5 shadow-card"><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${card.tone}`}><Icon size={20} strokeWidth={1.8} /></div><div><p className="text-sm font-semibold text-muted">{card.label}</p><p className="mt-1 text-3xl font-extrabold tracking-[-0.05em]">{value}<span className="ml-1 text-sm font-semibold text-muted">{suffix}</span></p></div></article>; })}</section>;
}
