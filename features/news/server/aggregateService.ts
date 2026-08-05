import { clusterNewsEvents } from "../eventClusterService";
import { attachSourceOnlySummary } from "../summaryService";
import { deduplicateArticles } from "../deduplicator";
import type { NewsArticle, NewsEvent } from "../types";

export function aggregateNews(articles: NewsArticle[]): { articles: NewsArticle[]; events: NewsEvent[] } {
  const deduped = deduplicateArticles(articles);
  const events = clusterNewsEvents(deduped);
  const eventByArticle = new Map<string, string>();
  for (const event of events) for (const articleId of event.articleIds) eventByArticle.set(articleId, event.id);
  const linked = deduped.map((article) => ({ ...article, eventId: eventByArticle.get(article.id) }));
  return { articles: attachSourceOnlySummary(linked), events: clusterNewsEvents(linked) };
}
