"use client";

import { ExternalLink, Heart, MapPin, Phone, Utensils, Warehouse } from "lucide-react";
import { createPublicSearchUrl } from "../service";
import type { RestaurantRecord } from "../types";

interface RestaurantDetailProps {
  restaurant: RestaurantRecord;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onStatusChange: (status: RestaurantRecord["status"]) => void;
  onVisit: () => void;
}

export function RestaurantDetail({ restaurant, isFavorite, onToggleFavorite, onStatusChange, onVisit }: RestaurantDetailProps) {
  const phone = restaurant.phone ?? "暂无公开资料";
  const rating = typeof restaurant.rating === "number" ? `高德评分 ${restaurant.rating}` : "暂无公开资料";
  const category = restaurant.category ?? "暂无公开资料";
  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold tracking-[0.12em] text-[#C07C3F]">门店档案</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">{restaurant.name}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{[restaurant.city, restaurant.address].filter(Boolean).join(" · ") || "暂未填写地址"}</p></div><button onClick={onToggleFavorite} className={`grid size-10 place-items-center rounded-xl border transition ${isFavorite ? "border-[#E5B7B7] bg-[#FFF3F3] text-[#C76C6C]" : "border-line bg-white text-muted hover:text-[#C76C6C]"}`} aria-label={isFavorite ? "取消收藏" : "收藏餐厅"}><Heart size={18} fill={isFavorite ? "currentColor" : "none"} /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><InfoItem icon={<Warehouse size={16} />} label="营业时间" value={restaurant.openingHours ?? "暂无公开资料"} /><InfoItem icon={<Utensils size={16} />} label="菜系与推荐菜" value={category} /><InfoItem icon={<Phone size={16} />} label="电话与评分" value={`${phone} · ${rating}`} /></div><div className="mt-5 rounded-2xl border border-[#F0E8DE] bg-[#FFFBF7] p-4"><p className="text-xs font-bold text-[#8F6D4C]">信息来源</p><p className="mt-2 text-sm leading-6 text-muted">{restaurant.sourceLabel}。当前页面不会把未核验的信息展示成真实门店数据。{restaurant.queriedAt ? ` 查询时间：${restaurant.queriedAt}` : ""}</p><div className="mt-3 flex flex-wrap gap-2"><PublicLink href={createPublicSearchUrl("dianping", restaurant)} label="查看大众点评搜索" /><PublicLink href={createPublicSearchUrl("maps", restaurant)} label="查看 Google Maps 搜索" /><PublicLink href={createPublicSearchUrl("amap", restaurant)} label="查看高德搜索" /></div></div><div className="mt-5 rounded-2xl border border-dashed border-[#D9DEE3] bg-canvas p-4"><p className="text-sm font-bold">公开评价</p><p className="mt-2 text-sm leading-6 text-muted">暂无合法接入的公开评分、评价数量和热门菜品数据。请使用上方平台入口自行核验，NOVA 不会生成或冒充第三方评价。</p></div><div className="mt-6 flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-bold text-muted">我的状态</span><StatusButton active={restaurant.status === "considering"} onClick={() => onStatusChange("considering")}>暂不考虑</StatusButton><StatusButton active={restaurant.status === "want"} onClick={() => onStatusChange("want")}>想去</StatusButton><StatusButton active={restaurant.status === "visited"} onClick={() => onStatusChange("visited")}>已去过</StatusButton><button onClick={onVisit} className="ml-auto rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2A2D32]">记录探店</button></div></section>;
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-canvas p-4"><p className="flex items-center gap-2 text-xs font-bold text-muted">{icon}{label}</p><p className="mt-3 text-sm font-semibold">{value}</p></div>; }
function PublicLink({ href, label }: { href: string; label: string }) { return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7D9CC] bg-white px-2.5 py-2 text-xs font-semibold text-[#8F6D4C] transition hover:border-[#C07C3F] hover:text-[#C07C3F]">{label}<ExternalLink size={12} /></a>; }
function StatusButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${active ? "bg-[#F8E7D4] text-[#A76532]" : "bg-canvas text-muted hover:text-ink"}`}>{children}</button>; }
