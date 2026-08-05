import type { NewsArticle } from "./types";
import { normalizeTitle, sortArticles } from "./utils";

export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const result: NewsArticle[] = [];
  for (const article of sortArticles(articles)) {
    const key = article.articleUrl || `${article.sourceName}|${normalizeTitle(article.originalTitle)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

export function titleSimilarity(left: string, right: string): number {
  const a = new Set(normalizeTitle(left).split(/[^\p{L}\p{N}]+/u).filter((item) => item.length > 1));
  const b = new Set(normalizeTitle(right).split(/[^\p{L}\p{N}]+/u).filter((item) => item.length > 1));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}
