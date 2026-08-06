import { NextResponse } from "next/server";
import { fallbackById } from "@/features/movies-tv/data";
import { getMediaDetail, hasTmdbToken } from "@/features/movies-tv/tmdb";
import type { MediaType } from "@/features/movies-tv/types";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = fallbackById.get(id);
  const url = new URL(request.url);
  const mediaType = url.searchParams.get("type") === "tv" ? "tv" : "movie" as MediaType;
  const externalId = id.match(/^tmdb:(movie|tv):(\d+)$/);
  if (hasTmdbToken() && externalId) {
    const detail = await getMediaDetail(Number(externalId[2]), externalId[1] as MediaType);
    if (detail) return NextResponse.json({ item: detail, live: true, sourceName: "TMDB" });
  }
  if (!item) return NextResponse.json({ item: null, live: false, sourceName: "本地公开精选", warning: "暂未找到该影视详情。" }, { status: 404 });
  return NextResponse.json({ item, live: false, sourceName: item.sourceName, warning: "当前详情来自基础公开片单，实时详情需配置 TMDB API Key。" });
}
