import { Bookmark, Check, ExternalLink, Eye, EyeOff, Flag, Link2 } from "lucide-react";
import type { NewsArticle } from "../types";
import { categoryTone, formatNewsTime } from "../utils";
import { safeSummaryText } from "../summaryService";

type Props = { article: NewsArticle; showImage: boolean; onFavorite: () => void; onRead: () => void; onTrack: () => void; onDetails: () => void };

export function NewsCard({ article, showImage, onFavorite, onRead, onTrack, onDetails }: Props) {
  return <article className={`rounded-2xl border bg-white p-5 shadow-sm transition ${article.isRead ? "border-line/70 opacity-75" : "border-line hover:border-[#BFC4F4]"}`}>
    <div className="flex gap-4">
      {showImage && article.imageUrl ? <img src={article.imageUrl} alt="" className="hidden size-24 rounded-xl object-cover sm:block" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className={`rounded-md px-2 py-1 font-semibold ${categoryTone(article.category)}`}>{article.category}</span><span>{article.sourceName}</span><span>·</span><span>{formatNewsTime(article.publishedAt)}</span>{article.isRead ? <span className="rounded-md bg-[#F0F1F4] px-2 py-1">已读</span> : null}</div><button onClick={onDetails} className="mt-3 text-left text-lg font-extrabold leading-7 transition hover:text-accent">{article.originalTitle}</button><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{safeSummaryText(article)}</p><div className="mt-4 flex flex-wrap items-center gap-2"><a href={article.articleUrl} target="_blank" rel="noreferrer" onClick={onRead} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-ink hover:text-accent">打开原文 <ExternalLink size={13} /></a><button onClick={onFavorite} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-accent"><Bookmark size={13} fill={article.isFavorite ? "currentColor" : "none"} />{article.isFavorite ? "已收藏" : "收藏"}</button><button onClick={onRead} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-accent">{article.isRead ? <EyeOff size={13} /> : <Eye size={13} />}{article.isRead ? "标为未读" : "标记已读"}</button><button onClick={onTrack} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-accent"><Flag size={13} />追踪事件</button></div></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted"><Link2 size={13} /><span>来源可追溯</span><span>·</span><span>获取时间：{formatNewsTime(article.fetchedAt)}</span>{article.aiSummary?.limitation ? <span className="rounded-md bg-[#FFF6E8] px-2 py-1 text-[#9A774C]">来源摘要整理</span> : null}<Check size={13} className="ml-auto text-[#4F9060]" /><span>未复制完整正文</span></div>
  </article>;
}
