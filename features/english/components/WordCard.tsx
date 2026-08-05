import * as React from "react";
import { Bookmark, Check, ChevronDown, ChevronUp, Headphones, Volume2 } from "lucide-react";
import { wordStatusLabels, wordStatusTones } from "../logic/spacedRepetition";
import type { Accent, EnglishWord, WordProgress, WordStatus } from "../types";

export function WordCard({ word, progress, accent, onFavorite, onStatus, onSpeak }: { word: EnglishWord; progress?: WordProgress; accent: Accent; onFavorite: () => void; onStatus: (status: WordStatus) => void; onSpeak: (accent: "us" | "uk") => void }) {
  const [isRevealed, setIsRevealed] = React.useState(false);
  React.useEffect(() => setIsRevealed(false), [word.id]);
  const activeAccent = accent === "uk" ? "uk" : "us";

  return (
    <article className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
      <div className="border-b border-line bg-gradient-to-br from-[#F6F5FF] via-white to-[#F1F7F3] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">今日单词</p>
            <h3 className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">{word.word}</h3>
            <p className="mt-3 font-sans text-lg text-muted">{word.phonetic}</p>
          </div>
          <button onClick={onFavorite} className={`grid size-10 place-items-center rounded-xl transition ${progress?.isFavorite ? "bg-[#F8EBD8] text-[#AD753C]" : "bg-white text-muted hover:bg-canvas"}`} aria-label={progress?.isFavorite ? "取消收藏" : "收藏单词"}>
            <Bookmark size={19} fill={progress?.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          <button onClick={() => onSpeak("uk")} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:-translate-y-0.5"><Volume2 size={15} />英式发音</button>
          <button onClick={() => onSpeak("us")} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:-translate-y-0.5"><Headphones size={15} />美式发音</button>
          <span className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-muted">{word.topic}</span>
          <span className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-muted">{word.difficulty === "beginner" ? "初级" : word.difficulty === "intermediate" ? "中级" : "高级"}</span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {!isRevealed ? (
          <div className="flex min-h-[178px] flex-col items-center justify-center text-center">
            <p className="text-sm text-muted">先想一想这个单词的意思，再查看释义。</p>
            <button onClick={() => setIsRevealed(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-card"><ChevronDown size={17} />查看释义</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><p className="text-xs font-semibold text-muted">中文释义</p><p className="mt-2 text-lg font-bold">{word.meaningZh}</p></div>
              <div><p className="text-xs font-semibold text-muted">英文释义</p><p className="mt-2 text-sm leading-6 text-ink">{word.definitionEn}</p></div>
            </div>
            <div className="rounded-2xl bg-canvas px-5 py-4"><p className="text-xs font-semibold text-muted">例句</p><p className="mt-2 font-sans text-base font-semibold leading-7">{word.exampleSentence}</p><p className="mt-1 text-sm leading-6 text-muted">{word.exampleTranslation}</p></div>
            <div><p className="text-xs font-semibold text-muted">常用搭配 · {word.partOfSpeech}</p><div className="mt-3 flex flex-wrap gap-2">{word.collocations.map((item) => <span key={item} className="rounded-lg bg-[#F1F0FF] px-3 py-1.5 text-xs font-semibold text-[#5E5CE6]">{item}</span>)}</div></div>
            <div><p className="mb-3 text-sm font-bold">你对这个单词的掌握程度</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(wordStatusLabels) as WordStatus[]).map((status) => <button key={status} onClick={() => onStatus(status)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${progress?.status === status ? wordStatusTones[status] : "bg-canvas text-muted hover:bg-[#F1F0FF] hover:text-accent"}`}>{progress?.status === status && <Check size={14} />}{wordStatusLabels[status]}</button>)}</div></div>
            <button onClick={() => setIsRevealed(false)} className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ChevronUp size={15} />收起释义</button>
          </div>
        )}
      </div>
      <span className="sr-only">当前发音：{activeAccent === "uk" ? "英式" : "美式"}</span>
    </article>
  );
}

