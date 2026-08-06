import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    const errorUrl = new URL("/auth", requestUrl.origin);
    errorUrl.searchParams.set("mode", "login");
    errorUrl.searchParams.set("error", "verification_expired");
    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch {
    const errorUrl = new URL("/auth", requestUrl.origin);
    errorUrl.searchParams.set("mode", "login");
    errorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(errorUrl);
  }
}
