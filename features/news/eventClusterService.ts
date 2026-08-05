import type { NewsArticle, NewsEvent, NewsEventStatus, NewsImportance } from "./types";
import { titleSimilarity } from "./deduplicator";
import { nowIso } from "./utils";

function importance(articleCount: number, sourceCount: number): NewsImportance {
  if (sourceCount >= 4 || articleCount >= 8) return "重大";
  if (sourceCount >= 2 || articleCount >= 3) return "重要";
  return "一般";
}

function status(lastUpdatedAt: string): NewsEventStatus {
  const age = Date.now() - new Date(lastUpdatedAt).getTime();
  if (age < 2 * 60 * 60 * 1000) return "刚刚发生";
  if (age < 24 * 60 * 60 * 1000) return "持续发展";
  if (age < 72 * 60 * 60 * 1000) return "热度下降";
  return "已基本结束";
}

export function clusterNewsEvents(articles: NewsArticle[]): NewsEvent[] {
  const groups: NewsArticle[][] = [];
  for (const article of articles) {
    const group = groups.find((candidate) => candidate.some((item) => titleSimilarity(item.originalTitle, article.originalTitle) >= 0.55));
    if (group) group.push(article); else groups.push([article]);
  }
  return groups.map((group, index) => {
    const ordered = [...group].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const sourceIds = [...new Set(group.map((item) => item.sourceId))];
    return {
      id: `event-${first.id}-${index}`,
      title: first.originalTitle,
      summary: first.description ?? "当前来源未提供事件摘要。",
      category: first.category,
      status: status(latest.publishedAt),
      importance: importance(group.length, sourceIds.length),
      firstPublishedAt: first.publishedAt,
      lastUpdatedAt: latest.publishedAt,
      articleIds: group.map((item) => item.id),
      sourceIds,
      timeline: group.map((item) => ({ id: item.id, occurredAt: item.publishedAt, label: item.originalTitle, sourceNames: [item.sourceName] })),
      confirmedFacts: group.length > 1 ? ["多个公开来源报道了相近主题，具体事实仍应以原文为准。"] : [],
      disputedClaims: [],
      unresolvedQuestions: ["当前基础聚合未自动判断所有说法是否已经得到独立确认。"],
    };
  }).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
}

const importanceScore: Record<NewsImportance, number> = {
  一般: 0,
  重要: 1,
  重大: 2,
};

const statusScore: Record<NewsEventStatus, number> = {
  刚刚发生: 3,
  出现新进展: 3,
  持续发展: 2,
  热度下降: 1,
  已基本结束: 0,
};

export function rankNewsEvents(events: NewsEvent[]): NewsEvent[] {
  return [...events].sort((a, b) => {
    const score = (event: NewsEvent) =>
      event.sourceIds.length * 100 +
      event.articleIds.length * 10 +
      importanceScore[event.importance] * 3 +
      statusScore[event.status];
    const scoreDifference = score(b) - score(a);
    if (scoreDifference !== 0) return scoreDifference;
    return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
  });
}

export function trackedEventFromEvent(event: NewsEvent) {
  return {
    eventId: event.id,
    title: event.title,
    trackedAt: nowIso(),
    lastUpdatedAt: event.lastUpdatedAt,
    latestProgress: event.summary,
    articleCount: event.articleIds.length,
    sourceCount: event.sourceIds.length,
    hasMajorUpdate: event.importance === "重大" || event.status === "出现新进展",
  };
}
