"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle2, Clock3, Edit3, History, ListTodo, Plus, Trash2, X } from "lucide-react";
import { createInitialTasks, getTodayDate, loadTasks, saveTasks } from "./storage";
import type { PlanTask, TaskDraft, TaskPriority } from "./types";

type Locale = "zh" | "en";
type ViewMode = "today" | "history";

const emptyDraft = (date: string): TaskDraft => ({ title: "", date, time: "09:00", priority: "medium", category: "其他", notes: "" });

const priorityLabels: Record<TaskPriority, { zh: string; en: string; className: string }> = {
  low: { zh: "低", en: "Low", className: "bg-[#EDF2F7] text-[#617083]" },
  medium: { zh: "中", en: "Medium", className: "bg-[#F8EBD8] text-[#AD753C]" },
  high: { zh: "高", en: "High", className: "bg-[#F8E1E4] text-[#B75D6A]" },
};

const categoryOptions = ["学习", "工作", "健康", "生活", "成长", "其他"];

export function TodayPlan({ locale = "zh" }: { locale?: Locale }) {
  const isZh = locale === "zh";
  const today = getTodayDate();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [view, setView] = useState<ViewMode>("today");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);

  useEffect(() => {
    const stored = loadTasks();
    setTasks(stored.length > 0 ? stored : createInitialTasks(today));
    setIsHydrated(true);
  }, [today]);

  useEffect(() => {
    if (isHydrated) saveTasks(tasks);
  }, [isHydrated, tasks]);

  const todayTasks = useMemo(() => tasks.filter((task) => task.date === today), [tasks, today]);
  const visibleTasks = useMemo(() => {
    const source = view === "today" ? todayTasks : tasks.filter((task) => task.date < today);
    return [...source].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [tasks, today, todayTasks, view]);
  const completedCount = todayTasks.filter((task) => task.completed).length;
  const pendingCount = todayTasks.length - completedCount;
  const completionRate = todayTasks.length ? Math.round((completedCount / todayTasks.length) * 100) : 0;

  const openCreate = () => { setEditingTask(null); setIsFormOpen(true); };
  const openEdit = (task: PlanTask) => { setEditingTask(task); setIsFormOpen(true); };
  const closeForm = () => { setEditingTask(null); setIsFormOpen(false); };

  const toggleTask = (id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined } : task));
  const deleteTask = (id: string) => setTasks((current) => current.filter((task) => task.id !== id));
  const saveTask = (draft: TaskDraft) => {
    if (editingTask) {
      setTasks((current) => current.map((task) => task.id === editingTask.id ? { ...task, ...draft } : task));
    } else {
      setTasks((current) => [...current, { ...draft, id: crypto.randomUUID(), completed: false }]);
    }
    closeForm();
  };

  return <div className="mx-auto max-w-[1180px]">
    <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="mb-3 flex items-center gap-2 text-xs font-semibold text-accent"><ListTodo size={15} /> {isZh ? "把今天变得清晰而可执行" : "Make today clear and actionable"}</p><h1 className="text-[36px] font-extrabold sm:text-[44px]">{isZh ? "今日计划" : "Today's plan"}</h1><p className="mt-3 text-sm text-muted">{formatLongDate(today, isZh ? "zh-CN" : "en-US")}</p></div>
      <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5"><Plus size={17} />{isZh ? "新增任务" : "Add task"}</button>
    </section>

    <section className="mb-8 grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={<ListTodo size={18} />} label={isZh ? "今日任务" : "Today's tasks"} value={todayTasks.length} tone="bg-[#E7E9FF] text-[#5E5CE6]" />
      <StatCard icon={<CheckCircle2 size={18} />} label={isZh ? "今日完成率" : "Completion rate"} value={`${completionRate}%`} tone="bg-[#DDEFE4] text-[#43845D]" />
      <StatCard icon={<Check size={18} />} label={isZh ? "已完成" : "Completed"} value={completedCount} tone="bg-[#E4EDF5] text-[#557B9C]" />
      <StatCard icon={<Clock3 size={18} />} label={isZh ? "待完成" : "Pending"} value={pendingCount} tone="bg-[#F8E7D4] text-[#C07C3F]" />
    </section>

    <section className="rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-7">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">{view === "today" ? (isZh ? "今日任务" : "Today's tasks") : (isZh ? "历史任务" : "Task history")}</h2><p className="mt-1 text-xs text-muted">{view === "today" ? (isZh ? "专注于今天最重要的几件事" : "Focus on what matters today") : (isZh ? "回顾过去完成和未完成的计划" : "Review past plans")}</p></div><div className="flex rounded-xl bg-canvas p-1"><TabButton active={view === "today"} onClick={() => setView("today")} label={isZh ? "今日任务" : "Today"} /><TabButton active={view === "history"} onClick={() => setView("history")} label={isZh ? "历史任务" : "History"} /></div></div>
      {visibleTasks.length > 0 ? <div className="space-y-2">{visibleTasks.map((task) => <TaskRow key={task.id} task={task} locale={locale} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} />)}</div> : <EmptyState view={view} locale={locale} onCreate={openCreate} />}
    </section>

    {isFormOpen && <TaskForm task={editingTask} locale={locale} today={today} onClose={closeForm} onSave={saveTask} />}
  </div>;
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
    return <article className="flex min-h-[124px] items-center justify-center gap-4 rounded-[20px] border border-line bg-white px-6 py-7 shadow-card"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</div><div className="text-left"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{value}</p></div></article>;
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{label}</button>;
}

