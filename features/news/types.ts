export type NewsCategory =
  | "推荐"
  | "国内"
  | "国际"
  | "时政"
  | "社会"
  | "财经"
  | "科技"
  | "体育"
  | "文化"
  | "娱乐"
  | "健康"
  | "教育"
  | "环境"
  | "军事"
  | "其他";

export type NewsSourceType = "gdelt" | "official-rss" | "news-api" | "user-rss";
export type NewsEventStatus = "刚刚发生" | "持续发展" | "出现新进展" | "热度下降" | "已基本结束";
export type NewsImportance = "重大" | "重要" | "一般";

export type NewsSource = {
  id: string;
  name: string;
  domain: string;
  sourceType: NewsSourceType;
  language: string;
  countryOrRegion: string;
  categories: NewsCategory[];
  rssUrl?: string;
  homepageUrl?: string;
  isEnabled: boolean;
  reliabilityNote: string;
  usageNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewsSummary = {
  generatedAt?: string;
  generatedBy: "source-only" | "ai";
  whatHappened: string;
  whyItMatters: string;
  confirmedFacts: string[];
  currentProgress: string;
  unresolvedQuestions: string[];
  perspectives: string[];
  limitation?: string;
};

export type NewsArticle = {
  id: string;
  originalTitle: string;
  normalizedTitle: string;
  description?: string;
  aiSummary?: NewsSummary;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  articleUrl: string;
  imageUrl?: string;
  author?: string;
  category: NewsCategory;
  language?: string;
  countryOrRegion?: string;
  publishedAt: string;
  fetchedAt: string;
  updatedAt?: string;
  eventId?: string;
  keywords: string[];
  entities: string[];
  isRead: boolean;
  isFavorite: boolean;
};

export type NewsTimelineItem = {
  id: string;
  occurredAt: string;
  label: string;
  sourceNames: string[];
};

export type NewsEvent = {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  status: NewsEventStatus;
  importance: NewsImportance;
  firstPublishedAt: string;
  lastUpdatedAt: string;
  articleIds: string[];
  sourceIds: string[];
  timeline: NewsTimelineItem[];
  confirmedFacts: string[];
  disputedClaims: string[];
  unresolvedQuestions: string[];
};

export type NewsSettings = {
  followedCategories: NewsCategory[];
  hiddenCategories: NewsCategory[];
  defaultLanguage: "zh" | "en" | "all";
  countryOrRegion: string;
  pageSize: number;
  showImages: boolean;
  autoSummary: boolean;
  showSourceComparison: boolean;
  hideRead: boolean;
  cacheMinutes: number;
};

export type NewsSavedArticle = Pick<NewsArticle, "id" | "originalTitle" | "sourceName" | "articleUrl" | "publishedAt" | "description"> & {
  savedAt: string;
};

export type NewsHistoryItem = {
  articleId: string;
  title: string;
  sourceName: string;
  articleUrl: string;
  readAt: string;
};

export type NewsTrackedEvent = {
  eventId: string;
  title: string;
  trackedAt: string;
  lastUpdatedAt: string;
  latestProgress: string;
  articleCount: number;
  sourceCount: number;
  hasMajorUpdate: boolean;
};

export type NewsCache = {
  fetchedAt: string;
  articles: NewsArticle[];
  events: NewsEvent[];
  sourceStatuses: NewsSourceStatus[];
  metrics?: NewsFeedMetrics;
};

export type NewsSourceStatus = {
  sourceId: string;
  sourceName: string;
  ok: boolean;
  message?: string;
  fetchedAt: string;
  httpStatus?: number;
  requestCount?: number;
  cacheHit?: boolean;
  retryCount?: number;
  finalArticleCount?: number;
};

export type NewsRequestMetrics = {
  requestCount: number;
  httpStatusCodes: number[];
  cacheHit: boolean;
  retryCount: number;
  finalArticleCount: number;
};

export type NewsFeedMetrics = {
  requestId: string;
  gdelt: NewsRequestMetrics;
  rss: {
    requestCount: number;
    successCount: number;
    finalArticleCount: number;
  };
  feedCacheHit: boolean;
  requestDeduped: boolean;
  finalArticleCount: number;
};

export type NewsClientState = {
  settings: NewsSettings;
  favorites: NewsSavedArticle[];
  history: NewsHistoryItem[];
  trackedEvents: NewsTrackedEvent[];
  sources: NewsSource[];
};

export type NewsApiResponse = {
  articles: NewsArticle[];
  events: NewsEvent[];
  sourceStatuses: NewsSourceStatus[];
  fetchedAt: string;
  fromCache?: boolean;
  metrics?: NewsFeedMetrics;
  warning?: string;
};

export const NEWS_CATEGORIES: NewsCategory[] = [
  "推荐", "国内", "国际", "时政", "社会", "财经", "科技", "体育", "文化", "娱乐", "健康", "教育", "环境", "军事", "其他",
];
