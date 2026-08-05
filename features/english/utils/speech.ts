export function speakWord(word: string, accent: "us" | "uk", onUnsupported: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onUnsupported();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent === "uk" ? "en-GB" : "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

