import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4o-mini";

type ConversationMessage = { role: "ai" | "user"; text: string };
type SpeakingRequest = {
  scenario?: { titleZh?: string; titleEn?: string; aiRole?: string; userRole?: string };
  settings?: { level?: string; accent?: string };
  history?: ConversationMessage[];
  userText?: string;
};

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ConversationMessage>;
  return (message.role === "ai" || message.role === "user") && typeof message.text === "string";
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return "";
  return response.output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) return [];
    return content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    });
  }).join("\n");
}

function parseReply(text: string): { reply: string; translation: string } | null {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1)) as { reply?: unknown; translation?: unknown };
    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) return null;
    return {
      reply: parsed.reply.trim().slice(0, 1000),
      translation: typeof parsed.translation === "string" ? parsed.translation.trim().slice(0, 1000) : "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录后再使用 AI 口语。" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI 服务尚未配置，请在服务端配置 OPENAI_API_KEY。" }, { status: 503 });
  }

  let body: SpeakingRequest;
  try {
    body = await request.json() as SpeakingRequest;
  } catch {
    return NextResponse.json({ error: "AI 请求格式无效。" }, { status: 400 });
  }

  const scenario = body.scenario;
  const settings = body.settings;
  const history = Array.isArray(body.history) ? body.history.filter(isConversationMessage).slice(-12) : [];
  const userText = typeof body.userText === "string" ? body.userText.trim().slice(0, 1200) : "";
  if (!scenario?.titleEn || !userText) return NextResponse.json({ error: "缺少本轮对话内容。" }, { status: 400 });

  const systemPrompt = [
    "You are NOVA's English speaking coach.",
    `Practice scenario: ${scenario.titleEn} (${scenario.titleZh ?? "English practice"}). AI role: ${scenario.aiRole ?? "conversation partner"}. Learner role: ${scenario.userRole ?? "learner"}.`,
    `Learner level: ${settings?.level ?? "intermediate"}. Preferred accent: ${settings?.accent === "uk" ? "British English" : "American English"}.`,
    "Reply to the learner's latest message and use the recent conversation for continuity.",
    "Mention or ask about concrete details from the learner's message when appropriate. Do not use generic filler such as 'That sounds interesting', 'I see what you mean', or 'Tell me more' unless the actual message makes it genuinely appropriate.",
    "Keep the English reply natural and concise: one to three sentences, with one relevant follow-up question when useful.",
    "Return only a JSON object with two string fields: reply (the English response) and translation (a natural Simplified Chinese translation of that response). Do not add Markdown or other fields.",
  ].join("\n");

  const input = [
    { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
    ...history.map((message) => ({
      role: message.role === "ai" ? "assistant" : "user",
      content: [{ type: "input_text", text: message.text.slice(0, 1200) }],
    })),
  ];

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, input, store: false, max_output_tokens: 220 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return NextResponse.json({ error: "AI 回复服务暂时不可用，请稍后重试。" }, { status: 502 });
    const result = parseReply(extractOutputText(await response.json()));
    if (!result) return NextResponse.json({ error: "AI 回复格式异常，请稍后重试。" }, { status: 502 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI 回复服务暂时不可用，请稍后重试。" }, { status: 502 });
  }
}
