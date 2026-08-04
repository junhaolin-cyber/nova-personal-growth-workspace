export type TaskPriority = "low" | "medium" | "high";

export type PlanTask = {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: TaskPriority;
  category: string;
  notes: string;
  completed: boolean;
  completedAt?: string;
};

export type TaskDraft = Omit<PlanTask, "id" | "completed" | "completedAt">;

