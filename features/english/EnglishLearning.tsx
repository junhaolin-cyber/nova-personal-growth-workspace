"use client";

import * as React from "react";
import { BookOpen, Settings2, Sparkles } from "lucide-react";
import { DailyWordSection } from "./components/DailyWordSection";
import { LearningHistory } from "./components/LearningHistory";
import { LearningOverview } from "./components/LearningOverview";
import { RecommendationSection } from "./components/RecommendationSection";
import { ReviewSection } from "./components/ReviewSection";
import { VocabularyBook } from "./components/VocabularyBook";
import { englishWords, recommendationData } from "./mockData";
import { applyWordStatus, isDue } from "./logic/spacedRepetition";
import { createDailyWordPlan, getOrCreateDailyPlan } from "./logic/dailyPlan";
import { buildDailyLearningRecord, getLearningStats } from "./logic/statistics";
import { getDateKey, formatDateLabel } from "./logic/date";
import { createDefaultEnglishState, loadEnglishState, saveEnglishState } from "./storage";
import { speakWord } from "./utils/speech";
import type { Accent, EnglishLearningState, WordProgress, WordStatus } from "./types";

const wordMap = new Map(englishWords.map((word) => [word.id, word]));

function emptyProgress(wordId: string): WordProgress {
  return { wordId, status: "unknown", reviewCount: 0, correctCount: 0, wrongCount: 0, isFavorite: false, isInVocabularyBook: false };
}

