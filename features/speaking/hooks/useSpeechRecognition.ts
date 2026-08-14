"use client";

import * as React from "react";
import type { SpeakingAccent } from "../types";

type RecognitionResult = { 0?: { transcript?: string }; isFinal?: boolean };
type RecognitionEvent = Event & { resultIndex?: number; results: { length: number; [index: number]: RecognitionResult | undefined } };
type RecognitionErrorEvent = Event & { error?: string; message?: string };
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
  const transcriptHandlerRef = React.useRef(onTranscript);
  const startingRef = React.useRef(false);
  const [status, setStatus] = React.useState<"idle" | "listening" | "error">("idle");
  const [error, setError] = React.useState("");
  const isSupported = typeof window !== "undefined" && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);

  React.useEffect(() => {
    transcriptHandlerRef.current = onTranscript;
  }, [onTranscript]);

  const stop = React.useCallback(() => {
    startingRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* browser may already have stopped */ }
    setStatus("idle");
  }, []);

  const start = React.useCallback(() => {
    if (typeof window === "undefined" || startingRef.current) return;
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("当前浏览器不支持语音输入，你仍然可以使用文字输入。");
      setStatus("error");
      return;
    }
    try {
      startingRef.current = true;
      const previousRecognition = recognitionRef.current;
      recognitionRef.current = null;
      try { previousRecognition?.abort(); } catch { /* browser may already have stopped */ }
      const recognition = new Constructor();
      recognition.lang = accent === "uk" ? "en-GB" : "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
        const resultTexts: string[] = [];
        for (let index = startIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result?.[0]?.transcript?.trim() ?? "";
          if (text) resultTexts.push(text);
        }
        const text = resultTexts.join(" ").trim();
        if (text) transcriptHandlerRef.current(text);
      };
      recognition.onerror = (event) => {
        startingRef.current = false;
        const errorCode = event.error?.trim() || "unknown";
        const message = errorCode === "not-allowed"
          ? "麦克风权限被拒绝，可以继续使用文字输入。"
          : `语音输入暂时不可用（${errorCode}），可以继续使用文字输入。`;
        setError(message);
        setStatus("error");
      };
      recognition.onstart = () => {
        startingRef.current = false;
        setStatus("listening");
      };
      recognition.onend = () => {
        startingRef.current = false;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
          setStatus("idle");
        }
      };
      recognitionRef.current = recognition;
      setError("");
      recognition.start();
    } catch {
      startingRef.current = false;
      setError("语音输入启动失败，可以继续使用文字输入。");
      setStatus("error");
    }
  }, [accent]);

  React.useEffect(() => () => {
    startingRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
  }, []);

  return { start, stop, status, error, isSupported };
}
