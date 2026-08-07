"use client";

import * as React from "react";
import { Mic2, Sparkles } from "lucide-react";
import { speakingScenarios } from "./scenarios";
import { simulateSpeakingTurn, getSpeakingHint } from "./aiService";
import { calculateSpeakingStats, getDateKey } from "./stats";
import { buildSessionRecord, createMessage, formatDateLabel } from "./utils";
import { defaultSpeakingSettings, loadSpeakingState, saveSavedExpressions, saveSpeakingDraft, saveSpeakingSessions, saveSpeakingSettings } from "./storage";
import type { SavedExpression, SpeakingMessage, SpeakingScenario, SpeakingSessionRecord, SpeakingSettings } from "./types";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { ConversationPanel } from "./components/ConversationPanel";
import { SavedExpressions } from "./components/SavedExpressions";
import { ScenarioSelector } from "./components/ScenarioSelector";
import { SessionSummary } from "./components/SessionSummary";
import { SpeakingHistory } from "./components/SpeakingHistory";
import { SpeakingOverview } from "./components/SpeakingOverview";
import { SpeakingSettings as SpeakingSettingsPanel } from "./components/SpeakingSettings";
import { THIRD_BATCH_REMOTE_MERGED_EVENT } from "@/features/sync/events";

export function Speaking() {
  const [settings, setSettings] = React.useState<SpeakingSettings>(defaultSpeakingSettings);
  const [sessions, setSessions] = React.useState<SpeakingSessionRecord[]>([]);
  const [expressions, setExpressions] = React.useState<SavedExpression[]>([]);
  const [activeScenarioId, setActiveScenarioId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<SpeakingMessage[]>([]);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [input, setInput] = React.useState("");
  const [hintLevel, setHintLevel] = React.useState(0);
  const [activeSavedExpressionIds, setActiveSavedExpressionIds] = React.useState<string[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastFailedText, setLastFailedText] = React.useState("");
  const [summary, setSummary] = React.useState<SpeakingSessionRecord | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const requestIdRef = React.useRef(0);
  const activeScenario = speakingScenarios.find((scenario) => scenario.id === activeScenarioId) ?? null;
  const stats = React.useMemo(() => calculateSpeakingStats(sessions, expressions), [sessions, expressions]);
  const hint = activeScenario && hintLevel > 0 ? getSpeakingHint(activeScenario, hintLevel) : "";
  const today = getDateKey();

  React.useEffect(() => {
    const stored = loadSpeakingState();
    setSettings(stored.settings);
    setSessions(stored.sessions);
    setExpressions(stored.expressions);
    if (stored.draft) {
      const draftScenario = speakingScenarios.find((scenario) => scenario.id === stored.draft?.scenarioId);
      if (draftScenario) {
        setActiveScenarioId(draftScenario.id);
        setStartedAt(stored.draft.startedAt);
        setMessages(stored.draft.messages);
        setHintLevel(stored.draft.hintLevel);
      }
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    const handleRemoteMerged = () => {
      const stored = loadSpeakingState();
      setSettings(stored.settings);
      setSessions(stored.sessions);
      setExpressions(stored.expressions);
      if (!activeScenarioId && stored.draft) {
        const draftScenario = speakingScenarios.find((scenario) => scenario.id === stored.draft?.scenarioId);
        if (draftScenario) {
          setActiveScenarioId(draftScenario.id);
          setStartedAt(stored.draft.startedAt);
          setMessages(stored.draft.messages);
          setHintLevel(stored.draft.hintLevel);
        }
      }
    };
    window.addEventListener(THIRD_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
    return () => window.removeEventListener(THIRD_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
  }, [activeScenarioId]);

  React.useEffect(() => { if (isHydrated) saveSpeakingSettings(settings); }, [isHydrated, settings]);
  React.useEffect(() => { if (isHydrated) saveSpeakingSessions(sessions); }, [isHydrated, sessions]);
  React.useEffect(() => { if (isHydrated) saveSavedExpressions(expressions); }, [isHydrated, expressions]);
  React.useEffect(() => { if (isHydrated && activeScenarioId && startedAt) saveSpeakingDraft({ scenarioId: activeScenarioId, startedAt, messages, hintLevel }); }, [activeScenarioId, hintLevel, isHydrated, messages, startedAt]);

  React.useEffect(() => {
    if (!startedAt || !activeScenarioId) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [activeScenarioId, startedAt]);

  const handleTranscript = React.useCallback((text: string) => setInput((current) => current ? `${current} ${text}` : text), []);
  const recognition = useSpeechRecognition(handleTranscript, settings.accent);
  const synthesis = useSpeechSynthesis();

  const startSession = (scenario: SpeakingScenario) => {
    requestIdRef.current += 1;
    setSummary(null);
    setActiveScenarioId(scenario.id);
    setStartedAt(new Date().toISOString());
    setElapsedSeconds(0);
    setMessages([createMessage("ai", scenario.opening, scenario.openingTranslation)]);
    setHintLevel(0);
    setActiveSavedExpressionIds([]);
    setInput("");
    setError("");
    setLastFailedText("");
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !activeScenario || isSending) return;
    const requestId = ++requestIdRef.current;
    const userMessage = createMessage("user", trimmed);
    const history = [...messages, userMessage];
    const context = history.slice(-12);
    setMessages(history);
    setInput("");
    setError("");
    setIsSending(true);
    try {
      const response = await simulateSpeakingTurn({ scenario: activeScenario, settings, history: context, userText: trimmed });
      if (requestId !== requestIdRef.current) return;
      const aiMessage = createMessage("ai", response.reply, response.translation);
      setMessages((current) => [...current.slice(0, -1), { ...userMessage, feedback: response.feedback }, aiMessage]);
      setLastFailedText("");
      if (settings.autoRead) synthesis.speak(response.reply, settings.accent, settings.responseSpeed);
    } catch {
      if (requestId === requestIdRef.current) { setError("这次回复没有生成成功，请重试。"); setLastFailedText(trimmed); }
    } finally {
      if (requestId === requestIdRef.current) setIsSending(false);
    }
  };

  const endSession = () => {
    if (!activeScenario || !startedAt) return;
    requestIdRef.current += 1;
    synthesis.stop();
    const record = buildSessionRecord(activeScenario, settings, messages, startedAt, elapsedSeconds);
    const completedRecord = { ...record, savedExpressionIds: activeSavedExpressionIds };
    setSessions((current) => [completedRecord, ...current]);
    setSummary(completedRecord);
    setActiveScenarioId(null);
    setStartedAt(null);
    setMessages([]);
    setElapsedSeconds(0);
    setHintLevel(0);
    setActiveSavedExpressionIds([]);
    setInput("");
    setError("");
    saveSpeakingDraft(null);
  };

  const saveExpression = (message: SpeakingMessage) => {
    if (!activeScenario || !message.feedback) return;
    const expressionId = `expression-${message.id}`;
    if (expressions.some((expression) => expression.id === expressionId)) return;
    const saved: SavedExpression = { id: expressionId, expression: message.feedback.naturalVersion, explanation: message.feedback.explanation, scenarioId: activeScenario.id, scenarioTitle: activeScenario.titleZh, sourceDate: today, originalText: message.text, savedAt: new Date().toISOString() };
    setExpressions((current) => [saved, ...current]);
    setActiveSavedExpressionIds((current) => [...current, expressionId]);
  };

  const handleDeleteSession = (id: string) => setSessions((current) => current.filter((session) => session.id !== id));
  const handleClearSessions = () => { if (window.confirm("确定清空全部口语练习记录吗？此操作不可恢复。")) setSessions([]); };
  const handleCopy = (text: string) => { if (navigator.clipboard) void navigator.clipboard.writeText(text); };
  const handleHint = () => setHintLevel((current) => Math.min(3, current + 1));
  const handleRetry = () => { if (lastFailedText) void sendMessage(lastFailedText); };

  if (!isHydrated) return <div className="mx-auto max-w-[1180px] py-16 text-sm text-muted">正在准备你的口语空间…</div>;

  return <div className="mx-auto max-w-[1180px]"><section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="flex items-center gap-2 text-sm font-semibold text-accent"><Mic2 size={16} />AI 口语</p><h1 className="mt-3 text-[38px] font-extrabold leading-tight tracking-[-0.05em] sm:text-[48px]">今天，也和 AI 说几句</h1><p className="mt-3 text-sm text-muted">{formatDateLabel(today)} · 先表达，再调整，慢慢说得更自然。</p></div><div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#F0D2BB] bg-[#FFF8F2] px-4 py-3 text-xs font-semibold text-[#9C5D32]"><Sparkles size={15} />当前为本地模拟模式</div></section><SpeakingOverview stats={stats} />{summary && !activeScenario ? <SessionSummary session={summary} onBack={() => setSummary(null)} /> : activeScenario ? <ConversationPanel scenario={activeScenario} messages={messages} settings={settings} elapsedSeconds={elapsedSeconds} hint={hint} onHint={handleHint} onSend={() => void sendMessage(input)} onEnd={endSession} input={input} onInputChange={setInput} onSpeak={(text) => synthesis.speak(text, settings.accent, settings.responseSpeed)} isSpeaking={synthesis.isSpeaking} isSending={isSending} error={error} onRetry={handleRetry} onSaveExpression={saveExpression} savedExpressions={expressions} voiceStatus={recognition.status} voiceError={recognition.error || synthesis.error} onVoice={() => recognition.status === "listening" ? recognition.stop() : recognition.start()} /> : <ScenarioSelector scenarios={speakingScenarios} selectedId={activeScenarioId} onStart={startSession} />}<div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_.8fr]"><SpeakingHistory sessions={sessions} scenarios={speakingScenarios} onDelete={handleDeleteSession} onClear={handleClearSessions} /><SavedExpressions expressions={expressions} scenarios={speakingScenarios} onRemove={(id) => setExpressions((current) => current.filter((expression) => expression.id !== id))} onCopy={handleCopy} onSpeak={(text) => synthesis.speak(text, settings.accent, settings.responseSpeed)} /></div><div className="mt-8"><SpeakingSettingsPanel settings={settings} onChange={setSettings} /></div></div>;
}
