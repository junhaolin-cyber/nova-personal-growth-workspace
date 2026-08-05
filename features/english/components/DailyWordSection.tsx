import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { WordCard } from "./WordCard";
import type { Accent, EnglishWord, WordProgress, WordStatus } from "../types";

export function DailyWordSection({ words, progress, completedWordIds, currentIndex, accent, onFavorite, onStatus, onSpeak, onPrevious, onNext }: { words: EnglishWord[]; progress: Record<string, WordProgress>; completedWordIds: string[]; currentIndex: number; accent: Accent; onFavorite: (wordId: string) => void; onStatus: (wordId: string, status: WordStatus) => void; onSpeak: (word: string, accent: "us" | "uk") => void; onPrevious: () => void; onNext: () => void }) {
  const currentWord = words[currentIndex];
  if (!currentWord) return <section className="rounded-[24px] border border-line bg-white p-8 text-center shadow-card"><BookOpen className="mx-auto mb-4 text-muted" size={30} /><p className="font-semibold">今天还没有学习单词</p><p className="mt-2 text-sm text-muted">重新打开页面后会自动生成每日单词。</p></section>;
  const completion = words.length ? Math.round((completedWordIds.length / words.length) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold text-accent"><BookOpen size={15} />每日单词</div><h2 className="mt-2 text-2xl font-extrabold">把今天的单词学扎实</h2></div><div className="text-right"><p className="text-xs text-muted">当前进度</p><p className="mt-1 text-lg font-extrabold">{Math.min(currentIndex + 1, words.length)} / {words.length}</p></div></div>
      <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9EDF3]"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion}%` }} /></div><span className="min-w-[45px] text-right text-xs font-semibold text-muted">{completion}%</span></div>
      <WordCard word={currentWord} progress={progress[currentWord.id]} accent={accent} onFavorite={() => onFavorite(currentWord.id)} onStatus={(status) => onStatus(currentWord.id, status)} onSpeak={(selectedAccent) => onSpeak(currentWord.word, selectedAccent)} />
      <div className="flex items-center justify-between"><button onClick={onPrevious} disabled={currentIndex === 0} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} />上一个</button><div className="flex items-center gap-2 text-xs text-muted">{progress[currentWord.id]?.lastLearnedAt && <><CheckCircle2 size={15} className="text-[#43845D]" />已记录</>}</div><button onClick={onNext} disabled={currentIndex >= words.length - 1} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">下一个<ArrowRight size={16} /></button></div>
    </section>
  );
}
