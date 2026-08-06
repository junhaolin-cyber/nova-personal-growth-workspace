"use client";

import * as React from "react";
import { Compass, History, Search, Sparkles, Star, Video, X } from "lucide-react";
import { trendBrands, trendItems } from "./data";
import { getDailyOutfitContent } from "./outfitData";
import { readTrendLifeState, writeTrendLifeState } from "./storage";
import type { TrendBrand, TrendItem, TrendLifeState, TrendLifeView } from "./types";
import { TrendBrandCard } from "./components/TrendBrandCard";
import { TrendLifeCard } from "./components/TrendLifeCard";
import { TrendThemeCard } from "./components/TrendThemeCard";

const viewTabs: Array<{ id: TrendLifeView; label: string }> = [
  { id: "overview", label: "今日潮流" },
  { id: "new", label: "今日新品" },
  { id: "outfit", label: "今日穿搭" },
  { id: "brands", label: "品牌中心" },
  { id: "articles", label: "潮流资讯" },
  { id: "videos", label: "视频推荐" },
  { id: "favorites", label: "收藏" },
  { id: "history", label: "浏览历史" },
];

const emptyState: TrendLifeState = {
  favoriteIds: [],
  favoriteBrandIds: [],
  favoriteThemeIds: [],
  historyIds: [],
  historyBrandIds: [],
};

function matchesSearch(values: string[], search: string): boolean {
  const normalized = search.trim().toLowerCase();
  return !normalized || values.join(" ").toLowerCase().includes(normalized);
}

function itemsForView(view: TrendLifeView, state: TrendLifeState, search: string, items: TrendItem[]): TrendItem[] {
  return items.filter((item) => {
    const matchesView = view === "overview"
      ? true
      : view === "favorites"
        ? state.favoriteIds.includes(item.id)
        : view === "history"
          ? state.historyIds.includes(item.id)
          : view === "articles"
            ? item.kind === "article"
            : view === "videos"
              ? item.kind === "video"
              : view === "outfit"
                ? item.featuredInOutfit === true
                : item.kind === view;
    return matchesView && matchesSearch([item.title, item.summary, item.sourceName, item.brand ?? "", ...item.tags], search);
  });
}

function brandsForView(view: TrendLifeView, state: TrendLifeState, search: string): TrendBrand[] {
  return trendBrands.filter((brand) => {
    const matchesView = view === "brands"
      ? true
      : view === "favorites"
        ? state.favoriteBrandIds.includes(brand.id)
        : view === "history"
          ? state.historyBrandIds.includes(brand.id)
          : false;
    return matchesView && matchesSearch([brand.name, brand.description, brand.focus], search);
  });
}

