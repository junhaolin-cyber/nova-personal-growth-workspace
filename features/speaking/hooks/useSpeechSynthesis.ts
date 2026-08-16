"use client";

import * as React from "react";
import type { SpeakingAccent } from "../types";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [error, setError] = React.useState("");
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  React.useEffect(() => {
    if (!isSupported) return;
    const synthesis = window.speechSynthesis;
    const refreshVoices = () => { voicesRef.current = synthesis.getVoices(); };
    refreshVoices();
    synthesis.addEventListener("voiceschanged", refreshVoices);
    return () => synthesis.removeEventListener("voiceschanged", refreshVoices);
  }, [isSupported]);

  const stop = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = React.useCallback((text: string, accent: SpeakingAccent, speed: "slow" | "normal") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("当前浏览器不支持语音朗读，文字对话仍然可以正常使用。");
      return;
    }
    try {
      const synthesis = window.speechSynthesis;
      const Utterance = window.SpeechSynthesisUtterance;
      if (!Utterance) {
        setError("当前浏览器不支持语音朗读，文字对话仍然可以正常使用。");
        return;
      }
      synthesis.cancel();
      const utterance = new Utterance(text);
      utterance.lang = accent === "uk" ? "en-GB" : "en-US";
      utterance.rate = speed === "slow" ? 0.78 : 0.95;
      utterance.volume = 1;
      utterance.pitch = 1;
      const voices = voicesRef.current.length > 0 ? voicesRef.current : synthesis.getVoices();
      voicesRef.current = voices;
      const preferredLanguage = utterance.lang.toLowerCase();
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === preferredLanguage)
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en-"))
        ?? null;
      utterance.onstart = () => {
        if (utteranceRef.current !== utterance) return;
        setError("");
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setIsSpeaking(false);
        setError("语音朗读暂时不可用。");
      };
      utteranceRef.current = utterance;
      synthesis.resume();
      synthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setError("语音朗读暂时不可用。");
    }
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { speak, stop, isSpeaking, error, isSupported };
}
