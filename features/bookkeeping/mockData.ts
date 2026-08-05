import type { AccountType, BookkeepingAccount, BookkeepingCategory } from "./types";

const now = "2026-01-01T00:00:00.000Z";

export const defaultCategories: BookkeepingCategory[] = [
  ["income-salary", "income", "工资", "💼"],
  ["income-bonus", "income", "奖金", "🎁"],
  ["income-part-time", "income", "兼职", "🧩"],
  ["income-investment", "income", "投资收益", "📈"],
  ["income-red-packet", "income", "红包", "🧧"],
  ["income-refund", "income", "退款", "↩️"],
  ["income-other", "income", "其它", "✨"],
  ["expense-food", "expense", "餐饮", "🍜"],
  ["expense-transport", "expense", "交通", "🚇"],
  ["expense-shopping", "expense", "购物", "🛍️"],
  ["expense-entertainment", "expense", "娱乐", "🎬"],
  ["expense-medical", "expense", "医疗", "💊"],
  ["expense-housing", "expense", "住房", "🏠"],
  ["expense-study", "expense", "学习", "📚"],
  ["expense-travel", "expense", "旅行", "✈️"],
  ["expense-other", "expense", "其它", "✨"],
].map(([id, type, name, icon], index) => ({ id, type: type as "income" | "expense", name, icon, sortOrder: index, isActive: true, createdAt: now }));

const accountNames: Array<[string, AccountType, string]> = [
  ["account-cash", "cash", "现金"],
  ["account-bank", "bank", "银行卡"],
  ["account-credit", "credit", "信用卡"],
  ["account-wallet", "wallet", "电子钱包"],
  ["account-other", "other", "其它"],
];

export const defaultAccounts: BookkeepingAccount[] = accountNames.map(([id, type, name]) => ({ id, type, name, openingBalance: 0, isActive: true, createdAt: now }));
