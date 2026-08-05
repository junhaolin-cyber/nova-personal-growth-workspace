import { Bookmark, Clock3, Eye, Flame, RefreshCw, Radio, TrendingUp } from "lucide-react";

type Props = { articleCount: number; eventCount: number; unreadCount: number; favoriteCount: number; trackedCount: number; fetchedAt?: string; loading: boolean; onRefresh: () => void };

export function NewsOverview({ articleCount, eventCount, unreadCount, favoriteCount, trackedCount, fetchedAt, loading, onRefresh }: Props) {
  const cards = [
    ["今日新增新闻", articleCount, "今日成功获取的报道"],
    ["重点事件", eventCount, "基础聚合后的事件"],
    ["当前热点", Math.min(eventCount, 5), "按来源与报道数量观察"],
    ["未读内容", unreadCount, "等待你打开查看"],
    ["已收藏", favoriteCount, "仅保存在本机"],
    ["正在追踪", trackedCount, "打开页面时更新"],
  ] as const;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-accent">✦ 把重要的事看清楚，再形成自己的判断</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">新闻资讯</h1><p className="mt-2 text-sm text-muted">关注事实、来源和变化，不让信息噪音替你做判断。</p></div>
      <div className="flex items-center gap-3"><p className="text-xs text-muted">{fetchedAt ? `最近更新 ${new Date(fetchedAt).toLocaleString("zh-CN")}` : "等待更新"}</p><button onClick={onRefresh} disabled={loading} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "更新中" : "刷新新闻"}</button></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value, hint], index) => <div key={label} className="rounded-2xl border border-line bg-white px-5 py-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted">{label}</p>{[Radio, Flame, TrendingUp, Eye, Bookmark, Clock3][index] && (() => { const Icon = [Radio, Flame, TrendingUp, Eye, Bookmark, Clock3][index]; return <Icon size={17} className="text-accent" />; })()}</div><p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-muted">{hint}</p></div>)}
    </div>
  </section>;
}
