"use client";

import * as React from "react";
import { Clapperboard, Clock3, Search, Sparkles, Star, X } from "lucide-react";
import { fallbackMedia } from "./data";
import { readMoviesTvState, writeMoviesTvState } from "./storage";
import type { MediaDetail, MediaItem, MediaView, MoviesTvState, WatchRecord, WatchStatus } from "./types";
import { MediaCard } from "./components/MediaCard";
import { MediaDetailPanel } from "./components/MediaDetailPanel";
import { FIRST_BATCH_REMOTE_MERGED_EVENT } from "@/features/sync/events";

const viewTabs: Array<{ id: MediaView; label: string }> = [
  { id: "today", label: "今日推荐" },
  { id: "movie", label: "电影" },
  { id: "tv", label: "电视剧" },
  { id: "documentary", label: "纪录片" },
  { id: "anime", label: "动漫" },
  { id: "variety", label: "综艺" },
  { id: "favorites", label: "我的收藏" },
  { id: "history", label: "观看历史" },
];

function mergeItems(current: MediaItem[], incoming: MediaItem[]): MediaItem[] {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function categoryItems(items: MediaItem[], view: MediaView, state: ReturnType<typeof readMoviesTvState>): MediaItem[] {
  if (view === "favorites") return items.filter((item) => state.favoriteIds.includes(item.id));
  if (view === "history") {
    const historyIds = new Set(state.watchRecords.map((record) => record.mediaId));
    return items.filter((item) => historyIds.has(item.id));
  }
  if (view === "today") return items.slice(0, 10);
  return items.filter((item) => item.category === view);
}

export function MoviesTv() {
  const [view, setView] = React.useState<MediaView>("today");
  const [catalog, setCatalog] = React.useState<MediaItem[]>(fallbackMedia);
  const [state, setState] = React.useState<MoviesTvState>({ favoriteIds: [], watchRecords: [] });
  const [hydrated, setHydrated] = React.useState(false);
  const [loadingFeed, setLoadingFeed] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<MediaItem[] | null>(null);
  const [selected, setSelected] = React.useState<MediaItem | null>(null);
  const [detail, setDetail] = React.useState<MediaDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const visibleItems = React.useMemo(() => categoryItems(searchResults ?? catalog, view, state), [catalog, searchResults, state, view]);
  const selectedRecord = selected ? state.watchRecords.find((record) => record.mediaId === selected.id) : undefined;

  React.useEffect(() => { setState(readMoviesTvState()); setHydrated(true); }, []);
  React.useEffect(() => {
    const handleRemoteMerged = () => setState(readMoviesTvState());
    window.addEventListener(FIRST_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
    return () => window.removeEventListener(FIRST_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
  }, []);
  React.useEffect(() => { if (hydrated) writeMoviesTvState(state); }, [hydrated, state]);

  React.useEffect(() => {
    if (view === "favorites" || view === "history") return;
    let cancelled = false;
    setLoadingFeed(true);
    fetch(`/api/movies-tv/discover?scope=${view}`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { items?: MediaItem[]; warning?: string } : { items: [], warning: "影视数据服务暂时不可用。" })
      .then((result) => { if (!cancelled) { setCatalog((current) => mergeItems(result.items ?? [], current)); setMessage(result.warning ?? ""); setSearchResults(null); } })
      .catch(() => { if (!cancelled) setMessage("影视数据服务暂时不可用，当前保留已有公开片单。"); })
      .finally(() => { if (!cancelled) setLoadingFeed(false); });
    return () => { cancelled = true; };
  }, [view]);

  const toggleFavorite = (id: string) => setState((current) => ({ ...current, favoriteIds: current.favoriteIds.includes(id) ? current.favoriteIds.filter((item) => item !== id) : [...current.favoriteIds, id] }));

  const recordStatus = (item: MediaItem, status: WatchStatus) => {
    setState((current) => {
      const existing = current.watchRecords.find((record) => record.mediaId === item.id);
      const next: WatchRecord = { ...existing, mediaId: item.id, status, watchedAt: status === "watched" ? new Date().toISOString().slice(0, 10) : existing?.watchedAt };
      return { ...current, watchRecords: [next, ...current.watchRecords.filter((record) => record.mediaId !== item.id)].slice(0, 100) };
    });
  };

  const saveRecord = (item: MediaItem, note: string, rating?: number) => {
    setState((current) => {
      const existing = current.watchRecords.find((record) => record.mediaId === item.id);
      const next: WatchRecord = { ...existing, mediaId: item.id, status: existing?.status ?? "want", note: note.slice(0, 300), rating };
      return { ...current, watchRecords: [next, ...current.watchRecords.filter((record) => record.mediaId !== item.id)].slice(0, 100) };
    });
  };

  const openDetail = async (item: MediaItem) => {
    setSelected(item); setDetail(null); setLoadingDetail(true); recordStatus(item, "want");
    try {
      const response = await fetch(`/api/movies-tv/details/${encodeURIComponent(item.id)}?type=${item.mediaType}`, { cache: "no-store" });
      if (response.ok) { const result = await response.json() as { item?: MediaDetail }; setDetail(result.item ?? item); } else setDetail(item);
    } catch { setDetail(item); } finally { setLoadingDetail(false); }
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };
  const submitSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) { setSearchResults(null); return; }
    try {
      const response = await fetch(`/api/movies-tv/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
      const result = await response.json() as { items?: MediaItem[]; warning?: string };
      setSearchResults(result.items ?? []); setMessage(result.warning ?? "");
    } catch { setSearchResults([]); setMessage("搜索服务暂时不可用。"); }
  };

  const clearSearch = () => { setSearch(""); setSearchResults(null); setMessage(""); };
  const isHistory = view === "history";
  const watchedCount = state.watchRecords.filter((record) => record.status === "watched").length;

  return <div className="mx-auto max-w-[1440px]">
    <section className="rounded-[30px] border border-line bg-white p-6 shadow-card sm:p-8 lg:p-10"><div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-[#557B9C]"><Sparkles size={16} />找到下一部值得看的作品</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">电影电视</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">发现电影、电视剧、纪录片、动漫和综艺。这里只做影视发现与记录，不提供在线播放、下载或盗版资源。</p></div><div className="flex flex-wrap gap-3 text-xs text-muted"><span className="rounded-full bg-[#EEF5F8] px-3 py-2 font-semibold text-[#557B9C]">今日推荐 {Math.min(10, catalog.length)} 部</span><span className="rounded-full bg-canvas px-3 py-2">收藏 {state.favoriteIds.length}</span><span className="rounded-full bg-canvas px-3 py-2">已看 {watchedCount}</span></div></div><div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]"><div className="rounded-[24px] bg-[#1D1D22] p-6 text-white sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs text-white/60">今日推荐</p><h2 className="mt-3 text-2xl font-extrabold leading-9">把时间留给<br />真正想看的故事。</h2></div><Clapperboard size={25} className="text-[#D6E8F3]" /></div><p className="mt-8 max-w-sm text-sm leading-6 text-white/70">按公开热度、类型与可追溯资料整理，打开原文了解完整信息。</p></div><div className="rounded-[24px] bg-[#EEF5F8] p-6"><p className="text-xs font-bold text-[#557B9C]">片单规模</p><p className="mt-5 text-3xl font-extrabold text-[#263B48]">{catalog.length}</p><p className="mt-2 text-sm text-[#66808F]">条公开影视资料</p></div><div className="rounded-[24px] bg-[#F1ECFA] p-6"><p className="text-xs font-bold text-[#7968A9]">我的记录</p><p className="mt-5 text-3xl font-extrabold text-[#332D4C]">{state.watchRecords.length}</p><p className="mt-2 text-sm text-[#796F91]">条想看与已看记录</p></div></div></section>
    <section className="mt-8"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">{viewTabs.map((tab) => <button key={tab.id} type="button" onClick={() => { setView(tab.id); setSearchResults(null); }} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${view === tab.id ? "bg-ink text-white shadow-sm" : "bg-white text-muted hover:text-ink"}`}>{tab.label}</button>)}</div><form onSubmit={submitSearch} className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-sm xl:max-w-[320px]"><Search size={16} className="shrink-0 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索电影、演员、导演或类型" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />{search ? <button type="button" onClick={clearSearch} aria-label="清除搜索" className="text-muted hover:text-ink"><X size={15} /></button> : null}</form></div></section>
    {message ? <p className="mt-5 rounded-xl border border-[#E4E1F2] bg-[#F8F6FD] px-4 py-3 text-xs leading-5 text-[#7169B1]">{message}</p> : null}
    {selected ? <section className="mt-6"><MediaDetailPanel detail={detail} loading={loadingDetail} isFavorite={state.favoriteIds.includes(selected.id)} record={selectedRecord} onClose={closeDetail} onFavorite={() => toggleFavorite(selected.id)} onMark={(status) => recordStatus(selected, status)} onSaveNote={(note, rating) => saveRecord(selected, note, rating)} /></section> : null}
    <section className="mt-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{searchResults ? "搜索结果" : viewTabs.find((tab) => tab.id === view)?.label}</h2><p className="mt-1 text-sm text-muted">{isHistory ? "记录想看、已看、评分与观看备注" : view === "favorites" ? "你收藏的电影、电视剧、纪录片、动漫和综艺" : "公开资料入口，不提供影视内容播放"}</p></div><div className="flex items-center gap-2 text-xs text-muted"><Clock3 size={15} />{visibleItems.length} 部</div></div>{loadingFeed ? <div className="rounded-[24px] border border-line bg-white p-12 text-center shadow-card"><p className="font-semibold">正在更新影视资料…</p><p className="mt-2 text-sm text-muted">保持页面可用，不影响已有收藏和观看记录。</p></div> : visibleItems.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#D5D8E1] bg-white p-12 text-center"><Star className="mx-auto text-[#B8BBD0]" size={28} /><p className="mt-4 font-semibold">{isHistory ? "还没有观看记录" : view === "favorites" ? "还没有收藏影视" : "没有找到符合条件的影视"}</p><p className="mt-2 text-sm text-muted">可以换一个关键词，或从今日推荐开始浏览。</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <MediaCard key={item.id} item={item} isFavorite={state.favoriteIds.includes(item.id)} isWatched={state.watchRecords.some((record) => record.mediaId === item.id && record.status === "watched")} onFavorite={() => toggleFavorite(item.id)} onOpen={() => openDetail(item)} />)}</div>}</section>
    <p className="mt-8 text-xs leading-5 text-muted">数据优先来自 TMDB 等合法公开影视资料。当前未配置 API Key 时显示真实基础片单，实时热度、评分、海报、预告片和平台信息以公开数据源实际返回为准。</p>
  </div>;
}