function TaskRow({ task, locale, onToggle, onEdit, onDelete }: { task: PlanTask; locale: Locale; onToggle: (id: string) => void; onEdit: (task: PlanTask) => void; onDelete: (id: string) => void }) {
  const isZh = locale === "zh";
  const priority = priorityLabels[task.priority];
  return <div className={`group flex items-start gap-3 rounded-2xl border p-4 transition hover:border-[#C9C8FA] ${task.completed ? "border-transparent bg-[#FAFAFC]" : "border-line bg-white"}`}><button onClick={() => onToggle(task.id)} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition ${task.completed ? "border-accent bg-accent text-white" : "border-[#C9CED6] text-transparent hover:border-accent"}`} aria-label={task.completed ? (isZh ? "标记为未完成" : "Mark as pending") : (isZh ? "标记为完成" : "Mark complete")}><Check size={14} strokeWidth={3} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${task.completed ? "text-muted line-through" : "text-ink"}`}>{task.title}</h3><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${priority.className}`}>{isZh ? priority.zh : priority.en}</span><span className="rounded-md bg-canvas px-2 py-1 text-[10px] font-medium text-muted">{task.category}</span></div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatShortDate(task.date, locale)}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} /> {task.time}</span></div>{task.notes && <p className="mt-3 text-xs leading-5 text-muted">{task.notes}</p>}</div><div className="flex shrink-0 gap-1"><button onClick={() => onEdit(task)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label={isZh ? "编辑任务" : "Edit task"}><Edit3 size={15} /></button><button onClick={() => onDelete(task.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-[#FFF0F1] hover:text-[#B75D6A]" aria-label={isZh ? "删除任务" : "Delete task"}><Trash2 size={15} /></button></div></div>;
}

function EmptyState({ view, locale, onCreate }: { view: ViewMode; locale: Locale; onCreate: () => void }) {
  const isZh = locale === "zh";
  return <div className="rounded-2xl border border-dashed border-[#D4D8DF] bg-canvas/40 px-6 py-14 text-center"><History className="mx-auto mb-4 text-[#B5BBC5]" size={28} /><p className="font-semibold">{view === "today" ? (isZh ? "今天还没有任务" : "No tasks for today") : (isZh ? "还没有历史任务" : "No task history")}</p><p className="mt-2 text-sm text-muted">{view === "today" ? (isZh ? "添加一项任务，给今天一个清晰的开始。" : "Add a task to give today a clear start.") : (isZh ? "完成或归档过去的任务后，会显示在这里。" : "Past tasks will appear here as you plan ahead.")}</p>{view === "today" && <button onClick={onCreate} className="mt-5 text-sm font-semibold text-accent">{isZh ? "新增第一项任务" : "Add your first task"}</button>}</div>;
}

function TaskForm({ task, locale, today, onClose, onSave }: { task: PlanTask | null; locale: Locale; today: string; onClose: () => void; onSave: (draft: TaskDraft) => void }) {
  const isZh = locale === "zh";
  const [draft, setDraft] = useState<TaskDraft>(() => task ? { title: task.title, date: task.date, time: task.time, priority: task.priority, category: task.category, notes: task.notes } : emptyDraft(today));
  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() }); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[24px] border border-line bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-bold">{task ? (isZh ? "编辑任务" : "Edit task") : (isZh ? "新增任务" : "Add task")}</h2><p className="mt-1 text-sm text-muted">{isZh ? "把任务信息补充完整，之后更容易执行。" : "Add a little context to make the task actionable."}</p></div><button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label={isZh ? "关闭" : "Close"}><X size={18} /></button></div><form onSubmit={submit} className="space-y-5"><Field label={isZh ? "任务标题" : "Title"} required><input autoFocus value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder={isZh ? "例如：完成英语听力练习" : "e.g. Complete listening practice"} className="form-input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={isZh ? "日期" : "Date"}><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} className="form-input" /></Field><Field label={isZh ? "时间" : "Time"}><input type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} className="form-input" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label={isZh ? "优先级" : "Priority"}><select value={draft.priority} onChange={(event) => update("priority", event.target.value as TaskPriority)} className="form-input"><option value="low">{isZh ? "低" : "Low"}</option><option value="medium">{isZh ? "中" : "Medium"}</option><option value="high">{isZh ? "高" : "High"}</option></select></Field><Field label={isZh ? "分类" : "Category"}><select value={draft.category} onChange={(event) => update("category", event.target.value)} className="form-input">{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field></div><Field label={isZh ? "备注" : "Notes"}><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder={isZh ? "补充一些上下文或执行提醒" : "Add context or a reminder"} className="form-input resize-none" /></Field><div className="flex justify-end gap-3 border-t border-line pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-canvas">{isZh ? "取消" : "Cancel"}</button><button type="submit" className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white">{task ? (isZh ? "保存修改" : "Save changes") : (isZh ? "创建任务" : "Create task")}</button></div></form></div></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-muted">{label}{required && <span className="ml-1 text-[#B75D6A]">*</span>}</span>{children}</label>;
}

function formatLongDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

function formatShortDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}
