import { NextResponse } from "next/server";
import { getOnlineSeriesRecommendations } from "@/features/english/onlineServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await getOnlineSeriesRecommendations();
    return NextResponse.json(items.length ? { source: "online", items } : { source: "fallback", items: [], warning: "TMDB online recommendations unavailable." });
  } catch {
    return NextResponse.json({ source: "fallback", items: [], warning: "TMDB online recommendations unavailable." });
  }
}
