export type RecordType = "income" | "expense";
export type AccountType = "cash" | "bank" | "credit" | "wallet" | "other";

export interface BookkeepingRecord {
  id: string;
  type: RecordType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  time: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookkeepingCategory {
  id: string;
  type: RecordType;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface BookkeepingAccount {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface BookkeepingBudget {
  id: string;
  month: string;
  amount: number;
  categoryId?: string;
  isActive: boolean;
  updatedAt: string;
}

export interface BookkeepingState {
  version: 1;
  records: BookkeepingRecord[];
  categories: BookkeepingCategory[];
  accounts: BookkeepingAccount[];
  budgets: BookkeepingBudget[];
}

export interface BookkeepingRecordInput {
  type: RecordType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  time: string;
  note: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  budget: number;
  budgetRemaining: number;
  todayIncome: number;
  todayExpense: number;
  bookkeepingDays: number;
  expenseByCategory: Array<{ categoryId: string; name: string; icon: string; amount: number; percentage: number }>;
  incomeByCategory: Array<{ categoryId: string; name: string; icon: string; amount: number; percentage: number }>;
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
}

export interface BookkeepingImportPayload {
  version?: number;
  records: unknown;
  categories: unknown;
  accounts: unknown;
  budgets: unknown;
}
