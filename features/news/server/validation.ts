import { isSafeHttpUrl } from "../validation";

export function safeRssUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string" && isSafeHttpUrl(value)).slice(0, 5);
}
