import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { url, publishableKey } = getSupabaseConfig();
  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
