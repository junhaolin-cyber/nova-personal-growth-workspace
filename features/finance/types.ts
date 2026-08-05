export type FinanceCategory =
  | "基础概念"
  | "预算与现金流"
  | "储蓄与目标"
  | "股票与基金"
  | "指数与ETF"
  | "债券与固收"
  | "风险管理"
  | "资产配置"
  | "退休与长期"
  | "金融安全";

export type FinanceDifficulty = "入门" | "基础" | "进阶";
export type FinanceKnowledgeStatus = "未开始" | "学习中" | "已完成" | "已掌握";
export type FinanceStudyLevel = "初级" | "中级" | "高级";
export type FinanceGoal = "日常财务" | "考试" | "职场" | "长期规划";
export type FinanceFavoriteType = "knowledge" | "brief" | "coach";

export interface FinanceQuizQuestion {
  id: string;
  type: "选择题" | "判断题" | "情境题";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface FinanceKnowledge {
  id: string;
  title: string;
  category: FinanceCategory;
  difficulty: FinanceDifficulty;
  estimatedMinutes: number;
  summary: string;
  detail: string;
  example: string;
  commonPitfalls: string[];
  riskReminder: string;
  keywords: string[];
  relatedConcepts: string[];
  quiz: FinanceQuizQuestion[];
}

export interface FinanceBrief {
  id: string;
  title: string;
  category: FinanceCategory;
  tag: string;
  summary: string;
  background: string;
  whyItMatters: string;
  concepts: string[];
  riskReminder: string;
  sourceNote: string;
}

export interface FinanceSettings {
  level: FinanceStudyLevel;
  goal: FinanceGoal;
  dailyMinutes: number;
  showBrief: boolean;
  practiceRequired: boolean;
  riskReminders: boolean;
  preferredCategory: FinanceCategory | "不限";
  detailExpanded: boolean;
}

export interface FinanceProgress {
  knowledgeId: string;
  status: FinanceKnowledgeStatus;
  firstLearnedAt?: string;
  lastStudiedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  completedCount: number;
  isFavorite: boolean;
}

export interface FinanceDailyPlan {
  date: string;
  knowledgeIds: string[];
  reviewKnowledgeIds: string[];
  completedKnowledgeIds: string[];
  completedQuizIds: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface FinanceHistoryRecord {
  date: string;
  learnedCount: number;
  completedCount: number;
  reviewCount: number;
  correctRate: number;
  studyMinutes: number;
  targetCompleted: boolean;
}

export interface FinanceQuizAttempt {
  id: string;
  date: string;
  knowledgeId: string;
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
}

export interface FinanceReflection {
  date: string;
  content: string;
  updatedAt: string;
}

export interface FinanceFavorite {
  id: string;
  type: FinanceFavoriteType;
  title: string;
  createdAt: string;
}

export interface FinanceLearningState {
  version: 1;
  settings: FinanceSettings;
  dailyPlans: Record<string, FinanceDailyPlan>;
  progress: Record<string, FinanceProgress>;
  history: Record<string, FinanceHistoryRecord>;
  favorites: Record<string, FinanceFavorite>;
  reflections: Record<string, FinanceReflection>;
  quizAttempts: FinanceQuizAttempt[];
}

export interface FinanceStats {
  plannedCount: number;
  completedCount: number;
  todayMasteredCount: number;
  reviewCount: number;
  completionRate: number;
  accuracy: number;
  studyMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletedKnowledge: number;
  totalStudyMinutes: number;
  favoriteCount: number;
}

export interface FinanceCoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  keyPoints?: string[];
  riskReminder?: string;
  createdAt: string;
}
