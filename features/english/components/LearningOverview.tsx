import { BookOpenCheck, Flame, Layers3, RotateCcw, Target, Trophy, Zap } from "lucide-react";
import type { LearningStats } from "../logic/statistics";

const statStyles = ["bg-[#E8E7F7]", "bg-[#DDEFE4]", "bg-[#F8EBD8]", "bg-[#E4EDF5]", "bg-[#F0E7F6]", "bg-[#F7E5D5]", "bg-[#E9E5FA]"];

export function LearningOverview({ stats }: { stats: LearningStats }) {
  const items = [
    { label: "今日计划", value: stats.planCount, icon: Target },
    { label: "今日已学习", value: stats.learnedCount, icon: BookOpenCheck },
    { label: "今日已掌握", value: stats.masteredTodayCount, icon: Trophy },
    { label: "今日待复习", value: stats.dueCount, icon: RotateCcw },
    { label: "今日完成率", value: `${stats.completionRate}%`, icon: Zap },
    { label: "连续学习", value: `${stats.currentStreak} 天`, icon: Flame },
    { label: "累计掌握", value: stats.totalMasteredCount, icon: Layers3 },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="flex min-h-[126px] items-center gap-4 rounded-[20px] border border-line bg-white px-5 py-5 shadow-card">
            <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${statStyles[index]}`}><Icon size={20} className="text-ink/70" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">{item.label}</p>
              <p className="mt-2 truncate text-3xl font-extrabold tracking-[-0.04em] text-ink">{item.value}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

