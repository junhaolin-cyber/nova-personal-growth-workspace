export type SpeakingDifficulty = "beginner" | "intermediate" | "advanced";
export type SpeakingCategory = "daily" | "travel" | "work" | "interview";
export type SpeakingAccent = "us" | "uk";
export type SpeakingRole = "ai" | "user" | "system";

export type SpeakingScenario = {
  id: string;
  titleZh: string;
  titleEn: string;
  description: string;
  category: SpeakingCategory;
  difficulty: SpeakingDifficulty;
  durationMinutes: number;
  aiRole: string;
  userRole: string;
  opening: string;
  openingTranslation: string;
  vocabulary: string[];
  sentencePatterns: string[];
};

export type SpeakingFeedback = {
  clear: boolean;
  grammarIssues: string[];
  naturalVersion: string;
  explanation: string;
  usefulExpressions: string[];
};

export type SpeakingMessage = {
  id: string;
  role: SpeakingRole;
  text: string;
  translation?: string;
  feedback?: SpeakingFeedback;
  createdAt: string;
};

export type SpeakingSettings = {
  level: SpeakingDifficulty;
  accent: SpeakingAccent;
  responseSpeed: "slow" | "normal";
  showTranslation: boolean;
  autoRead: boolean;
  dailyGoalMinutes: 5 | 10 | 15 | 20;
  showFeedback: boolean;
};

export type SavedExpression = {
  id: string;
  expression: string;
  explanation: string;
  scenarioId: string;
  scenarioTitle: string;
  sourceDate: string;
  originalText: string;
  savedAt: string;
};

export type SpeakingSessionRecord = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  scenarioId: string;
  scenarioTitle: string;
  difficulty: SpeakingDifficulty;
  turnCount: number;
  userMessages: SpeakingMessage[];
  aiMessages: SpeakingMessage[];
  feedback: SpeakingFeedback[];
  savedExpressionIds: string[];
  durationSeconds: number;
  summaryLevel: "needs-practice" | "clear" | "natural" | "fluent";
  improvement: string;
};

export type SpeakingDraft = {
  scenarioId: string;
  startedAt: string;
  messages: SpeakingMessage[];
  hintLevel: number;
};

export type SpeakingStorageState = {
  settings: SpeakingSettings;
  sessions: SpeakingSessionRecord[];
  expressions: SavedExpression[];
  draft: SpeakingDraft | null;
};

export type SpeakingStats = {
  todaySessions: number;
  todayTurns: number;
  todayMinutes: number;
  todayExpressions: number;
  currentStreak: number;
  totalSessions: number;
};