export function EnglishLearning() {
  const [today] = React.useState(() => getDateKey());
  const [state, setState] = React.useState<EnglishLearningState>(() => createDefaultEnglishState());
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    const stored = loadEnglishState();
    const plan = getOrCreateDailyPlan(englishWords, stored, today);
    setState(plan === stored.dailyPlans[today] ? stored : { ...stored, dailyPlans: { ...stored.dailyPlans, [today]: plan } });
    setIsHydrated(true);
  }, [today]);

  React.useEffect(() => {
    if (isHydrated) saveEnglishState(state);
  }, [isHydrated, state]);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!isHydrated) {
    return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-muted shadow-card">正在准备今天的学习内容…</div>;
  }

  const plan = state.dailyPlans[today] ?? createDailyWordPlan(englishWords, state, today, state.settings);
  const dailyWords = plan.wordIds.map((id) => wordMap.get(id)).filter((word): word is (typeof englishWords)[number] => Boolean(word));
  const dueWords = englishWords.filter((word) => isDue(state.wordProgress[word.id], today));
  const stats = getLearningStats(state, plan, today);

  const updateWordProgress = (wordId: string, updater: (progress: WordProgress) => WordProgress) => {
    setState((current) => {
      const existing = current.wordProgress[wordId] ?? emptyProgress(wordId);
      return { ...current, wordProgress: { ...current.wordProgress, [wordId]: updater(existing) } };
    });
  };

  const handleStatus = (wordId: string, status: WordStatus, countForToday: boolean) => {
    setState((current) => {
      const progress = applyWordStatus(current.wordProgress[wordId], wordId, status, today);
      const currentPlan = current.dailyPlans[today];
      if (!countForToday || !currentPlan?.wordIds.includes(wordId)) {
        return { ...current, wordProgress: { ...current.wordProgress, [wordId]: progress } };
      }
      const completedWordIds = Array.from(new Set([...currentPlan.completedWordIds, wordId]));
      const nextPlan = { ...currentPlan, completedWordIds, startedAt: currentPlan.startedAt ?? new Date().toISOString(), completedAt: completedWordIds.length >= currentPlan.wordIds.length ? new Date().toISOString() : undefined };
      const nextState = { ...current, wordProgress: { ...current.wordProgress, [wordId]: progress }, dailyPlans: { ...current.dailyPlans, [today]: nextPlan } };
      return { ...nextState, learningRecords: { ...current.learningRecords, [today]: buildDailyLearningRecord(nextState, nextPlan) } };
    });
  };

  const handleDailyStatus = (wordId: string, status: WordStatus) => {
    handleStatus(wordId, status, true);
    setCurrentIndex((index) => Math.min(index + 1, Math.max(0, dailyWords.length - 1)));
  };

  const handleFavorite = (wordId: string) => updateWordProgress(wordId, (progress) => ({ ...progress, isFavorite: !progress.isFavorite }));
  const handleRemoveFromVocabulary = (wordId: string) => updateWordProgress(wordId, (progress) => ({ ...progress, isInVocabularyBook: false }));

  const handleRecommendationState = (id: string, key: "isFavorite" | "isWatched") => {
    setState((current) => {
      const existing = current.recommendationState[id] ?? { isFavorite: false, isWatched: false };
      return { ...current, recommendationState: { ...current.recommendationState, [id]: { ...existing, [key]: !existing[key], lastShownAt: new Date().toISOString() } } };
    });
  };

  const handleSpeak = (word: string, accent: "us" | "uk") => speakWord(word, accent, () => setNotice("当前浏览器不支持发音功能，但不会影响单词学习。"));

  const handleDailyWordCountChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const dailyWordCount = Number(event.target.value);
    setState((current) => {
      const settings = { ...current.settings, dailyWordCount };
      const nextPlan = createDailyWordPlan(englishWords, { ...current, settings }, today, settings);
      const previousPlan = current.dailyPlans[today];
      nextPlan.completedWordIds = previousPlan?.completedWordIds.filter((id) => nextPlan.wordIds.includes(id)) ?? [];
      return { ...current, settings, dailyPlans: { ...current.dailyPlans, [today]: nextPlan } };
    });
    setCurrentIndex(0);
  };

  return (
    <div className="mx-auto max-w-[1240px] space-y-8">
      {notice && <div role="status" className="rounded-2xl border border-[#E8D6B8] bg-[#FFF8EC] px-4 py-3 text-sm font-semibold text-[#8A6C49]">{notice}</div>}
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-accent"><BookOpen size={16} />英语学习</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">每天进步一点点</h1><p className="mt-3 text-sm text-muted">{formatDateLabel(today)} · 先理解，再记住，最后把它用出来。</p></div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm"><Settings2 size={16} className="text-muted" /><label htmlFor="daily-word-count" className="text-sm font-semibold text-muted">每日目标</label><select id="daily-word-count" value={state.settings.dailyWordCount} onChange={handleDailyWordCountChange} className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm font-bold text-ink outline-none"><option value={5}>5 个单词</option><option value={10}>10 个单词</option><option value={15}>15 个单词</option><option value={20}>20 个单词</option><option value={30}>30 个单词</option></select></div>
      </section>

      <LearningOverview stats={stats} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <DailyWordSection words={dailyWords} progress={state.wordProgress} completedWordIds={plan.completedWordIds} currentIndex={currentIndex} accent={state.settings.accent} onFavorite={handleFavorite} onStatus={handleDailyStatus} onSpeak={handleSpeak} onPrevious={() => setCurrentIndex((index) => Math.max(0, index - 1))} onNext={() => setCurrentIndex((index) => Math.min(dailyWords.length - 1, index + 1))} />
        <ReviewSection words={dueWords} progress={state.wordProgress} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <LearningHistory records={state.learningRecords} today={today} currentStreak={stats.currentStreak} totalLearnedCount={stats.totalLearnedCount} totalMasteredCount={stats.totalMasteredCount} />
        <VocabularyBook words={englishWords} progress={state.wordProgress} onStatus={(wordId, status) => handleStatus(wordId, status, false)} onFavorite={handleFavorite} onRemove={handleRemoveFromVocabulary} />
      </div>

      <RecommendationSection items={recommendationData} recommendationState={state.recommendationState} onToggleFavorite={(id) => handleRecommendationState(id, "isFavorite")} onToggleWatched={(id) => handleRecommendationState(id, "isWatched")} />
      <p className="flex items-center justify-center gap-2 pb-4 text-xs text-muted"><Sparkles size={14} className="text-accent" />学习数据保存在当前设备的浏览器中，之后可以无缝接入云端同步。</p>
    </div>
  );
}
