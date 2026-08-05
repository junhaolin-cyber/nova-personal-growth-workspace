"use client";

import * as React from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock3, Sparkles } from "lucide-react";
import { financeBriefs } from "./briefData";
import { FinanceBriefSection } from "./components/FinanceBriefSection";
import { DailyReflection } from "./components/DailyReflection";
import { DailyKnowledge } from "./components/DailyKnowledge";
import { FinanceCoach } from "./components/FinanceCoach";
import { FinanceDisclaimer } from "./components/FinanceDisclaimer";
import { FinanceHistory } from "./components/FinanceHistory";
import { FinanceLibrary } from "./components/FinanceLibrary";
import { FinanceOverview } from "./components/FinanceOverview";
import { FinanceSettings } from "./components/FinanceSettings";
import { KnowledgeQuiz } from "./components/KnowledgeQuiz";
import { financeKnowledge, financeKnowledgeMap } from "./knowledgeData";
import { createFinanceDailyPlan, getFinanceDateKey } from "./dailyPlan";
import { getFinanceCoachReply } from "./coach";
import { updateFinanceProgress, markQuizResult } from "./review";
import { buildFinanceHistory, getFinanceStats } from "./stats";
import { createDefaultFinanceState, loadFinanceState, saveFinanceState } from "./storage";
import type { FinanceLearningState, FinanceKnowledgeStatus, FinanceReflection } from "./types";

function getBriefForDate(date: string) {
  const offset = Array.from(date).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return financeBriefs[offset % financeBriefs.length];
}

