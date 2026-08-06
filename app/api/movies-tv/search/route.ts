import { NextResponse } from "next/server";
import { searchMedia } from "@/features/movies-tv/tmdb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (!query || query.length > 80) return NextResponse.json({ items: [], live: false, sourceName: "本地公开精选", warning: "请输入有效的影视名称、演员、导演或类型。" }, { status: 400 });
  return NextResponse.json(await searchMedia(query));
}
