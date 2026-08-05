"use client";

import * as React from "react";
import { AlertTriangle, BookOpen, ChevronDown, Filter, Library, MessageCircleMore, Newspaper, Search } from "lucide-react";
import { fetchNews } from "./newsApiService";
import { isSafeHttpUrl } from "./validation";
import { NewsCategoryTabs } from "./components/NewsCategoryTabs";
import { NewsCard } from "./components/NewsCard";
import { NewsDetail } from "./components/NewsDetail";
import { NewsOverview } from "./components/NewsOverview";
import { NewsCollections, NewsSearch, NewsSourceManager, TopStories, TrendingTopics } from "./components/NewsSections";
import { loadNewsCache, loadNewsState, saveNewsCache, saveNewsState } from "./storage";
import { NEWS_CATEGORIES, type NewsApiResponse, type NewsArticle, type NewsCategory, type NewsClientState, type NewsEvent } from "./types";
import { isSameDay, sortArticles } from "./utils";

type CollectionMode = "feed" | "favorites" | "history" | "tracking" | "sources";

export function NewsPage() {
  const [state, setState] = React.useState<NewsClientState | null>(null);
  const [articles, setArticles] = React.useState<NewsArticle[]>([]);
  const [events, setEvents] = React.useState<NewsEvent[]>([]);
  const [sourceStatuses, setSourceStatuses] = React.useState<NewsApiResponse["sourceStatuses"]>([]);
  const [fetchedAt, setFetchedAt] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<NewsCategory>("推荐");
  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [mode, setMode] = React.useState<CollectionMode>("feed");
  const [selectedArticleId, setSelectedArticleId] = React.useState<string>();
  const [warning, setWarning] = React.useState<string>();
  const [visibleArticleCount, setVisibleArticleCount] = React.useState(20);
  const refreshRequestRef = React.useRef<{ key: string; promise: Promise<void> } | null>(null);

  React.useEffect(() => {
    const nextState = loadNewsState();
    setState(nextState);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (state) saveNewsState(state);
  }, [state]);

  const applyPersistedState = React.useCallback((nextArticles: NewsArticle[], nextState: NewsClientState) => {
    const favoriteIds = new Set(nextState.favorites.map((item) => item.id));
    const readIds = new Set(nextState.history.map((item) => item.articleId));
    return nextArticles.map((article) => ({ ...article, isFavorite: favoriteIds.has(article.id), isRead: readIds.has(article.id) }));
  }, []);

  const refresh = React.useCallback(async () => {
    if (!state) return;
    const requestKey = `${activeCategory}|${submittedQuery}|${state.sources.filter((source) => source.isEnabled).map((source) => source.id).sort().join(",")}`;
    const existing = refreshRequestRef.current;
    if (existing?.key === requestKey) return existing.promise;

    const promise = (async () => {
      setLoading(true);
      setWarning(undefined);
      try {
        const response = await fetchNews(activeCategory, submittedQuery, state.sources.filter((source) => source.isEnabled).map((source) => source.id), state.sources);
        const nextArticles = applyPersistedState(sortArticles(response.articles), state);
        setArticles(nextArticles);
        setEvents(response.events);
        setSourceStatuses(response.sourceStatuses);
        setFetchedAt(response.fetchedAt);
        setWarning(response.warning);
        saveNewsCache({ fetchedAt: response.fetchedAt, articles: nextArticles, events: response.events, sourceStatuses: response.sourceStatuses, metrics: response.metrics });
      } catch (error) {
        const cache = loadNewsCache();
        if (cache?.articles.length) {
          setArticles(applyPersistedState(cache.articles, state));
          setEvents(cache.events);
          setSourceStatuses(cache.sourceStatuses);
          setFetchedAt(cache.fetchedAt);
          setWarning("当前展示的是最近一次成功更新的数据。新闻服务暂时不可用，请稍后重试。");
        } else {
          setWarning(error instanceof Error ? error.message : "新闻服务暂时不可用，请稍后重试。");
        }
      } finally { setLoading(false); }
    })();
    refreshRequestRef.current = { key: requestKey, promise };
    try { await promise; } finally {
      if (refreshRequestRef.current?.promise === promise) refreshRequestRef.current = null;
    }
  }, [activeCategory, applyPersistedState, state, submittedQuery]);

  React.useEffect(() => { if (hydrated && state) void refresh(); }, [hydrated, state, refresh]);

  React.useEffect(() => {
    setVisibleArticleCount(Math.max(20, state?.settings.pageSize ?? 20));
  }, [activeCategory, state?.settings.pageSize, submittedQuery]);

  function updateArticle(articleId: string, update: (article: NewsArticle) => NewsArticle) {
    setArticles((current) => current.map((article) => article.id === articleId ? update(article) : article));
  }

  function toggleFavorite(article: NewsArticle) {
    if (!state) return;
    const nextFavorite = !article.isFavorite;
    setState({ ...state, favorites: nextFavorite ? [{ id: article.id, originalTitle: article.originalTitle, sourceName: article.sourceName, articleUrl: article.articleUrl, publishedAt: article.publishedAt, description: article.description, savedAt: new Date().toISOString() }, ...state.favorites.filter((item) => item.id !== article.id)] : state.favorites.filter((item) => item.id !== article.id) });
    updateArticle(article.id, (current) => ({ ...current, isFavorite: nextFavorite }));
  }

  function toggleRead(article: NewsArticle) {
    if (!state) return;
    const nextRead = !article.isRead;
    const nextHistory = nextRead ? [{ articleId: article.id, title: article.originalTitle, sourceName: article.sourceName, articleUrl: article.articleUrl, readAt: new Date().toISOString() }, ...state.history.filter((item) => item.articleId !== article.id)].slice(0, 100) : state.history;
    setState({ ...state, history: nextHistory });
    updateArticle(article.id, (current) => ({ ...current, isRead: nextRead }));
  }

  function trackEvent(article: NewsArticle) {
    if (!state || !article.eventId) return;
    const event = events.find((item) => item.id === article.eventId);
    if (!event || state.trackedEvents.some((item) => item.eventId === event.id)) { setMode("tracking"); return; }
    setState({ ...state, trackedEvents: [{ eventId: event.id, title: event.title, trackedAt: new Date().toISOString(), lastUpdatedAt: event.lastUpdatedAt, latestProgress: event.summary, articleCount: event.articleIds.length, sourceCount: event.sourceIds.length, hasMajorUpdate: event.importance === "重大" }, ...state.trackedEvents] });
    setMode("tracking");
  }

  function toggleSource(sourceId: string) {
    if (!state) return;
    setState({ ...state, sources: state.sources.map((source) => source.id === sourceId ? { ...source, isEnabled: !source.isEnabled, updatedAt: new Date().toISOString() } : source) });
  }

  if (!hydrated || !state) return <div className="mx-auto max-w-[1200px] py-16"><div className="rounded-3xl border border-line bg-white p-10 text-center text-sm text-muted">正在准备新闻工作台…</div></div>;

  const visibleCategories = NEWS_CATEGORIES.filter((category) => !state.settings.hiddenCategories.includes(category));
  const favoriteIds = new Set(state.favorites.map((item) => item.id));
  const displayedArticles = articles.filter((article) => {
    if (activeCategory !== "推荐" && article.category !== activeCategory) return false;
    if (submittedQuery && !`${article.originalTitle} ${article.description ?? ""} ${article.sourceName}`.toLocaleLowerCase().includes(submittedQuery.toLocaleLowerCase())) return false;
    if (state.settings.hideRead && article.isRead) return false;
    return true;
  });
  const favoriteArticles = articles.filter((article) => favoriteIds.has(article.id));
  const todayCount = articles.filter((article) => isSameDay(article.publishedAt)).length;
  const unreadCount = articles.filter((article) => !article.isRead).length;
  const selectedArticle = selectedArticleId ? articles.find((article) => article.id === selectedArticleId) : undefined;
  const statusMessage = sourceStatuses.length && sourceStatuses.every((status) => status.ok) ? "来源正常" : sourceStatuses.length ? "部分来源异常" : "等待来源返回";
  const pageSize = Math.max(20, state.settings.pageSize);

  return <div className="mx-auto max-w-[1400px] space-y-8">
    <NewsOverview articleCount={todayCount} eventCount={events.length} unreadCount={unreadCount} favoriteCount={state.favorites.length} trackedCount={state.trackedEvents.length} fetchedAt={fetchedAt} loading={loading} onRefresh={() => void refresh()} />
    {warning ? <div className="flex items-start gap-3 rounded-2xl border border-[#F2D6AD] bg-[#FFF8EC] px-4 py-3 text-sm text-[#8A6C49]"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{warning}</span></div> : null}
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><TopStories events={events} onOpen={setSelectedArticleId} /><TrendingTopics events={events} /></div>
    <section className="rounded-3xl border border-line bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center gap-3"><NewsSearch query={query} onQuery={setQuery} onSubmit={() => { setSubmittedQuery(query.trim()); setMode("feed"); }} /><div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs text-muted"><Filter size={14} /><span>{statusMessage}</span></div></div><div className="mt-5"><NewsCategoryTabs categories={visibleCategories} active={activeCategory} onChange={(category) => { setActiveCategory(category); setMode("feed"); }} /></div><div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4"><ActionTab active={mode === "feed"} icon={<Newspaper size={14} />} label="新闻列表" onClick={() => setMode("feed")} /><ActionTab active={mode === "favorites"} icon={<Library size={14} />} label="我的收藏" onClick={() => setMode("favorites")} /><ActionTab active={mode === "history"} icon={<BookOpen size={14} />} label="阅读历史" onClick={() => setMode("history")} /><ActionTab active={mode === "tracking"} icon={<MessageCircleMore size={14} />} label="事件追踪" onClick={() => setMode("tracking")} /><ActionTab active={mode === "sources"} icon={<Search size={14} />} label="来源管理" onClick={() => setMode("sources")} /></div></section>
    {mode === "feed" ? <section className="space-y-4">{displayedArticles.slice(0, visibleArticleCount).map((article) => <NewsCard key={article.id} article={article} showImage={state.settings.showImages} onFavorite={() => toggleFavorite(article)} onRead={() => toggleRead(article)} onTrack={() => trackEvent(article)} onDetails={() => setSelectedArticleId(article.id)} />)}{displayedArticles.length > visibleArticleCount ? <button type="button" onClick={() => setVisibleArticleCount((count) => count + pageSize)} className="mx-auto block rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm transition hover:border-[#BFC4F4] hover:bg-canvas">继续加载</button> : null}{!displayedArticles.length ? <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center text-sm text-muted"><p>今日暂无该分类新闻，建议查看推荐或其他分类。</p><p className="mt-2 text-xs">当前已启用的数据源暂未返回该分类内容。</p></div> : null}</section> : null}
    {mode === "favorites" || mode === "history" || mode === "tracking" ? <NewsCollections mode={mode} articles={favoriteArticles} history={state.history} trackedEvents={state.trackedEvents} onOpen={setSelectedArticleId} onRemoveHistory={(articleId) => setState({ ...state, history: state.history.filter((item) => item.articleId !== articleId) })} onUntrack={(eventId) => setState({ ...state, trackedEvents: state.trackedEvents.filter((item) => item.eventId !== eventId) })} /> : null}
    {mode === "sources" ? <NewsSourceManager sources={state.sources} onToggle={toggleSource} onAddRss={(url) => { if (!isSafeHttpUrl(url)) return "链接格式不安全，只允许公开的 http 或 https 地址。"; if (state.sources.some((source) => source.rssUrl === url)) return "这个 RSS 地址已经添加。"; const timestamp = new Date().toISOString(); setState({ ...state, sources: [...state.sources, { id: `user-rss-${Date.now()}`, name: new URL(url).hostname, domain: new URL(url).hostname, sourceType: "user-rss", language: "未指定", countryOrRegion: "未指定", categories: ["推荐", "其他"], rssUrl: url, isEnabled: true, reliabilityNote: "用户自行添加的公开 RSS，来源质量和授权范围需要自行确认。", createdAt: timestamp, updatedAt: timestamp }] }); return undefined; }} /> : null}
    <section className="grid gap-5 md:grid-cols-3"><div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-extrabold">舆论观察</p><p className="mt-3 text-sm leading-6 text-muted">当前仅根据公开新闻来源整理争议焦点，不代表完整社会舆论，也不生成网友比例、情绪占比或全网热度。</p></div><div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-extrabold">数据来源</p><p className="mt-3 text-sm leading-6 text-muted">{sourceStatuses.filter((status) => status.ok).map((status) => status.sourceName).join("、") || "暂无成功返回的来源"}</p></div><div className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-extrabold">阅读提醒</p><p className="mt-3 text-sm leading-6 text-muted">新闻摘要只基于公开标题和来源摘要，政治、冲突及争议事件请打开原文核实。</p></div></section>
    {selectedArticle ? <NewsDetail article={selectedArticle} onClose={() => setSelectedArticleId(undefined)} /> : null}
  </div>;
}

function ActionTab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-ink text-white" : "text-muted hover:bg-canvas hover:text-ink"}`}>{icon}{label}<ChevronDown size={12} className={active ? "opacity-70" : "hidden"} /></button>; }
