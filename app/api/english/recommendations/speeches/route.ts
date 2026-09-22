import { NextResponse } from "next/server";
import { getOnlineSpeechRecommendations } from "@/features/english/onlineServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await getOnlineSpeechRecommendations();
    return NextResponse.json(items.length ? { source: "online", items } : { source: "fallback", items: [], warning: "YouTube online recommendations unavailable." });
  } catch {
    return NextResponse.json({ source: "fallback", items: [], warning: "YouTube online recommendations unavailable." });
  }
}
