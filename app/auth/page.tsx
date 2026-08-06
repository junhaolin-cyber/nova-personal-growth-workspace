import { AuthPage } from "@/features/auth/components/AuthPage";
import type { AuthMode } from "@/features/auth/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeMode(value: string): AuthMode {
  return value === "register" || value === "forgot" || value === "reset" ? value : "login";
}

export default async function AuthRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <AuthPage initialMode={normalizeMode(valueOf(params.mode))} nextPath={valueOf(params.next) || "/"} initialError={valueOf(params.error)} />;
}
