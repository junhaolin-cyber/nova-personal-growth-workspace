import { legacyEnglishWords } from "./mockData";
import type { EnglishWord } from "./types";

export const fallbackEnglishWords: EnglishWord[] = legacyEnglishWords;

let wordBankPromise: Promise<EnglishWord[]> | undefined;

export function loadEnglishWords() {
  if (!wordBankPromise) {
    wordBankPromise = import("./wordBank.generated")
      .then(({ generatedEnglishWords }) => [...fallbackEnglishWords, ...generatedEnglishWords])
      .catch(() => fallbackEnglishWords);
  }
  return wordBankPromise;
}