export function TrendLife() {
  const dailyOutfit = React.useMemo(() => getDailyOutfitContent(), []);
  const allItems = React.useMemo(() => [...trendItems, ...dailyOutfit.items], [dailyOutfit.items]);
  const [view, setView] = React.useState<TrendLifeView>("overview");
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState<TrendLifeState>(emptyState);
  const [coverByItemId, setCoverByItemId] = React.useState<Record<string, string>>({});
  const [hydrated, setHydrated] = React.useState(false);
  const visibleItems = React.useMemo(() => itemsForView(view, state, search, allItems), [view, state, search, allItems]);
  const visibleBrands = React.useMemo(() => brandsForView(view, state, search), [view, state, search]);
  const themeMatchesSearch = matchesSearch([dailyOutfit.theme.title, dailyOutfit.theme.reason, ...dailyOutfit.theme.tags], search);
  const visibleFavoriteTheme = view === "favorites" && state.favoriteThemeIds.includes(dailyOutfit.theme.id) && themeMatchesSearch ? dailyOutfit.theme : null;
  const favoriteCount = state.favoriteIds.length + state.favoriteBrandIds.length + state.favoriteThemeIds.length;

  React.useEffect(() => {
    setState(readTrendLifeState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) writeTrendLifeState(state);
  }, [hydrated, state]);

  React.useEffect(() => {
    const urls = [...new Set(allItems.map((item) => item.sourceUrl).filter((url): url is string => Boolean(url)))];
    if (!urls.length) return;
    const controller = new AbortController();
    fetch("/api/trend-life/covers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }), signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ covers?: Record<string, { coverUrl?: string }> }> : { covers: {} })
      .then((result) => {
        const next: Record<string, string> = {};
        allItems.forEach((item) => { const cover = item.sourceUrl ? result.covers?.[item.sourceUrl]?.coverUrl : undefined; if (cover) next[item.id] = cover; });
        setCoverByItemId(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [allItems]);

  const toggleFavorite = (id: string) => setState((current) => ({
    ...current,
    favoriteIds: current.favoriteIds.includes(id) ? current.favoriteIds.filter((item) => item !== id) : [...current.favoriteIds, id],
  }));

  const toggleBrandFavorite = (id: string) => setState((current) => ({
    ...current,
    favoriteBrandIds: current.favoriteBrandIds.includes(id) ? current.favoriteBrandIds.filter((item) => item !== id) : [...current.favoriteBrandIds, id],
  }));

  const toggleThemeFavorite = (id: string) => setState((current) => ({
    ...current,
    favoriteThemeIds: current.favoriteThemeIds.includes(id) ? current.favoriteThemeIds.filter((item) => item !== id) : [...current.favoriteThemeIds, id],
  }));

  const recordHistory = (id: string) => setState((current) => ({
    ...current,
    historyIds: [id, ...current.historyIds.filter((item) => item !== id)].slice(0, 40),
  }));

  const recordBrandHistory = (id: string) => setState((current) => ({
    ...current,
    historyBrandIds: [id, ...current.historyBrandIds.filter((item) => item !== id)].slice(0, 40),
  }));

  const clearSearch = () => setSearch("");
  const isCollectionView = view === "favorites" || view === "history";
  const hasCollectionContent = visibleItems.length > 0 || visibleBrands.length > 0 || visibleFavoriteTheme !== null;

  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="rounded-[30px] border border-line bg-white p-6 shadow-card sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-[#8A5BA6]"><Sparkles size={16} />把喜欢的风格留在这里</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">潮流生活</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">关注潮流资讯、品牌动向、穿搭灵感和公开内容。这里不卖东西，只帮你更轻松地发现值得看的内容。</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted"><span className="rounded-full bg-[#F5F0FA] px-3 py-2 font-semibold text-[#805C9C]">{allItems.length} 条精选内容</span><span className="rounded-full bg-canvas px-3 py-2">{favoriteCount} 条收藏</span></div>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="rounded-[24px] bg-[#1D1D22] p-6 text-white sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs text-white/60">今日潮流</p><h2 className="mt-3 text-2xl font-extrabold leading-9">让灵感先于<br />消费发生。</h2></div><Compass size={25} className="text-[#D8C8F4]" /></div><p className="mt-8 max-w-sm text-sm leading-6 text-white/70">优先浏览官方资讯和公开视频，不把潮流变成购物清单。</p></div>
          <div className="rounded-[24px] bg-[#F1ECFA] p-6"><p className="text-xs font-bold text-[#7968A9]">今日新品</p><p className="mt-5 text-3xl font-extrabold text-[#2B253C]">{trendItems.filter((item) => item.kind === "new").length}</p><p className="mt-2 text-sm text-[#796F91]">个官方资讯入口</p></div>
          <div className="rounded-[24px] bg-[#EEF5F2] p-6"><p className="text-xs font-bold text-[#4F8067]">今日穿搭</p><p className="mt-5 text-3xl font-extrabold text-[#263D31]">{dailyOutfit.items.length}</p><p className="mt-2 text-sm text-[#668170]">篇文章与视频</p></div>
        </div>
      </section>

      <section className="mt-8"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">{viewTabs.map((tab) => <button key={tab.id} type="button" onClick={() => setView(tab.id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${view === tab.id ? "bg-ink text-white shadow-sm" : "bg-white text-muted hover:text-ink"}`}>{tab.label}</button>)}</div><div className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-sm xl:max-w-[300px]"><Search size={16} className="shrink-0 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索品牌、型号或关键词" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />{search ? <button type="button" onClick={clearSearch} aria-label="清除搜索" className="text-muted hover:text-ink"><X size={15} /></button> : null}</div></div></section>

      <section className="mt-6">
        {view === "brands" ? <div className="grid gap-3 md:grid-cols-2">{visibleBrands.map((brand) => <TrendBrandCard key={brand.id} brand={brand} isFavorite={state.favoriteBrandIds.includes(brand.id)} onFavorite={() => toggleBrandFavorite(brand.id)} onOpen={() => recordBrandHistory(brand.id)} />)}</div> : <>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{viewTabs.find((tab) => tab.id === view)?.label}</h2><p className="mt-1 text-sm text-muted">{view === "favorites" ? "你收藏的文章、视频、新品、品牌和穿搭主题" : view === "history" ? "最近打开过的公开内容和品牌官网" : view === "outfit" ? "每天更新一组可直接打开的文章与官方公开视频" : "轻量浏览，按你的兴趣慢慢收藏"}</p></div><div className="flex items-center gap-2 text-xs text-muted">{view === "videos" ? <Video size={15} /> : view === "history" ? <History size={15} /> : <Star size={15} />}{isCollectionView ? visibleItems.length + visibleBrands.length + (visibleFavoriteTheme ? 1 : 0) : visibleItems.length} 条</div></div>
          {view === "outfit" ? <TrendThemeCard theme={dailyOutfit.theme} isFavorite={state.favoriteThemeIds.includes(dailyOutfit.theme.id)} onFavorite={() => toggleThemeFavorite(dailyOutfit.theme.id)} /> : null}
          {isCollectionView && visibleFavoriteTheme ? <div className="mb-6"><TrendThemeCard theme={visibleFavoriteTheme} isFavorite onFavorite={() => toggleThemeFavorite(visibleFavoriteTheme.id)} /></div> : null}
          {!isCollectionView && visibleItems.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#D5D8E1] bg-white p-12 text-center"><Star className="mx-auto text-[#B8BBD0]" size={28} /><p className="mt-4 font-semibold">没有找到匹配内容</p><p className="mt-2 text-sm text-muted">可以换一个关键词，或先从今日潮流开始浏览。</p></div> : null}
          {isCollectionView && !hasCollectionContent ? <div className="rounded-[24px] border border-dashed border-[#D5D8E1] bg-white p-12 text-center"><Star className="mx-auto text-[#B8BBD0]" size={28} /><p className="mt-4 font-semibold">{view === "favorites" ? "还没有收藏内容" : "还没有浏览记录"}</p><p className="mt-2 text-sm text-muted">可以先从今日潮流开始浏览，遇到喜欢的内容就收藏起来。</p></div> : null}
          {visibleBrands.length > 0 ? <div className="mb-6"><h3 className="mb-3 text-base font-extrabold">{view === "favorites" ? "收藏的品牌" : "浏览过的品牌"}</h3><div className="grid gap-3 md:grid-cols-2">{visibleBrands.map((brand) => <TrendBrandCard key={brand.id} brand={brand} isFavorite={state.favoriteBrandIds.includes(brand.id)} onFavorite={() => toggleBrandFavorite(brand.id)} onOpen={() => recordBrandHistory(brand.id)} />)}</div></div> : null}
          {visibleItems.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item) => <TrendLifeCard key={item.id} item={item} coverUrl={coverByItemId[item.id]} isFavorite={state.favoriteIds.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onOpen={() => recordHistory(item.id)} />)}</div> : null}
        </>}
      </section>
      <p className="mt-8 text-xs leading-5 text-muted">内容以品牌官网、官方栏目和官方公开视频入口为主。推荐说明只根据公开页面的主题标签生成，不替代原文，也不提供购物、价格、库存、尺码或抢购服务。</p>
    </div>
  );
}