export function FinanceLearning() {
  const [today] = React.useState(() => getFinanceDateKey());
  const [state, setState] = React.useState<FinanceLearningState>(() => createDefaultFinanceState());
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    const stored = loadFinanceState();
    const plan = createFinanceDailyPlan(financeKnowledge, stored, today, stored.settings);
    setState(plan === stored.dailyPlans[today] ? stored : { ...stored, dailyPlans: { ...stored.dailyPlans, [today]: plan } });
    setExpanded(stored.settings.detailExpanded);
    setIsHydrated(true);
  }, [today]);

  React.useEffect(() => { if (isHydrated) saveFinanceState(state); }, [isHydrated, state]);
  React.useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);

  if (!isHydrated) return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-muted shadow-card">正在准备理财学习内容…</div>;

  const plan = state.dailyPlans[today] ?? createFinanceDailyPlan(financeKnowledge, state, today, state.settings);
  const currentKnowledge = financeKnowledgeMap.get(plan.knowledgeIds[currentIndex]) ?? financeKnowledgeMap.get(plan.knowledgeIds[0]);
  const stats = getFinanceStats(state, plan, today);
  const brief = getBriefForDate(today);
  if (!currentKnowledge) return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white p-10 text-center text-sm text-muted">暂时没有可学习的知识点。</div>;

  const updateCurrentHistory = (nextState: FinanceLearningState, nextPlan = nextState.dailyPlans[today]) => ({ ...nextState, history: { ...nextState.history, [today]: buildFinanceHistory(nextState, nextPlan, today) } });

  const handleStatus = (status: FinanceKnowledgeStatus) => {
    setState((current) => {
      const nextProgress = updateFinanceProgress(current.progress[currentKnowledge.id], currentKnowledge.id, status, today);
      const currentPlan = current.dailyPlans[today] ?? plan;
      const completedKnowledgeIds = status === "未开始" ? currentPlan.completedKnowledgeIds.filter((id) => id !== currentKnowledge.id) : Array.from(new Set([...currentPlan.completedKnowledgeIds, currentKnowledge.id]));
      const nextPlan = { ...currentPlan, completedKnowledgeIds, startedAt: currentPlan.startedAt ?? new Date().toISOString(), completedAt: completedKnowledgeIds.length === currentPlan.knowledgeIds.length ? new Date().toISOString() : undefined };
      return updateCurrentHistory({ ...current, progress: { ...current.progress, [currentKnowledge.id]: nextProgress }, dailyPlans: { ...current.dailyPlans, [today]: nextPlan } }, nextPlan);
    });
    setNotice("学习状态已保存");
    setCurrentIndex((index) => Math.min(index + 1, Math.max(0, plan.knowledgeIds.length - 1)));
  };

  const handleQuizAnswer = (questionId: string, selectedAnswer: string, correct: boolean) => {
    setState((current) => {
      const attempt = { id: `${today}-${currentKnowledge.id}-${questionId}`, date: today, knowledgeId: currentKnowledge.id, questionId, selectedAnswer, correct };
      const attempts = [...current.quizAttempts.filter((item) => item.id !== attempt.id), attempt];
      const quizDone = currentKnowledge.quiz.every((question) => attempts.some((item) => item.date === today && item.questionId === question.id));
      const currentPlan = current.dailyPlans[today] ?? plan;
      const completedQuizIds = quizDone ? Array.from(new Set([...currentPlan.completedQuizIds, currentKnowledge.id])) : currentPlan.completedQuizIds;
      const nextPlan = { ...currentPlan, completedQuizIds };
      const progress = markQuizResult(current.progress[currentKnowledge.id], currentKnowledge.id, correct, today);
      return updateCurrentHistory({ ...current, quizAttempts: attempts, progress: { ...current.progress, [currentKnowledge.id]: progress }, dailyPlans: { ...current.dailyPlans, [today]: nextPlan } }, nextPlan);
    });
  };

  const handleFavorite = (knowledgeId: string = currentKnowledge.id) => {
    const item = financeKnowledgeMap.get(knowledgeId);
    if (!item) return;
    setState((current) => {
      const existing = current.progress[knowledgeId] ?? { knowledgeId, status: "未开始" as FinanceKnowledgeStatus, reviewCount: 0, correctCount: 0, wrongCount: 0, completedCount: 0, isFavorite: false };
      const isFavorite = !existing.isFavorite;
      const favorites = { ...current.favorites };
      if (isFavorite) favorites[knowledgeId] = { id: knowledgeId, type: "knowledge", title: item.title, createdAt: new Date().toISOString() };
      else delete favorites[knowledgeId];
      return { ...current, progress: { ...current.progress, [knowledgeId]: { ...existing, isFavorite } }, favorites };
    });
  };

  const handleLibraryStatus = (knowledgeId: string, status: FinanceKnowledgeStatus) => {
    setState((current) => ({ ...current, progress: { ...current.progress, [knowledgeId]: updateFinanceProgress(current.progress[knowledgeId], knowledgeId, status, today) } }));
  };

  const handleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setNotice("当前浏览器不支持朗读，但不影响学习功能。 "); return; }
    const utterance = new SpeechSynthesisUtterance(`${currentKnowledge.title}。${currentKnowledge.summary}`);
    utterance.lang = "zh-CN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveReflection = (content: string) => { const reflection: FinanceReflection = { date: today, content: content.trim(), updatedAt: new Date().toISOString() }; setState((current) => ({ ...current, reflections: { ...current.reflections, [today]: reflection } })); setNotice("今日反思已保存"); };
  const handleDeleteReflection = () => { setState((current) => { const reflections = { ...current.reflections }; delete reflections[today]; return { ...current, reflections }; }); };
  const handleClearHistory = () => { if (!window.confirm("只清空理财学习历史记录、答题记录和反思，不会影响今日计划、英语学习和 AI 口语。确定继续吗？")) return; setState((current) => ({ ...current, history: {}, quizAttempts: [], reflections: {} })); setNotice("理财学习历史已清空"); };

  return <div className="mx-auto max-w-[1240px] space-y-8">
    {notice && <div role="status" className="rounded-2xl border border-[#D9D1F1] bg-[#F5F3FA] px-4 py-3 text-sm font-semibold text-[#685894]">{notice}</div>}
    <section className="flex flex-wrap items-end justify-between gap-6"><div><p className="flex items-center gap-2 text-sm font-bold text-[#7567B6]"><BookOpen size={16} />理财学习</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">把财务概念学成判断力</h1><p className="mt-3 text-sm text-muted">{today} · 每天理解一个原理，慢慢建立自己的财务语言。</p></div><div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-muted shadow-sm"><Clock3 size={16} />每天约 {state.settings.dailyMinutes} 分钟</div></section>
    <FinanceDisclaimer />
    <FinanceOverview stats={stats} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]"><div className="space-y-6"><DailyKnowledge knowledge={currentKnowledge} progress={state.progress[currentKnowledge.id]} index={currentIndex} total={plan.knowledgeIds.length} expanded={expanded} onExpandedChange={setExpanded} onStatus={handleStatus} onFavorite={() => handleFavorite()} onPrevious={() => setCurrentIndex((index) => Math.max(0, index - 1))} onNext={() => setCurrentIndex((index) => Math.min(plan.knowledgeIds.length - 1, index + 1))} onSpeak={handleSpeech} /><KnowledgeQuiz key={currentKnowledge.id} knowledge={currentKnowledge} completedQuestionIds={plan.completedQuizIds} onAnswer={handleQuizAnswer} /></div><div className="space-y-6"><FinanceCoach knowledge={currentKnowledge} onReply={getFinanceCoachReply} /><DailyReflection date={today} reflection={state.reflections[today]} onSave={handleSaveReflection} onDelete={handleDeleteReflection} /></div></div>
    {state.settings.showBrief && <FinanceBriefSection brief={brief} />}
    <FinanceLibrary knowledge={financeKnowledge} progress={state.progress} onSelect={(id) => { const index = plan.knowledgeIds.indexOf(id); if (index >= 0) setCurrentIndex(index); else setNotice("这个知识点不在今天任务中，可先在知识库修改学习状态。"); }} onStatus={handleLibraryStatus} onFavorite={handleFavorite} />
    <FinanceHistory history={state.history} currentStreak={stats.currentStreak} longestStreak={stats.longestStreak} totalStudyMinutes={stats.totalStudyMinutes} totalCompletedKnowledge={stats.totalCompletedKnowledge} onClear={handleClearHistory} />
    <FinanceSettings settings={state.settings} onChange={(settings) => setState((current) => ({ ...current, settings }))} />
    <p className="flex items-center justify-center gap-2 pb-4 text-xs text-muted"><Sparkles size={14} className="text-[#7567B6]" />理财学习数据保存在当前设备浏览器中，后续可独立接入云端同步。</p>
  </div>;
}
