"use client";

import * as React from "react";
import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { calculateMonthlySummary, getMonthKey, getTodayKey } from "./calculations";
import { AccountManager } from "./components/AccountManager";
import { BudgetManager } from "./components/BudgetManager";
import { CategoryManager } from "./components/CategoryManager";
import { History } from "./components/History";
import { ImportExport } from "./components/ImportExport";
import { MonthlyOverview } from "./components/MonthlyOverview";
import { QuickRecord } from "./components/QuickRecord";
import { RecordList } from "./components/RecordList";
import { RecentRecords } from "./components/RecentRecords";
import { Statistics } from "./components/Statistics";
import { createDefaultBookkeepingState, loadBookkeepingState, saveBookkeepingState } from "./storage";
import type { BookkeepingRecord, BookkeepingRecordInput, BookkeepingState } from "./types";

export function Bookkeeping() {
  const [today] = React.useState(() => getTodayKey());
  const [month, setMonth] = React.useState(() => getMonthKey());
  const [state, setState] = React.useState<BookkeepingState>(() => createDefaultBookkeepingState());
  const [editingRecord, setEditingRecord] = React.useState<BookkeepingRecord | undefined>();
  const [notice, setNotice] = React.useState("");
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => { setState(loadBookkeepingState()); setIsHydrated(true); }, []);
  React.useEffect(() => { if (isHydrated) saveBookkeepingState(state); }, [isHydrated, state]);
  React.useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);

  if (!isHydrated) return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-muted shadow-card">正在准备你的个人财务数据…</div>;

  const summary = calculateMonthlySummary(state.records, state.categories, state.budgets, month, today);
  const sortedRecords = [...state.records].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const monthRecords = sortedRecords.filter((record) => record.date.startsWith(month));
  const saveRecord = (input: BookkeepingRecordInput) => { const timestamp = new Date().toISOString(); if (editingRecord) { setState((current) => ({ ...current, records: current.records.map((record) => record.id === editingRecord.id ? { ...record, ...input, updatedAt: timestamp } : record) })); setEditingRecord(undefined); setNotice("账单已更新"); return; } const record: BookkeepingRecord = { ...input, id: `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: timestamp, updatedAt: timestamp }; setState((current) => ({ ...current, records: [record, ...current.records] })); setNotice("账单已保存"); };
  const deleteRecord = (id: string) => { if (!window.confirm("确定删除这笔账单吗？删除后不会影响其他模块。")) return; setState((current) => ({ ...current, records: current.records.filter((record) => record.id !== id) })); setNotice("账单已删除"); if (editingRecord?.id === id) setEditingRecord(undefined); };
  const showNotice = (message: string) => setNotice(message);

  return <div className="mx-auto max-w-[1240px] space-y-8">
    {notice && <div role="status" className="rounded-2xl border border-[#D9D1F1] bg-[#F5F3FA] px-4 py-3 text-sm font-semibold text-[#685894]">{notice}</div>}
    <section className="flex flex-wrap items-end justify-between gap-6"><div><p className="flex items-center gap-2 text-sm font-bold text-[#3D8290]"><BookOpen size={16} />个人财务 · 记账本</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">看见每一笔钱的去处</h1><p className="mt-3 text-sm text-muted">记录不需要复杂，先从今天的一笔收支开始。</p></div><label className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-muted shadow-sm"><CalendarDays size={16} /><span>查看月份</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent outline-none" /></label></section>
    <div className="rounded-2xl border border-[#CFE3E6] bg-[#F0F8F9] px-4 py-3 text-sm leading-6 text-[#3D8290]">这是个人记账工具，所有金额只保存在当前设备的浏览器中。统计均来自你已经记录的账单，不会影响其他学习模块。</div>
    <MonthlyOverview summary={summary} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><QuickRecord record={editingRecord} categories={state.categories} accounts={state.accounts} onSave={saveRecord} onCancel={editingRecord ? () => setEditingRecord(undefined) : undefined} /><RecentRecords records={sortedRecords} categories={state.categories} accounts={state.accounts} onEdit={setEditingRecord} onDelete={deleteRecord} /></div>
    <Statistics summary={summary} />
    <BudgetManager month={month} budgets={state.budgets} categories={state.categories} summary={summary} onChange={(budgets) => setState((current) => ({ ...current, budgets }))} />
    <History records={monthRecords} categories={state.categories} accounts={state.accounts} onEdit={setEditingRecord} onDelete={deleteRecord} />
    <CategoryManager categories={state.categories} records={state.records} onChange={(categories) => setState((current) => ({ ...current, categories }))} onNotice={showNotice} />
    <AccountManager accounts={state.accounts} records={state.records} onChange={(accounts) => setState((current) => ({ ...current, accounts }))} onNotice={showNotice} />
    <ImportExport state={state} categories={state.categories} accounts={state.accounts} onImport={(nextState) => setState(nextState)} onNotice={showNotice} />
    <p className="flex items-center justify-center gap-2 pb-4 text-xs text-muted"><Sparkles size={14} className="text-[#3D8290]" />记账数据只存储在当前设备，后续可独立接入备份和同步能力。</p>
  </div>;
}
