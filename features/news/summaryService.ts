import type { NewsArticle, NewsSummary } from "./types";
import { nowIso, truncateText } from "./utils";

export function createSourceOnlySummary(articles: NewsArticle[]): NewsSummary {
  const first = articles[0];
  const sourceNames = [...new Set(articles.map((article) => article.sourceName))];
  return {
    generatedAt: nowIso(),
    generatedBy: "source-only",
    whatHappened: first?.description ?? "当前来源只提供标题，暂无可用于摘要的公开描述。",
    whyItMatters: "当前阶段未启用 AI 判断，仅保留来源提供的信息，不对影响范围作未经证实的推断。",
    confirmedFacts: articles.length > 1 ? ["多个公开来源出现相近报道。", "标题、来源、发布时间和原文链接均保留。"] : ["当前只有一个公开来源，无法进行跨来源确认。"],
    currentProgress: first ? `最近一条报道发布时间为 ${new Date(first.publishedAt).toLocaleString("zh-CN")}。` : "暂无进展信息。",
    unresolvedQuestions: ["完整事实、责任归属和后续影响仍需打开原文并结合更多可靠来源核实。"],
    perspectives: sourceNames.length > 1 ? sourceNames.map((name) => `${name}：仅展示该来源提供的标题与摘要，不推断其立场。`) : ["当前来源数量不足，暂不整理不同视角。"],
    limitation: "当前未配置 AI 摘要服务，以上内容为来源摘要的安全整理，不代表 AI 生成结论。",
  };
}

export function attachSourceOnlySummary(articles: NewsArticle[]): NewsArticle[] {
  const byEvent = new Map<string, NewsArticle[]>();
  for (const article of articles) {
    const key = article.eventId ?? article.id;
    byEvent.set(key, [...(byEvent.get(key) ?? []), article]);
  }
  return articles.map((article) => ({ ...article, aiSummary: createSourceOnlySummary(byEvent.get(article.eventId ?? article.id) ?? [article]) }));
}

export function safeSummaryText(article: NewsArticle): string {
  return truncateText(article.aiSummary?.whatHappened ?? article.description, 180) ?? "当前来源未提供摘要。";
}
