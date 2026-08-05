import type { NewsArticle, NewsCategory } from "./types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

export function truncateText(value: string | undefined, length = 220): string | undefined {
  if (!value) return undefined;
  return value.length <= length ? value : `${value.slice(0, length).trim()}…`;
}

export function normalizeTitle(title: string): string {
  return title
    .toLocaleLowerCase()
    .replace(/[\u3000\s]+/g, " ")
    .replace(/[“”"'‘’。，“”、:：;；!?！？()（）\[\]【】{}<>《》·—–-]/g, "")
    .trim();
}

export function articleId(sourceId: string, url: string, title: string): string {
  const value = `${sourceId}|${url}|${normalizeTitle(title)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `news-${(hash >>> 0).toString(16)}`;
}

export function sourceDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return "未知来源"; }
}

export function formatNewsTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatNewsDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function isSameDay(left: string, right: Date = new Date()): boolean {
  const date = new Date(left);
  return !Number.isNaN(date.getTime()) && date.toDateString() === right.toDateString();
}

export function categoryTone(category: NewsCategory): string {
  const tones: Partial<Record<NewsCategory, string>> = {
    国内: "bg-[#E7E9FF] text-[#5452C7]",
    国际: "bg-[#E5EBF4] text-[#55739B]",
    时政: "bg-[#EDE7F7] text-[#705B9A]",
    财经: "bg-[#F1E9DE] text-[#9A774C]",
    科技: "bg-[#E2EEF6] text-[#4E7795]",
    体育: "bg-[#E0F0E2] text-[#4F9060]",
    健康: "bg-[#E0F2EE] text-[#438C7C]",
    娱乐: "bg-[#F8E7D4] text-[#C07C3F]",
  };
  return tones[category] ?? "bg-[#F0F1F4] text-[#6D7283]";
}

export function sortArticles(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
}
