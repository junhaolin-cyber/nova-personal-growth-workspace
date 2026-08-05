import type { BookkeepingAccount, BookkeepingCategory, BookkeepingRecord, MonthlySummary, RecordType } from "./types";

export function getTodayKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function getMonthKey(date = new Date()): string { return getTodayKey(date).slice(0, 7); }
export function formatAmount(value: number): string { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 2 }).format(value); }
export function amountByType(records: BookkeepingRecord[], type: RecordType): number { return records.filter((record) => record.type === type).reduce((sum, record) => sum + record.amount, 0); }

function consecutiveBookkeepingDays(records: BookkeepingRecord[], today: string): number {
  const dates = new Set(records.map((record) => record.date));
  const cursor = new Date(`${today}T12:00:00`);
  let count = 0;
  while (dates.has(getTodayKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

function groupByCategory(records: BookkeepingRecord[], type: RecordType, categories: BookkeepingCategory[]) {
  const categoryMap = new Map<string, { amount: number; name: string; icon: string }>();
  records.filter((record) => record.type === type).forEach((record) => { const category = categories.find((item) => item.id === record.categoryId); const current = categoryMap.get(record.categoryId) ?? { amount: 0, name: category?.name ?? "未分类", icon: category?.icon ?? "•" }; categoryMap.set(record.categoryId, { ...current, amount: current.amount + record.amount }); });
  const total = amountByType(records, type);
  return Array.from(categoryMap.entries()).sort((a, b) => b[1].amount - a[1].amount).map(([categoryId, item]) => ({ categoryId, ...item, percentage: total ? Math.round((item.amount / total) * 100) : 0 }));
}

export function calculateMonthlySummary(records: BookkeepingRecord[], categories: BookkeepingCategory[], budgets: Array<{ month: string; amount: number; isActive: boolean; categoryId?: string }>, month: string, today = getTodayKey()): MonthlySummary {
  const monthRecords = records.filter((record) => record.date.startsWith(month));
  const income = amountByType(monthRecords, "income");
  const expense = amountByType(monthRecords, "expense");
  const budget = budgets.filter((item) => item.month === month && item.isActive && !item.categoryId).reduce((sum, item) => sum + item.amount, 0);
  const dates = new Set(monthRecords.map((record) => record.date));
  const daily = new Map<string, { income: number; expense: number }>();
  monthRecords.forEach((record) => { const current = daily.get(record.date) ?? { income: 0, expense: 0 }; daily.set(record.date, { ...current, [record.type]: current[record.type] + record.amount }); });
  return { month, income, expense, balance: income - expense, budget, budgetRemaining: budget - expense, todayIncome: amountByType(records.filter((record) => record.date === today), "income"), todayExpense: amountByType(records.filter((record) => record.date === today), "expense"), bookkeepingDays: consecutiveBookkeepingDays(records, today), expenseByCategory: groupByCategory(monthRecords, "expense", categories), incomeByCategory: groupByCategory(monthRecords, "income", categories), dailyTrend: Array.from(daily.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).map(([date, item]) => ({ date, ...item })) };
}

export function accountBalance(account: BookkeepingAccount, records: BookkeepingRecord[]): number { return account.openingBalance + records.filter((record) => record.accountId === account.id).reduce((sum, record) => sum + (record.type === "income" ? record.amount : -record.amount), 0); }
