import type { SpeakingFeedback, SpeakingMessage, SpeakingScenario, SpeakingSettings } from "./types";

export type SpeakingTurnRequest = {
  scenario: SpeakingScenario;
  settings: SpeakingSettings;
  history: SpeakingMessage[];
  userText: string;
};

export type SpeakingTurnResponse = {
  reply: string;
  translation: string;
  feedback: SpeakingFeedback;
};

function createFeedback(userText: string, scenario: SpeakingScenario): SpeakingFeedback {
  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();
  const grammarIssues: string[] = [];
  let naturalVersion = trimmed;
  let explanation = "表达清楚，可以继续补充一个细节，让对话更自然。";

  if (/^i want order\b/i.test(trimmed)) {
    grammarIssues.push("want 后面需要使用 to + 动词。");
    naturalVersion = trimmed.replace(/^i want order/i, "I'd like to order");
    explanation = "在点餐场景中，I'd like to... 比 I want... 更自然、更礼貌。";
  } else if (/^i am agree\b/i.test(trimmed)) {
    grammarIssues.push("agree 是动词，前面不需要 am。");
    naturalVersion = trimmed.replace(/^i am agree/i, "I agree");
    explanation = "直接使用 I agree 表达同意即可。";
  } else if (lower.length < 12) {
    explanation = `这句话可以理解。试着在“${scenario.titleZh}”场景中再补充一个原因或细节。`;
  } else if (/[.!?]$/.test(trimmed)) {
    explanation = "表达完整而且清楚，可以继续保持这种自然的交流节奏。";
  }

  return { clear: trimmed.length >= 8, grammarIssues, naturalVersion, explanation, usefulExpressions: scenario.sentencePatterns.slice(0, 2) };
}

export function getSpeakingHint(scenario: SpeakingScenario, level: number) {
  const index = Math.max(1, Math.min(3, level)) - 1;
  return [
    `关键词：${scenario.vocabulary.join(" / ")}`,
    `句型：${scenario.sentencePatterns[index % scenario.sentencePatterns.length]}`,
    `完整示例：${scenario.opening.includes("?") ? scenario.sentencePatterns[0] : "I would be happy to share more about it."}`,
  ][index];
}

export async function simulateSpeakingTurn({ scenario, settings, history, userText }: SpeakingTurnRequest): Promise<SpeakingTurnResponse> {
  const response = await fetch("/api/speaking/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenario: {
        titleZh: scenario.titleZh,
        titleEn: scenario.titleEn,
        aiRole: scenario.aiRole,
        userRole: scenario.userRole,
      },
      settings: { level: settings.level, accent: settings.accent },
      history: history.slice(-12).map((message) => ({ role: message.role, text: message.text })),
      userText,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => null) as { reply?: unknown; translation?: unknown; error?: unknown } | null;
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "AI 回复服务暂时不可用，请稍后重试。";
    throw new Error(message);
  }
  if (typeof data?.reply !== "string" || !data.reply.trim()) throw new Error("AI 回复为空，请稍后重试。");
  return {
    reply: data.reply.trim(),
    translation: typeof data.translation === "string" ? data.translation.trim() : "",
    feedback: createFeedback(userText, scenario),
  };
}
