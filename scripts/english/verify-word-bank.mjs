import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const typescript = require("typescript");

function installTypeScriptRequireHook() {
  const compile = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = typescript.transpileModule(source, {
      compilerOptions: {
        target: typescript.ScriptTarget.ES2019,
        module: typescript.ModuleKind.CommonJS,
        jsx: typescript.JsxEmit.Preserve,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    module._compile(output, filename);
  };
  require.extensions[".ts"] = compile;
  require.extensions[".tsx"] = compile;
}

function loadProjectModule(relativePath) {
  installTypeScriptRequireHook();
  return require(path.join(root, relativePath));
}

function makeProgress(wordId, status, date, nextReviewAt = date) {
  return { wordId, status, firstLearnedAt: date, lastLearnedAt: date, nextReviewAt, reviewCount: 1, correctCount: 0, wrongCount: 1, isFavorite: false, isInVocabularyBook: true };
}

function makeState(date, dailyWordCount = 20) {
  return { version: 1, settings: { dailyWordCount, accent: "us" }, dailyPlans: {}, wordProgress: {}, learningRecords: {}, recommendationState: {} };
}

function assertPlanShape(plan, words, expectedCount) {
  assert.equal(plan.wordIds.length, expectedCount);
  assert.equal(new Set(plan.wordIds).size, plan.wordIds.length, "daily plan IDs must be unique");
  const wordMap = new Map(words.map((word) => [word.id, word]));
  const visibleWords = plan.wordIds.map((wordId) => wordMap.get(wordId)).filter(Boolean);
  assert.equal(visibleWords.length, plan.wordIds.length, "page mapping must not drop plan IDs");
  return visibleWords;
}

const { legacyEnglishWords } = loadProjectModule("features/english/mockData.ts");
const { generatedEnglishWords, generatedEnglishWordSources, generatedEnglishWordBuild } = loadProjectModule("features/english/wordBank.generated.ts");
const { createDailyWordPlan, getOrCreateDailyPlan } = loadProjectModule("features/english/logic/dailyPlan.ts");
const { loadEnglishWords } = loadProjectModule("features/english/wordBank.ts");
const englishWords = [...legacyEnglishWords, ...generatedEnglishWords];
const loadedEnglishWords = await loadEnglishWords();

assert.equal(legacyEnglishWords.length, 72, "the legacy vocabulary must contain 72 words");
assert.deepEqual(legacyEnglishWords.map(({ id }) => id), Array.from({ length: 72 }, (_, index) => `word-${String(index + 1).padStart(3, "0")}`), "legacy word IDs changed");
assert.deepEqual(englishWords.slice(0, 72), legacyEnglishWords, "legacy words must remain first and unchanged at runtime");
assert.deepEqual(loadedEnglishWords, englishWords, "the runtime word-bank loader must return the full local bank");
assert.equal(generatedEnglishWords.length, generatedEnglishWordBuild.acceptedCount);
assert.equal(englishWords.length, 72 + generatedEnglishWords.length);

const allIds = new Set();
const wordAndPartOfSpeech = new Set();
for (const word of englishWords) {
  assert.equal(typeof word.id, "string");
  assert.ok(word.id.length > 0);
  assert.ok(!allIds.has(word.id), `duplicate word ID: ${word.id}`);
  allIds.add(word.id);
  assert.ok(word.word.length > 0 && word.phonetic.length > 0 && word.meaningZh.length > 0 && word.definitionEn.length > 0 && word.partOfSpeech.length > 0);
  assert.ok(Array.isArray(word.collocations));
  assert.ok(word.exampleSentence.length > 0 && word.exampleTranslation.length > 0);
  assert.ok(["beginner", "intermediate", "advanced"].includes(word.difficulty));
  assert.ok(typeof word.topic === "string" && word.topic.length > 0);
  const key = `${word.word.toLowerCase()}|${word.partOfSpeech.toLowerCase()}`;
  assert.ok(!wordAndPartOfSpeech.has(key), `duplicate word/part-of-speech: ${key}`);
  wordAndPartOfSpeech.add(key);
}

const generatedIds = new Set(generatedEnglishWords.map((word) => word.id));
assert.deepEqual(new Set(Object.keys(generatedEnglishWordSources)), generatedIds, "source mapping is incomplete");
for (const word of generatedEnglishWords) {
  const expectedId = `word-bank-${crypto.createHash("sha256").update(`${word.word.toLowerCase()}|${word.partOfSpeech.toLowerCase()}`).digest("hex").slice(0, 16)}`;
  assert.equal(word.id, expectedId, `unstable generated ID for ${word.word}`);
  const source = generatedEnglishWordSources[word.id];
  assert.ok(source.frequency === "ngsl-1.2" || source.frequency === "ngsl-gr-1.0");
  assert.ok(source.definition === "NGSL" || source.definition === "ECDICT" || source.definition === "OEWN");
  assert.equal(source.meaningZh, "ECDICT");
  assert.ok(source.pronunciation === "ECDICT" || source.pronunciation === "ipa-dict");
  assert.equal(source.example, "Tatoeba");
}

const date = "2026-10-26";
const state = makeState(date, 20);
const knownIds = englishWords.slice(0, 35).map((word) => word.id);
knownIds.forEach((wordId, index) => { state.wordProgress[wordId] = makeProgress(wordId, index % 2 ? "known" : "mastered", "2026-10-20", "2026-11-01"); });
const dueUnknownId = englishWords[35].id;
const dueFuzzyId = englishWords[36].id;
const notDueUnknownId = englishWords[37].id;
state.wordProgress[dueUnknownId] = makeProgress(dueUnknownId, "unknown", "2026-10-20", date);
state.wordProgress[dueFuzzyId] = makeProgress(dueFuzzyId, "fuzzy", "2026-10-20", date);
state.wordProgress[notDueUnknownId] = makeProgress(notDueUnknownId, "unknown", "2026-10-20", "2026-11-01");
const plan = createDailyWordPlan(englishWords, state, date, state.settings);
assertPlanShape(plan, englishWords, 20);
assert.ok(plan.wordIds.includes(dueUnknownId) && plan.wordIds.includes(dueFuzzyId), "due unknown/fuzzy words must enter review");
assert.ok(!plan.wordIds.includes(notDueUnknownId), "not-due unknown/fuzzy words must not enter review");
assert.ok(plan.wordIds.every((wordId) => !knownIds.includes(wordId)), "known/mastered words must not be new plan words");
const repeatedPlans = [1, 2, 3].map(() => createDailyWordPlan(englishWords, state, date, state.settings));
assert.deepEqual(repeatedPlans[0], plan, "same-day plan must be stable");
assert.deepEqual(repeatedPlans[1], plan, "same-day plan must stay stable on the second call");
assert.deepEqual(repeatedPlans[2], plan, "same-day plan must stay stable on the third call");
assert.notDeepEqual(createDailyWordPlan(englishWords, state, "2026-10-27", state.settings).wordIds, plan.wordIds, "next day must rotate the new-word block");

const oldPlanState = makeState(date, 20);
const oldPlanIds = englishWords.slice(100, 115).map((word) => word.id);
const completedId = oldPlanIds[0];
const blockedOldId = oldPlanIds[1];
const invalidId = "word-id-from-an-old-release";
oldPlanState.dailyPlans[date] = { date, wordIds: [completedId, ...oldPlanIds.slice(1, 14), invalidId], completedWordIds: [completedId], reviewedWordIds: [completedId] };
oldPlanState.wordProgress[completedId] = { ...makeProgress(completedId, "mastered", "2026-10-20", "2026-11-01"), isFavorite: true };
oldPlanState.wordProgress[blockedOldId] = makeProgress(blockedOldId, "known", "2026-10-20", "2026-11-01");
oldPlanState.learningRecords[date] = { date, learnedCount: 1, masteredCount: 1, reviewedCount: 1, correctRate: 100, durationMinutes: 4, targetCompleted: false };
const protectedUserData = JSON.stringify({ progress: oldPlanState.wordProgress, records: oldPlanState.learningRecords });
const reconciled = getOrCreateDailyPlan(englishWords, oldPlanState, date);
assertPlanShape(reconciled, englishWords, 20);
assert.ok(reconciled.wordIds.includes(completedId), "completed old-plan word must be preserved");
assert.ok(reconciled.completedWordIds.includes(completedId), "completed progress must be preserved");
assert.ok(!reconciled.wordIds.includes(invalidId), "invalid old-plan ID must be replaced");
assert.ok(!reconciled.wordIds.includes(blockedOldId), "known unfinished old-plan word must be replaced");
assert.equal(JSON.stringify({ progress: oldPlanState.wordProgress, records: oldPlanState.learningRecords }), protectedUserData, "progress and learning history must not be mutated");

const exhaustedState = makeState(date, 20);
for (const word of englishWords) exhaustedState.wordProgress[word.id] = makeProgress(word.id, "mastered", "2026-01-01", "2026-11-01");
const exhaustedPlan = createDailyWordPlan(englishWords, exhaustedState, date, exhaustedState.settings);
assert.equal(exhaustedPlan.wordIds.length, 0, "candidate shortage must not be padded with mastered words");

console.log(JSON.stringify({
  totalWords: englishWords.length,
  legacyWords: legacyEnglishWords.length,
  generatedWords: generatedEnglishWords.length,
  dailyPlanCount: plan.wordIds.length,
  pageVisibleCount: plan.wordIds.length,
  dueReviewIds: [dueUnknownId, dueFuzzyId],
  exhaustedPlanCount: exhaustedPlan.wordIds.length,
  stableIds: true,
  sourceMappings: Object.keys(generatedEnglishWordSources).length,
}, null, 2));
