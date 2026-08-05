"use client";

import * as React from "react";
import { CalendarDays, Heart, MapPin, Star } from "lucide-react";
import type { RestaurantRecord, VisitRecord } from "../types";

type FoodTab = "want" | "visited" | "favorite" | "history";
interface FoodListsProps { restaurants: RestaurantRecord[]; visits: VisitRecord[]; favoriteIds: string[]; selectedId?: string; onSelect: (id: string) => void; onDelete: (id: string) => void; }

export function FoodLists({ restaurants, visits, favoriteIds, selectedId, onSelect, onDelete }: FoodListsProps) {
  const [tab, setTab] = React.useState<FoodTab>("want");
  const filtered = tab === "want" ? restaurants.filter((item) => item.status === "want") : tab === "visited" ? restaurants.filter((item) => item.status === "visited") : tab === "favorite" ? restaurants.filter((item) => favoriteIds.includes(item.id)) : [];
  const visitRows = visits.map((visit) => ({ visit, restaurant: restaurants.find((item) => item.id === visit.restaurantId) })).filter((item): item is { visit: VisitRecord; restaurant: RestaurantRecord } => Boolean(item.restaurant));
  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold tracking-[-0.04em]">我的探店空间</h2><p className="mt-2 text-sm text-muted">把想去、去过和真正值得再去的味道放在一起。</p></div><span className="text-xs font-semibold text-muted">{restaurants.length} 家门店 · {visits.length} 条记录</span></div><div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-canvas p-1.5">{([['want','想去清单'],['visited','我的探店'],['favorite','我的收藏'],['history','历史记录']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${tab === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{label}</button>)}</div>{tab === "history" ? <HistoryList rows={visitRows} onSelect={onSelect} /> : <RestaurantList rows={filtered} selectedId={selectedId} favoriteIds={favoriteIds} onSelect={onSelect} onDelete={onDelete} />}</section>;
}

function RestaurantList({ rows, selectedId, favoriteIds, onSelect, onDelete }: { rows: RestaurantRecord[]; selectedId?: string; favoriteIds: string[]; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  if (!rows.length) return <EmptyList text="这里还没有餐厅记录。搜索一家餐厅后，就可以加入你的清单。" />;
  return <div className="mt-5 grid gap-3">{rows.map((restaurant) => <div key={restaurant.id} className={`flex items-center gap-4 rounded-2xl border p-4 transition ${selectedId === restaurant.id ? "border-[#E4C8AE] bg-[#FFFBF7]" : "border-line bg-white"}`}><button onClick={() => onSelect(restaurant.id)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold">{restaurant.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin size={13} />{[restaurant.city, restaurant.address].filter(Boolean).join(" · ") || "地址待补充"}</p></button>{favoriteIds.includes(restaurant.id) && <Heart size={16} className="shrink-0 text-[#C76C6C]" fill="currentColor" />}<button onClick={() => onDelete(restaurant.id)} className="shrink-0 text-xs font-bold text-muted hover:text-[#C76C6C]">移除</button></div>)}</div>;
}

function HistoryList({ rows, onSelect }: { rows: Array<{ visit: VisitRecord; restaurant: RestaurantRecord }>; onSelect: (id: string) => void }) {
  if (!rows.length) return <EmptyList text="还没有探店记录。去过一家餐厅后，在详情页记录你的真实体验。" />;
  return <div className="mt-5 grid gap-3">{rows.map(({ visit, restaurant }) => <button key={visit.id} onClick={() => onSelect(restaurant.id)} className="rounded-2xl border border-line p-4 text-left transition hover:border-[#E4C8AE] hover:bg-[#FFFBF7]"><div className="flex items-center justify-between gap-4"><p className="text-sm font-bold">{restaurant.name}</p>{visit.personalRating && <span className="flex items-center gap-1 text-xs font-bold text-[#B26F3C]"><Star size={13} fill="currentColor" />{visit.personalRating}</span>}</div><p className="mt-2 flex items-center gap-1 text-xs text-muted"><CalendarDays size={13} />{visit.visitedAt}{visit.spendPerPerson !== null ? ` · 人均 ¥${visit.spendPerPerson}` : ""}</p>{visit.note && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{visit.note}</p>}</button>)}</div>;
}

function EmptyList({ text }: { text: string }) { return <div className="mt-5 rounded-2xl border border-dashed border-[#D9DEE3] bg-canvas px-5 py-10 text-center text-sm leading-6 text-muted">{text}</div>; }

