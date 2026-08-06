import { NextResponse } from "next/server";
import { discoverMedia } from "@/features/movies-tv/tmdb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope") ?? "today";
  const result = await discoverMedia(scope);
  return NextResponse.json(result);
}
