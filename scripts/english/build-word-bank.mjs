import crypto from "node:crypto";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const defaultSourceDir = path.join(process.env.TEMP ?? path.join(root, ".cache"), "lin-english-sources");
const sourceDir = path.resolve(process.argv.find((value) => value.startsWith("--source-dir="))?.slice("--source-dir=".length) ?? defaultSourceDir);
const reportOnly = process.argv.includes("--report-only");
const outputPath = path.join(root, "features", "english", "wordBank.generated.ts");
const minimumAcceptedWords = 3000;

const paths = {
  ngsl: path.join(sourceDir, "NGSL_12_stats.csv"),
  ngslGr: path.join(sourceDir, "NGSL-GR_rank.csv"),
  ngslDefinitions: path.join(sourceDir, "NGSL_12_with_English_definitions.xlsx"),
  ecdict: path.join(sourceDir, "ecdict.csv"),
  ipa: path.join(sourceDir, "en_US.txt"),
  englishSentences: path.join(sourceDir, "extracted", "eng_sentences.tsv"),
  chineseSentences: path.join(sourceDir, "extracted", "cmn_sentences.tsv"),
  links: path.join(sourceDir, "extracted", "tatoeba-links", "links.csv"),
  oewnYaml: path.join(sourceDir, "extracted", "oewn", "english-wordnet-2025-edition", "src", "yaml"),
};

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing source file: ${filePath}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function cleanText(value) {
  return value
    .replace(/\\r\\n|\\n|\\r/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

function parseRankedWords(filePath, hasHeader = false) {
  const rows = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const words = [];
  for (const line of rows) {
    const [first, second] = line.split(",");
    if (hasHeader && first.toLowerCase() === "lemma") continue;
    if (!hasHeader && first.toLowerCase() === "wordid") continue;
    const word = (hasHeader ? first : second)?.trim().toLowerCase();
    if (!word || !/^[a-z]+(?:[-'][a-z]+)*$/.test(word)) continue;
    const rank = Number(hasHeader ? second : first);
    words.push({ word, rank: Number.isFinite(rank) ? rank : words.length + 1, source: hasHeader ? "ngsl-1.2" : "ngsl-gr-1.0" });
  }
  return words;
}

function mergeRankedWords() {
  const ngsl = parseRankedWords(paths.ngsl, true);
  const ngslGr = parseRankedWords(paths.ngslGr, false);
  const merged = new Map();
  for (const item of [...ngsl, ...ngslGr]) {
    if (!merged.has(item.word)) merged.set(item.word, item);
  }
  return { ngsl, ngslGr, words: [...merged.values()] };
}

function parseDictionary() {
  const rows = parseCsv(fs.readFileSync(paths.ecdict, "utf8"));
  const header = rows.shift();
  const indexes = new Map(header.map((name, index) => [name, index]));
  const dictionary = new Map();
  for (const row of rows) {
    const word = row[indexes.get("word") ?? -1]?.trim().toLowerCase();
    if (!word || !/^[a-z]+(?:[-'][a-z]+)*$/.test(word)) continue;
    const item = {
      word,
      phonetic: row[indexes.get("phonetic") ?? -1]?.trim() ?? "",
      definitionEn: row[indexes.get("definition") ?? -1]?.trim() ?? "",
      meaningZh: row[indexes.get("translation") ?? -1]?.trim() ?? "",
      partOfSpeech: row[indexes.get("pos") ?? -1]?.trim() ?? "",
    };
    const previous = dictionary.get(word);
    if (!previous || (item.meaningZh && !previous.meaningZh) || (item.phonetic && !previous.phonetic)) dictionary.set(word, item);
  }
  return dictionary;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function parseNgslDefinitions() {
  const outputDir = path.join(sourceDir, "extracted", "ngsl-definitions");
  const sharedStringsPath = path.join(outputDir, "xl", "sharedStrings.xml");
  const sheetPath = path.join(outputDir, "xl", "worksheets", "sheet1.xml");
  if (!fs.existsSync(sharedStringsPath) || !fs.existsSync(sheetPath)) {
    fs.mkdirSync(outputDir, { recursive: true });
    childProcess.execFileSync("tar", ["-xf", paths.ngslDefinitions, "-C", outputDir], { stdio: "ignore" });
  }
  if (!fs.existsSync(sharedStringsPath) || !fs.existsSync(sheetPath)) return new Map();
  const sharedXml = fs.readFileSync(sharedStringsPath, "utf8");
  const strings = [];
  for (const item of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    strings.push(decodeXml([...item[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join("")));
  }
  const sheetXml = fs.readFileSync(sheetPath, "utf8");
  const definitions = new Map();
  for (const row of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [...row[1].matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)];
    const wordCell = cells.find((match) => match[1].startsWith("A"));
    const definitionCell = cells.find((match) => match[1].startsWith("B"));
    if (!wordCell || !definitionCell) continue;
    const word = strings[Number(wordCell[2])]?.trim().toLowerCase();
    const definition = strings[Number(definitionCell[2])]?.trim();
    if (word && definition) definitions.set(word, definition);
  }
  return definitions;
}

function stripYamlScalar(value) {
  const text = value.trim();
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  if (text.startsWith('"') && text.endsWith('"')) {
    try { return JSON.parse(text); } catch { return text.slice(1, -1); }
  }
  return text;
}

function parseWordnet() {
  const wordnet = new Map();
  if (!fs.existsSync(paths.oewnYaml)) return wordnet;
  const files = fs.readdirSync(paths.oewnYaml).filter((file) => /^(adj|adv|noun|verb)\..+\.yaml$/.test(file));
  for (const file of files) {
    const pos = file.startsWith("adj") ? "adj" : file.startsWith("adv") ? "adv" : file.startsWith("noun") ? "n" : "v";
    const lines = fs.readFileSync(path.join(paths.oewnYaml, file), "utf8").split(/\r?\n/);
    let current = null;
    let section = "";
    const flush = () => {
      if (!current || !current.members.length || !current.definition) return;
      for (const member of current.members) {
        const key = member.toLowerCase();
        const previous = wordnet.get(key);
        wordnet.set(key, {
          definitionEn: previous?.definitionEn || current.definition,
          exampleSentence: previous?.exampleSentence || current.example || "",
          partOfSpeech: [...new Set([...(previous?.partOfSpeech ?? []), pos])],
        });
      }
    };
    for (const line of lines) {
      const block = line.match(/^([0-9a-f]+-[anrvs]):$/);
      if (block) { flush(); current = { members: [], definition: "", example: "" }; section = ""; continue; }
      if (!current) continue;
      const key = line.match(/^  (definition|example|members):$/)?.[1];
      if (key) { section = key; continue; }
      if (/^  [a-z_]+:/.test(line)) { section = ""; continue; }
      const item = line.match(/^  - (.*)$/) ?? line.match(/^    (.+)$/);
      if (!item || !section) continue;
      const value = stripYamlScalar(item[1]);
      if (section === "members") current.members.push(value);
      if (section === "definition" && !current.definition) current.definition = value;
      if (section === "example" && !current.example) current.example = value;
    }
    flush();
  }
  return wordnet;
}

function parseIpa() {
  const ipa = new Map();
  for (const line of fs.readFileSync(paths.ipa, "utf8").split(/\r?\n/)) {
    const [word, pronunciation] = line.split("\t");
    if (word && pronunciation && !ipa.has(word.toLowerCase())) ipa.set(word.toLowerCase(), pronunciation.trim());
  }
  return ipa;
}

function normalizePhonetic(value) {
  if (!value) return "";
  const text = value.trim();
  return text.startsWith("/") ? text : `/${text}/`;
}

function mapPartOfSpeech(value, fallback = "") {
  const labels = new Map([
    ["n", "名词"], ["v", "动词"], ["adj", "形容词"], ["adv", "副词"], ["prep", "介词"],
    ["conj", "连词"], ["pron", "代词"], ["art", "冠词"], ["det", "限定词"], ["num", "数词"], ["vt", "动词"], ["vi", "动词"],
    ["int", "感叹词"], ["aux", "助动词"], ["modal", "情态动词"], ["s", "形容词"], ["r", "副词"],
  ]);
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(/[/:,\s]+/))
    .map((item) => item.replace(/[^a-z]/gi, "").toLowerCase())
    .filter(Boolean);
  const mapped = [...new Set(values.map((item) => labels.get(item)).filter(Boolean))];
  return mapped.length ? mapped.join("/") : fallback;
}

function inferPartOfSpeech(value) {
  return [...value.matchAll(/(?:^|\s|\n)(n|v|adj|adv|prep|conj|pron|art|det|num|int|aux|modal|s|r)\./gi)].map((match) => match[1].toLowerCase());
}

function firstMeaning(value) {
  const candidate = value.split(/(?:\\r\\n|\\n|\\r)|\r?\n/).map(cleanText).find(Boolean) ?? "";
  return candidate.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function tokenizeEnglish(value) {
  return new Set((value.toLowerCase().match(/[a-z]+(?:['-][a-z]+)*/g) ?? []));
}

function validSentence(value) {
  return value.length >= 8 && value.length <= 180 && !/[<>\[\]{}]/.test(value) && !/https?:\/\//i.test(value);
}

async function readTsv(filePath, callback) {
  const stream = fs.createReadStream(filePath, "utf8");
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of reader) {
    const [id, language, text] = line.split("\t");
    if (id && language && text) await callback(id, language, text);
  }
}

async function readLinks(filePath, callback) {
  const stream = fs.createReadStream(filePath, "utf8");
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of reader) {
    const [left, right] = line.split("\t");
    if (left && right) await callback(left, right);
  }
}

async function findTatoebaExamples(targetWords) {
  const chineseSentences = new Map();
  await readTsv(paths.chineseSentences, (id, language, text) => {
    if (language === "cmn" && validSentence(text)) chineseSentences.set(id, text);
  });
  const englishToChinese = new Map();
  await readLinks(paths.links, (left, right) => {
    if (chineseSentences.has(left) && !chineseSentences.has(right)) {
      const values = englishToChinese.get(right) ?? new Set();
      values.add(left);
      englishToChinese.set(right, values);
    } else if (chineseSentences.has(right) && !chineseSentences.has(left)) {
      const values = englishToChinese.get(left) ?? new Set();
      values.add(right);
      englishToChinese.set(left, values);
    }
  });
  const examples = new Map();
  await readTsv(paths.englishSentences, async (id, language, text) => {
    const linkedChinese = englishToChinese.get(id);
    if (language !== "eng" || !linkedChinese || !validSentence(text)) return;
    const tokens = tokenizeEnglish(text);
    for (const word of targetWords) {
      if (!tokens.has(word)) continue;
      for (const chineseId of linkedChinese) {
        const translation = chineseSentences.get(chineseId);
        if (!translation || translation.length < 2) continue;
        const candidate = { exampleSentence: text, exampleTranslation: translation, score: text.length + translation.length / 5 };
        const previous = examples.get(word);
        if (!previous || candidate.score < previous.score) examples.set(word, candidate);
      }
    }
  });
  return examples;
}

function stableId(word, partOfSpeech) {
  const hash = crypto.createHash("sha256").update(`${word.toLowerCase()}|${partOfSpeech.toLowerCase()}`).digest("hex").slice(0, 16);
  return `word-bank-${hash}`;
}

function difficulty(rank) {
  if (rank <= 1500) return "beginner";
  if (rank <= 3500) return "intermediate";
  return "advanced";
}

function escapeForJson(value) {
  return JSON.stringify(value);
}

function parseLegacyWords() {
  const filePath = path.join(root, "features", "english", "mockData.ts");
  const text = fs.readFileSync(filePath, "utf8");
  return new Set([...text.matchAll(/^\s*word\("[^"]+",\s*"([^"]+)"/gm)].map((match) => match[1].toLowerCase()));
}

function buildOutput(words, sources, metadata) {
  const lines = [
    'import type { EnglishWord } from "./types";',
    "",
    "// Generated by scripts/english/build-word-bank.mjs. Do not hand-edit.",
  ];
  const chunkSize = 256;
  const chunkNames = [];
  for (let start = 0; start < words.length; start += chunkSize) {
    const chunkName = `generatedEnglishWordChunk${chunkNames.length}`;
    chunkNames.push(chunkName);
    lines.push(`const ${chunkName}: EnglishWord[] = [`);
    for (const item of words.slice(start, start + chunkSize)) {
      lines.push(`  { id: ${escapeForJson(item.id)}, word: ${escapeForJson(item.word)}, phonetic: ${escapeForJson(item.phonetic)}, meaningZh: ${escapeForJson(item.meaningZh)}, definitionEn: ${escapeForJson(item.definitionEn)}, partOfSpeech: ${escapeForJson(item.partOfSpeech)}, collocations: [], exampleSentence: ${escapeForJson(item.exampleSentence)}, exampleTranslation: ${escapeForJson(item.exampleTranslation)}, difficulty: ${escapeForJson(item.difficulty)}, topic: "通用" },`);
    }
    lines.push("];", "");
  }
  lines.push(`export const generatedEnglishWords: EnglishWord[] = [${chunkNames.map((name) => `...${name}`).join(", ")}];`, "", "export type GeneratedWordSource = { frequency: \"ngsl-1.2\" | \"ngsl-gr-1.0\"; definition: \"NGSL\" | \"ECDICT\" | \"OEWN\"; meaningZh: \"ECDICT\"; pronunciation: \"ECDICT\" | \"ipa-dict\"; example: \"Tatoeba\"; };", "", "export const generatedEnglishWordSources: Record<string, GeneratedWordSource> = {");
  for (const item of words) {
    const source = sources.get(item.id);
    lines.push(`  ${escapeForJson(item.id)}: { frequency: ${escapeForJson(source.frequency)}, definition: ${escapeForJson(source.definition)}, meaningZh: "ECDICT", pronunciation: ${escapeForJson(source.pronunciation)}, example: "Tatoeba" },`);
  }
  lines.push("};", "", `export const generatedEnglishWordBuild = ${JSON.stringify(metadata, null, 2)} as const;`, "");
  return lines.join("\n");
}

async function main() {
  for (const filePath of Object.values(paths)) requireFile(filePath);
  const ranked = mergeRankedWords();
  const dictionary = parseDictionary();
  const ngslDefinitions = parseNgslDefinitions();
  const wordnet = parseWordnet();
  const ipa = parseIpa();
  const legacyWords = parseLegacyWords();
  const targetWords = new Set(ranked.words.map((item) => item.word));
  const examples = await findTatoebaExamples(targetWords);
  const words = [];
  const sources = new Map();
  const rejected = { legacy: 0, dictionary: 0, phonetic: 0, meaningZh: 0, definitionEn: 0, partOfSpeech: 0, example: 0, duplicate: 0 };
  const ids = new Set();
  for (const rankedWord of ranked.words) {
    if (legacyWords.has(rankedWord.word)) { rejected.legacy += 1; continue; }
    const dictionaryItem = dictionary.get(rankedWord.word);
    const wordnetItem = wordnet.get(rankedWord.word);
    if (!dictionaryItem) { rejected.dictionary += 1; continue; }
    const ipaPhonetic = ipa.get(rankedWord.word);
    const phonetic = normalizePhonetic(ipaPhonetic || dictionaryItem.phonetic);
    const meaningZh = firstMeaning(dictionaryItem.meaningZh);
    const definitionSource = ngslDefinitions.has(rankedWord.word) ? "NGSL" : dictionaryItem.definitionEn ? "ECDICT" : "OEWN";
    const definitionEn = firstMeaning(ngslDefinitions.get(rankedWord.word) || dictionaryItem.definitionEn || wordnetItem?.definitionEn || "");
    const translatedPartOfSpeech = inferPartOfSpeech(dictionaryItem.meaningZh);
    const inferredPartOfSpeech = inferPartOfSpeech(dictionaryItem.definitionEn);
    const partOfSpeech = mapPartOfSpeech([
      dictionaryItem.partOfSpeech,
      ...(translatedPartOfSpeech.length ? translatedPartOfSpeech : inferredPartOfSpeech),
      ...(translatedPartOfSpeech.length || inferredPartOfSpeech.length ? [] : (wordnetItem?.partOfSpeech ?? [])),
    ]);
    const example = examples.get(rankedWord.word);
    if (!phonetic) { rejected.phonetic += 1; continue; }
    if (!meaningZh) { rejected.meaningZh += 1; continue; }
    if (!definitionEn) { rejected.definitionEn += 1; continue; }
    if (!partOfSpeech) { rejected.partOfSpeech += 1; continue; }
    if (!example) { rejected.example += 1; continue; }
    const id = stableId(rankedWord.word, partOfSpeech);
    if (ids.has(id)) { rejected.duplicate += 1; continue; }
    ids.add(id);
    words.push({ id, word: rankedWord.word, phonetic, meaningZh, definitionEn, partOfSpeech, exampleSentence: example.exampleSentence, exampleTranslation: example.exampleTranslation, difficulty: difficulty(rankedWord.rank) });
    sources.set(id, { frequency: rankedWord.source, definition: definitionSource, pronunciation: ipaPhonetic ? "ipa-dict" : "ECDICT" });
  }
  const metadata = {
    sourceSnapshotDate: "2026-10-26",
    sourceDirectory: "local build cache",
    candidateCounts: { ngsl12: ranked.ngsl.length, ngslGr: ranked.ngslGr.length, merged: ranked.words.length },
    acceptedCount: words.length,
    rejected,
  };
  console.log(JSON.stringify({ metadata, sourceDir, sample: words.slice(0, 5).map(({ id, word, partOfSpeech, exampleSentence, exampleTranslation }) => ({ id, word, partOfSpeech, exampleSentence, exampleTranslation })) }, null, 2));
  if (reportOnly) return;
  if (words.length < minimumAcceptedWords) throw new Error(`Refusing to publish only ${words.length} words; minimum is ${minimumAcceptedWords}.`);
  fs.writeFileSync(outputPath, buildOutput(words, sources, metadata), "utf8");
  console.log(`Wrote ${words.length} words to ${outputPath}`);
}

await main();
