import type { PlanTask } from "./types";

export const TASKS_STORAGE_KEY = "nova:today-tasks:v1";

export function loadTasks(): PlanTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlanTask[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: PlanTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialTasks(date: string): PlanTask[] {
  return [
    { id: crypto.randomUUID(), title: "完成英语听力练习", date, time: "09:00", priority: "medium", category: "学习", notes: "完成一组精听并记录新表达。", completed: true },
    { id: crypto.randomUUID(), title: "阅读 30 分钟", date, time: "14:30", priority: "low", category: "成长", notes: "保持专注，不看手机。", completed: false },
    { id: crypto.randomUUID(), title: "晚间拉伸 20 分钟", date, time: "21:00", priority: "high", category: "健康", notes: "睡前放松身体。", completed: false },
  ];
}

