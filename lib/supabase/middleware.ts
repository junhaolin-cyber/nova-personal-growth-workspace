import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;
    const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
    const authMode = request.nextUrl.searchParams.get("mode");

    if (!user && !isAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("mode", "login");
      redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && pathname === "/auth" && authMode !== "reset") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    // The auth page provides the user-facing configuration error. Keep this middleware safe.
  }

  return response;
}
