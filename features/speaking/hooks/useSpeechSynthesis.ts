"use client";

import * as React from "react";
import type { SpeakingAccent } from "../types";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [error, setError] = React.useState("");
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  const stop = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = React.useCallback((text: string, accent: SpeakingAccent, speed: "slow" | "normal") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("当前浏览器不支持语音朗读，文字对话仍然可以正常使用。");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === "uk" ? "en-GB" : "en-US";
      utterance.rate = speed === "slow" ? 0.78 : 0.95;
      utterance.onstart = () => { setError(""); setIsSpeaking(true); };
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => { setIsSpeaking(false); setError("语音朗读暂时不可用。"); };
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setError("语音朗读暂时不可用。");
    }
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { speak, stop, isSpeaking, error, isSupported };
}
