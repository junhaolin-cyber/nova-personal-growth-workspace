"use client";

import * as React from "react";
import { BookOpen, History, Lightbulb, ListChecks, ShieldCheck, Utensils } from "lucide-react";
import { AIFoodAnalysis } from "./components/AIFoodAnalysis";
import { FoodLists } from "./components/FoodLists";
import { RestaurantDetail } from "./components/RestaurantDetail";
import { RestaurantSearch } from "./components/RestaurantSearch";
import { VisitForm, type VisitInput } from "./components/VisitForm";
import { createFoodAnalysis, enrichRestaurantFromOfficialUrl, getRestaurantDetails, searchLocalRestaurants, searchRestaurants } from "./service";
import { createDefaultFoodState, loadFoodState, saveFoodState } from "./storage";
import type { FoodDiscoveryState, RestaurantRecord, RestaurantSearchInput } from "./types";

export function FoodDiscovery() {
  const [state, setState] = React.useState<FoodDiscoveryState>(() => createDefaultFoodState());
  const [selectedId, setSelectedId] = React.useState<string>();
  const [searchInput, setSearchInput] = React.useState<RestaurantSearchInput>({ name: "", address: "", city: "" });
  const [isVisitFormOpen, setIsVisitFormOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isOfficialEnriching, setIsOfficialEnriching] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => { const nextState = loadFoodState(); setState(nextState); setSelectedId(nextState.restaurants[0]?.id); setIsHydrated(true); }, []);
  React.useEffect(() => { if (isHydrated) saveFoodState(state); }, [isHydrated, state]);
  React.useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3200); return () => window.clearTimeout(timer); }, [notice]);

  if (!isHydrated) return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-muted shadow-card">正在准备你的美食探索空间…</div>;

  const selected = state.restaurants.find((restaurant) => restaurant.id === selectedId);
  const searchResults = searchLocalRestaurants(state.restaurants, searchInput);
  const handleSelectRestaurant = async (id: string) => {
    setSelectedId(id);
    const restaurant = state.restaurants.find((item) => item.id === id);
    if (!restaurant?.sourcePlaceId || restaurant.sourceProvider !== "amap") return;
    setNotice("正在加载门店详情…");
    const result = await getRestaurantDetails(restaurant.sourcePlaceId);
    if (!result.record) { setNotice(result.message ?? "门店详情暂时不可用，已保留搜索结果。"); return; }
    const detail = result.record;
    setState((current) => ({ ...current, restaurants: current.restaurants.map((item) => item.sourcePlaceId === restaurant.sourcePlaceId ? { ...detail, status: item.status, lastVisitedAt: item.lastVisitedAt, createdAt: item.createdAt, officialSource: item.officialSource, officialData: item.officialData } : item) }));
    setNotice(result.message ?? "门店详情已更新。");
  };
  const updateRestaurant = (id: string, patch: Partial<RestaurantRecord>) => setState((current) => ({ ...current, restaurants: current.restaurants.map((restaurant) => restaurant.id === id ? { ...restaurant, ...patch, updatedAt: new Date().toISOString() } : restaurant) }));
  const handleSearch = async () => {
    if (!searchInput.name.trim()) return;
    setIsSearching(true);
    const result = await searchRestaurants(searchInput);
    if (!result.records.length) { setNotice(result.message ?? "没有找到匹配的真实门店。"); setIsSearching(false); return; }
    setState((current) => {
      const restaurants = [...current.restaurants];
      result.records.forEach((record) => {
        const index = restaurants.findIndex((item) => item.sourcePlaceId && item.sourcePlaceId === record.sourcePlaceId);
        if (index >= 0) restaurants[index] = { ...record, status: restaurants[index].status, lastVisitedAt: restaurants[index].lastVisitedAt, createdAt: restaurants[index].createdAt, officialSource: restaurants[index].officialSource, officialData: restaurants[index].officialData };
        else restaurants.unshift(record);
      });
      return { ...current, restaurants };
    });
    setSelectedId(result.records[0].id);
    setNotice(result.message ?? `已找到 ${result.records.length} 家候选门店。`);
    setIsSearching(false);
  };
  const handleOfficialEnrich = async (url: string) => {
    if (!selected || selected.sourceProvider !== "amap") return;
    setIsOfficialEnriching(true);
    const result = await enrichRestaurantFromOfficialUrl(selected.id, selected.sourceProvider, url);
    if (result.source || result.data) {
      setState((current) => ({ ...current, restaurants: current.restaurants.map((restaurant) => restaurant.id === selected.id ? { ...restaurant, officialSource: result.source ?? restaurant.officialSource, officialData: result.data ?? restaurant.officialData, updatedAt: new Date().toISOString() } : restaurant) }));
    }
    setNotice(result.message ?? "官网资料读取完成。");
    setIsOfficialEnriching(false);
  };
  const toggleFavorite = () => { if (!selected) return; setState((current) => ({ ...current, favoriteRestaurantIds: current.favoriteRestaurantIds.includes(selected.id) ? current.favoriteRestaurantIds.filter((id) => id !== selected.id) : [...current.favoriteRestaurantIds, selected.id] })); };
  const saveVisit = (input: VisitInput) => { if (!selected) return; const visit = { ...input, id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, restaurantId: selected.id }; setState((current) => ({ ...current, visits: [visit, ...current.visits], restaurants: current.restaurants.map((restaurant) => restaurant.id === selected.id ? { ...restaurant, status: "visited", lastVisitedAt: input.visitedAt, updatedAt: new Date().toISOString() } : restaurant) })); setIsVisitFormOpen(false); setNotice("探店记录已保存，内容只来自你的亲身体验。"); };
  const removeRestaurant = (id: string) => { if (!window.confirm("确定移除这家餐厅吗？相关收藏和探店记录也会一并移除。")) return; setState((current) => ({ ...current, restaurants: current.restaurants.filter((restaurant) => restaurant.id !== id), favoriteRestaurantIds: current.favoriteRestaurantIds.filter((favoriteId) => favoriteId !== id), visits: current.visits.filter((visit) => visit.restaurantId !== id) })); if (selectedId === id) setSelectedId(undefined); };

  return <div className="mx-auto max-w-[1240px] space-y-8">
    {notice && <div role="status" className="rounded-2xl border border-[#E5D9CA] bg-[#FFFBF7] px-4 py-3 text-sm font-semibold text-[#95633C]">{notice}</div>}
    <section className="flex flex-wrap items-end justify-between gap-6"><div><p className="flex items-center gap-2 text-sm font-bold text-[#C07C3F]"><Utensils size={16} />生活记录 · 美食探索</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">把值得再去的味道记下来</h1><p className="mt-3 text-sm text-muted">从一家餐厅开始，先了解，再体验，最后留下自己的判断。</p></div><div className="flex items-center gap-2 rounded-2xl border border-[#E5D9CA] bg-[#FFFBF7] px-4 py-3 text-xs font-bold text-[#95633C]"><ShieldCheck size={15} />只展示可说明来源的信息</div></section>
    <div className="grid gap-3 sm:grid-cols-3"><SummaryCard icon={<ListChecks size={18} />} label="想去清单" value={state.restaurants.filter((restaurant) => restaurant.status === "want").length} /><SummaryCard icon={<BookOpen size={18} />} label="我的探店" value={state.restaurants.filter((restaurant) => restaurant.status === "visited").length} /><SummaryCard icon={<History size={18} />} label="探店记录" value={state.visits.length} /></div>
    <RestaurantSearch input={searchInput} results={searchResults} onChange={setSearchInput} onSearch={handleSearch} onSelect={handleSelectRestaurant} isSearching={isSearching} selectedRestaurant={selected?.sourceProvider === "amap" ? selected : undefined} onOfficialEnrich={handleOfficialEnrich} isOfficialEnriching={isOfficialEnriching} />
    {!selected ? <section className="rounded-[24px] border border-dashed border-[#D9DEE3] bg-white px-6 py-16 text-center shadow-card"><Lightbulb className="mx-auto text-[#C07C3F]" size={28} /><h2 className="mt-4 text-xl font-extrabold">搜索一家餐厅，开始建立探店档案</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">当前版本不会自动抓取大众点评、地图或其他平台内容。搜索后会先保存你输入的门店信息，公开资料需要你通过外部平台自行核验。</p></section> : <>
      <RestaurantDetail restaurant={selected} isFavorite={state.favoriteRestaurantIds.includes(selected.id)} onToggleFavorite={toggleFavorite} onStatusChange={(status) => updateRestaurant(selected.id, { status })} onVisit={() => setIsVisitFormOpen(true)} />
      {isVisitFormOpen && <VisitForm onSave={saveVisit} onCancel={() => setIsVisitFormOpen(false)} />}
      <AIFoodAnalysis analysis={createFoodAnalysis(selected)} />
      <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#F8E7D4] text-[#C07C3F]"><Utensils size={18} /></div><div><h2 className="text-xl font-extrabold">推荐菜</h2><p className="mt-1 text-xs text-muted">没有核验到公开菜单前，不展示虚构菜名。</p></div></div><div className="mt-5 rounded-2xl border border-dashed border-[#D9DEE3] bg-canvas px-5 py-7 text-center text-sm text-muted">暂无公开菜单资料。到店后可以在“记录探店”中填写你实际点过的菜。</div></section>
    </>}
    <FoodLists restaurants={state.restaurants} visits={state.visits} favoriteIds={state.favoriteRestaurantIds} selectedId={selectedId} onSelect={handleSelectRestaurant} onDelete={removeRestaurant} />
    <p className="pb-4 text-center text-xs leading-6 text-muted">美食探索当前为本地记录版本。评分、评论、营业时间、人均消费和菜品信息不会被虚构；后续可在合法数据源接入后扩展。</p>
  </div>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-[20px] border border-line bg-white px-5 py-5 shadow-card"><div className="flex items-center justify-between gap-4"><span className="grid size-9 place-items-center rounded-xl bg-[#F8E7D4] text-[#C07C3F]">{icon}</span><span className="text-3xl font-extrabold tracking-[-0.04em]">{value}</span></div><p className="mt-4 text-sm font-semibold text-muted">{label}</p></div>; }
