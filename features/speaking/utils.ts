import type { SpeakingFeedback, SpeakingMessage, SpeakingSessionRecord, SpeakingScenario, SpeakingSettings } from "./types";
import { getDateKey } from "./stats";

export function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${dateKey}T12:00:00`));
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function createMessage(role: SpeakingMessage["role"], text: string, translation?: string): SpeakingMessage {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text, translation, createdAt: new Date().toISOString() };
}

export function buildSessionRecord(scenario: SpeakingScenario, settings: SpeakingSettings, messages: SpeakingMessage[], startedAt: string, durationSeconds: number): SpeakingSessionRecord {
  const userMessages = messages.filter((message) => message.role === "user");
  const aiMessages = messages.filter((message) => message.role === "ai");
  const feedback = userMessages.flatMap((message) => message.feedback ? [message.feedback] : []);
  const clearCount = feedback.filter((item) => item.clear).length;
  const summaryLevel: SpeakingSessionRecord["summaryLevel"] = feedback.length === 0 ? "needs-practice" : clearCount === feedback.length && feedback.every((item) => item.grammarIssues.length === 0) ? "natural" : clearCount >= Math.ceil(feedback.length / 2) ? "clear" : "needs-practice";
  return { id: `session-${Date.now()}`, date: getDateKey(new Date(startedAt)), startedAt, endedAt: new Date().toISOString(), scenarioId: scenario.id, scenarioTitle: scenario.titleZh, difficulty: settings.level, turnCount: userMessages.length, userMessages, aiMessages, feedback, savedExpressionIds: [], durationSeconds, summaryLevel, improvement: feedback.some((item) => item.grammarIssues.length > 0) ? "继续练习更自然的句型，并注意反馈中标出的语法。" : "保持现在的表达节奏，尝试加入更多细节和连接词。" };
}

export function isSpeakingFeedback(value: unknown): value is SpeakingFeedback {
  return typeof value === "object" && value !== null && "naturalVersion" in value;
}

