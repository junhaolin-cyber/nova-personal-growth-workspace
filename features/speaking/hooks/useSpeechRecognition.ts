"use client";

import * as React from "react";
import type { SpeakingAccent } from "../types";

type RecognitionResult = { 0?: { transcript?: string }; isFinal?: boolean };
type RecognitionEvent = Event & { resultIndex?: number; results: { length: number; [index: number]: RecognitionResult | undefined } };
type RecognitionErrorEvent = Event & { error?: string };
type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => RecognitionInstance;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

export function useSpeechRecognition(onTranscript: (text: string) => void, accent: SpeakingAccent) {
  const recognitionRef = React.useRef<RecognitionInstance | null>(null);
  const [status, setStatus] = React.useState<"idle" | "listening" | "error">("idle");
  const [error, setError] = React.useState("");
  const isSupported = typeof window !== "undefined" && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);

  const stop = React.useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* browser may already have stopped */ }
    setStatus("idle");
  }, []);

  const start = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("当前浏览器不支持语音输入，你仍然可以使用文字输入。");
      setStatus("error");
      return;
    }
    try {
      recognitionRef.current?.abort();
      const recognition = new Constructor();
      recognition.lang = accent === "uk" ? "en-GB" : "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
        const finalTexts: string[] = [];
        for (let index = startIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result?.[0]?.transcript?.trim() ?? "";
          if (text && result?.isFinal) finalTexts.push(text);
        }
        const text = finalTexts.join(" ").trim();
        if (text) onTranscript(text);
      };
      recognition.onerror = (event) => {
        const message = event.error === "not-allowed" ? "麦克风权限被拒绝，可以继续使用文字输入。" : "语音输入暂时不可用，可以继续使用文字输入。";
        setError(message);
        setStatus("error");
      };
      recognition.onstart = () => setStatus("listening");
      recognition.onend = () => setStatus("idle");
      recognitionRef.current = recognition;
      setError("");
      setStatus("listening");
      recognition.start();
    } catch {
      setError("语音输入启动失败，可以继续使用文字输入。");
      setStatus("error");
    }
  }, [accent, onTranscript]);

  React.useEffect(() => () => { try { recognitionRef.current?.abort(); } catch { /* ignore */ } }, []);

  return { start, stop, status, error, isSupported };
}
