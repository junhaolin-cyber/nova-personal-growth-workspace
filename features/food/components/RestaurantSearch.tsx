"use client";

import * as React from "react";
import { ExternalLink, Link2, MapPin, Search, Sparkles } from "lucide-react";
import type { RestaurantRecord, RestaurantSearchInput } from "../types";

interface RestaurantSearchProps {
  input: RestaurantSearchInput;
  results: RestaurantRecord[];
  onChange: (input: RestaurantSearchInput) => void;
  onSearch: () => void;
  onSelect: (id: string) => void;
  isSearching?: boolean;
  selectedRestaurant?: RestaurantRecord;
  onOfficialEnrich?: (url: string) => void;
  isOfficialEnriching?: boolean;
}

function validateOfficialUrl(value: string): string | undefined {
  if (!value.trim()) return "请输入官网链接。";
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "http:" && url.protocol !== "https:") return "只允许使用 http 或 https 链接。";
    if (url.username || url.password) return "链接不能包含账号或密码。";
    if (url.port && url.port !== "80" && url.port !== "443") return "只支持标准网页端口。";
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".home.arpa")) return "不允许读取本机、局域网或内网地址。";
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname) || hostname === "0.0.0.0" || hostname === "::1") return "不允许读取本机、局域网或内网地址。";
    return undefined;
  } catch {
    return "链接格式错误，请输入完整的官网地址。";
  }
}

export function RestaurantSearch({ input, results, onChange, onSearch, onSelect, isSearching = false, selectedRestaurant, onOfficialEnrich, isOfficialEnriching = false }: RestaurantSearchProps) {
  const [showOfficialInput, setShowOfficialInput] = React.useState(false);
  const [officialUrl, setOfficialUrl] = React.useState("");
  const [officialUrlTouched, setOfficialUrlTouched] = React.useState(false);
  const officialUrlError = validateOfficialUrl(officialUrl);
  const canShowOfficialEntry = selectedRestaurant?.sourceProvider === "amap" && Boolean(onOfficialEnrich);
  const savedOfficialUrl = selectedRestaurant?.officialSource?.sourceUrl;

  React.useEffect(() => {
    setShowOfficialInput(false);
    setOfficialUrlTouched(false);
    setOfficialUrl(savedOfficialUrl ?? "");
  }, [selectedRestaurant?.id, savedOfficialUrl]);

  const submitOfficialUrl = () => {
    setOfficialUrlTouched(true);
    if (officialUrlError || !onOfficialEnrich) return;
    onOfficialEnrich(officialUrl.trim());
  };

  return <section className="rounded-[24px] border border-[#E5D9CA] bg-[#FFFBF7] p-6 shadow-card sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="flex items-center gap-2 text-sm font-bold text-[#C07C3F]"><Sparkles size={16} />AI 探店助手</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">先输入一家餐厅</h2><p className="mt-2 text-sm leading-6 text-muted">先保存你想了解的门店，再补充真实体验。当前不会虚构评分、评论或菜单信息。</p></div><div className="grid size-11 place-items-center rounded-2xl bg-[#F8E7D4] text-[#C07C3F]"><MapPin size={21} /></div></div>
    <div className="mt-6 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"><input value={input.name} onChange={(event) => onChange({ ...input, name: event.target.value })} onKeyDown={(event) => event.key === "Enter" && onSearch()} className="form-input" placeholder="餐厅名称" aria-label="餐厅名称" /><input value={input.address} onChange={(event) => onChange({ ...input, address: event.target.value })} className="form-input" placeholder="地址（可选）" aria-label="地址" /><input value={input.city} onChange={(event) => onChange({ ...input, city: event.target.value })} className="form-input" placeholder="城市（可选）" aria-label="城市" /><button onClick={onSearch} disabled={isSearching || !input.name.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A2D32] disabled:cursor-not-allowed disabled:opacity-40"><Search size={16} />{isSearching ? "搜索中…" : "搜索"}</button></div>
    {results.length > 0 && <div className="mt-5 border-t border-[#EEE2D8] pt-5"><p className="mb-3 text-xs font-bold text-muted">已找到的门店</p><div className="flex flex-wrap gap-2">{results.map((restaurant) => <button key={restaurant.id} onClick={() => onSelect(restaurant.id)} className="rounded-xl border border-[#E7D9CC] bg-white px-3 py-2 text-left text-sm font-semibold transition hover:border-[#C07C3F] hover:text-[#C07C3F]"><span>{restaurant.name}</span><span className="ml-2 text-xs font-normal text-muted">{restaurant.city || "未填写城市"}</span></button>)}</div></div>}
    {canShowOfficialEntry && <div className="mt-5 border-t border-[#EEE2D8] pt-5">
      <button type="button" onClick={() => setShowOfficialInput((current) => !current)} className="flex items-center gap-2 text-xs font-bold text-[#95633C] transition hover:text-[#C07C3F]"><Link2 size={14} />{showOfficialInput ? "收起官网资料" : "添加官网资料"}</button>
      {savedOfficialUrl && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted"><span>{selectedRestaurant?.officialSource?.status === "success" ? "已记录官网来源" : "已保留官网链接，读取未完成"}</span><a href={savedOfficialUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-[#95633C] hover:text-[#C07C3F]">打开官网 <ExternalLink size={12} /></a></div>}
      {showOfficialInput && <div className="mt-4 rounded-2xl border border-[#E7D9CC] bg-white/80 p-4">
        <p className="text-xs leading-5 text-muted">仅读取公开可访问的餐厅或品牌官网，不读取需要登录、验证码或受限平台的内容。</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="url" value={officialUrl} onChange={(event) => { setOfficialUrl(event.target.value); setOfficialUrlTouched(true); }} className="form-input min-w-0 flex-1" placeholder="https://官网地址" aria-label="餐厅官网链接" aria-invalid={Boolean(officialUrlTouched && officialUrlError)} /><button type="button" onClick={submitOfficialUrl} disabled={isOfficialEnriching || Boolean(officialUrlError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2A2D32] disabled:cursor-not-allowed disabled:opacity-40">{isOfficialEnriching ? "读取中…" : "读取/补充资料"}</button></div>
        {officialUrlTouched && officialUrlError && <p role="alert" className="mt-2 text-xs font-semibold text-[#B15D4B]">{officialUrlError}</p>}
        {selectedRestaurant?.officialSource?.status === "failed" && selectedRestaurant.officialSource.message && <p role="status" className="mt-2 text-xs leading-5 text-[#95633C]">{selectedRestaurant.officialSource.message} 你仍可以点击“打开官网”手动查看。</p>}
      </div>}
    </div>}
  </section>;
}
