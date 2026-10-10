import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

const AUTH_CHECK_TIMEOUT_MS = 3000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const error = new Error("Supabase Auth check timed out");
          error.name = "AuthTimeoutError";
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function redirectToAuth(request: NextRequest, reason: "session-timeout" | "session-error") {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("mode", "login");
  redirectUrl.searchParams.set("next", request.nextUrl.pathname);
  redirectUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(redirectUrl);
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  if (isAuthRoute) return response;

  try {
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user }, error: userError } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_CHECK_TIMEOUT_MS,
    );
    if (userError) throw userError;

    if (!user) return redirectToAuth(request, "session-error");
  } catch (error) {
    const reason = error instanceof Error && error.name === "AuthTimeoutError"
      ? "session-timeout"
      : "session-error";
    return redirectToAuth(request, reason);
  }

  return response;
}
