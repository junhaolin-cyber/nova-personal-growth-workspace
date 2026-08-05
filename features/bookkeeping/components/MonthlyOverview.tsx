import { CalendarCheck2, CircleDollarSign, CreditCard, PiggyBank, TrendingDown, TrendingUp, WalletCards, WalletMinimal } from "lucide-react";
import { formatAmount } from "../calculations";
import type { MonthlySummary } from "../types";

export function MonthlyOverview({ summary }: { summary: MonthlySummary }) {
  const cards = [
    ["本月收入", formatAmount(summary.income), "bg-[#E1F0E5] text-[#4F9060]", TrendingUp],
    ["本月支出", formatAmount(summary.expense), "bg-[#F8E7D4] text-[#C07C3F]", TrendingDown],
    ["本月结余", formatAmount(summary.balance), "bg-[#E9E5FA] text-[#7567B6]", WalletMinimal],
    ["本月预算", formatAmount(summary.budget), "bg-[#E5EDF7] text-[#557B9C]", PiggyBank],
    ["预算剩余", formatAmount(summary.budgetRemaining), "bg-[#F1E9DE] text-[#9A774C]", WalletCards],
    ["今日支出", formatAmount(summary.todayExpense), "bg-[#F9E6D6] text-[#BF7A39]", CreditCard],
    ["今日收入", formatAmount(summary.todayIncome), "bg-[#E3EEF0] text-[#3D8290]", CircleDollarSign],
    ["连续记账", `${summary.bookkeepingDays} 天`, "bg-[#EEEAFB] text-[#685894]", CalendarCheck2],
  ] as const;
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone, Icon]) => <article key={label} className="rounded-[24px] border border-line bg-white px-5 py-5 shadow-card"><div className={`grid size-10 place-items-center rounded-2xl ${tone}`}><Icon size={19} strokeWidth={1.8} /></div><p className="mt-5 text-sm font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-ink">{value}</p></article>)}</section>;
}
