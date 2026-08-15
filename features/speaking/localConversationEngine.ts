import type { SpeakingMessage, SpeakingScenario, SpeakingSettings } from "./types";

export type LocalConversationReply = {
  english: string;
  chinese: string;
  intent: string;
  pattern: string;
};

type Topic = "travel" | "food" | "work" | "movie" | "restaurant" | "hotel" | "airport" | "study" | "hobby" | "social" | "shopping" | "daily";

type ReplyCandidate = LocalConversationReply;

const topicKeywords: Record<Topic, string[]> = {
  travel: ["travel", "trip", "visit", "vacation", "holiday", "city", "country", "tokyo", "japan", "shanghai", "paris", "london"],
  food: ["food", "eat", "ate", "meal", "dish", "hotpot", "sushi", "beef", "restaurant", "taste", "delicious", "cook"],
  work: ["work", "office", "job", "meeting", "project", "deadline", "client", "boss", "busy", "presentation", "career"],
  movie: ["movie", "film", "tv", "series", "show", "watch", "watched", "actor", "episode", "interstellar"],
  restaurant: ["reservation", "menu", "order", "waiter", "table", "bill", "allergic", "recommend"],
  hotel: ["hotel", "room", "check-in", "check in", "reservation", "passport", "key", "checkout", "towel"],
  airport: ["airport", "flight", "fly", "boarding", "luggage", "baggage", "gate", "seat", "security"],
  study: ["learn", "learning", "study", "english", "practice", "grammar", "vocabulary", "class", "lesson"],
  hobby: ["hobby", "music", "read", "reading", "book", "game", "sport", "photo", "photography", "draw"],
  social: ["friend", "friends", "party", "family", "together", "host", "social", "people"],
  shopping: ["shop", "shopping", "buy", "price", "size", "color", "sale", "try on", "fit"],
  daily: ["today", "yesterday", "morning", "evening", "day", "feel", "think", "plan"],
};

const knownEntities = [
  "Japan", "Tokyo", "Kyoto", "Shanghai", "Shibuya", "the Bund", "Paris", "London", "New York", "Beijing",
  "hotpot", "sushi", "beef", "xiaolongbao", "pizza", "coffee", "latte", "Interstellar", "Bright Solutions",
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function getRecentUserText(history: SpeakingMessage[]) {
  return history.filter((message) => message.role === "user").map((message) => message.text).slice(-4).join(" ");
}

function detectTopic(scenario: SpeakingScenario, text: string, history: SpeakingMessage[]): Topic {
  const normalized = normalize(text);
  const recent = normalize(getRecentUserText(history));
  const scenarioText = normalize(`${scenario.id} ${scenario.titleEn} ${scenario.aiRole}`);
  const ordered: Topic[] = scenario.id === "restaurant" ? ["restaurant", "food"]
    : scenario.id === "hotel" ? ["hotel", "travel"]
      : scenario.id === "airport" ? ["airport", "travel"]
        : scenario.category === "travel" ? ["travel", "airport", "hotel"]
          : scenario.category === "work" || scenario.category === "interview" ? ["work", "daily"]
            : ["food", "movie", "shopping", "hobby", "study", "social", "travel", "work", "daily"];
  const scored = ordered.map((topic) => ({
    topic,
    score: topicKeywords[topic].reduce((total, keyword) => total + (normalized.includes(keyword) ? 3 : recent.includes(keyword) ? 1 : 0), 0)
      + (scenarioText.includes(topic) ? 2 : 0),
  }));
  const bestMatch = scored.sort((left, right) => right.score - left.score)[0];
  return bestMatch?.score ? bestMatch.topic : ordered[0] ?? "daily";
}

function extractEntities(text: string, history: SpeakingMessage[]) {
  const allText = `${getRecentUserText(history)} ${text}`;
  return knownEntities.filter((entity) => normalize(allText).includes(normalize(entity))).slice(-3);
}

function extractHighlightedPhrase(text: string) {
  const words = text.trim().replace(/[.!?]/g, "").split(/\s+/).filter(Boolean);
  if (words.length <= 5) return text.trim().replace(/[.!?]+$/, "");
  return words.slice(0, 6).join(" ");
}

function chooseCandidate(candidates: ReplyCandidate[], history: SpeakingMessage[]) {
  const previous = history.filter((message) => message.role === "ai").slice(-4).map((message) => message.text);
  const start = history.filter((message) => message.role === "ai").length % candidates.length;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(start + offset) % candidates.length];
    if (!previous.includes(candidate.english)) return candidate;
  }
  return candidates[start];
}

function rolePlayReply(topic: Topic, scenario: SpeakingScenario, history: SpeakingMessage[], text: string): ReplyCandidate | null {
  const userTurns = history.filter((message) => message.role === "user").length;
  const normalized = normalize(text);
  if (topic === "restaurant" || scenario.id === "restaurant") {
    if (userTurns <= 1 && /(yes|no|reservation|two|one|people|table)/i.test(normalized)) return { english: "Great. Please follow me. Would you like to see the menu?", chinese: "好的，请跟我来。您想看看菜单吗？", intent: "restaurant.menu", pattern: "restaurant-menu" };
    if (/(menu|recommend|order|would like|i'd like)/i.test(normalized) || userTurns >= 2) return chooseCandidate([
      { english: "Our grilled fish and vegetable noodles are popular today. What would you like to order?", chinese: "我们今天的烤鱼和蔬菜面很受欢迎。您想点什么？", intent: "restaurant.order", pattern: "restaurant-recommend" },
      { english: "Of course. Do you have any allergies or special requests I should know about?", chinese: "当然可以。您有需要提前说明的过敏或特殊要求吗？", intent: "restaurant.order", pattern: "restaurant-allergy" },
    ], history);
    return { english: "Good evening. Welcome! How many people are in your party?", chinese: "晚上好，欢迎光临！请问您一行有几位？", intent: "restaurant.enter", pattern: "restaurant-enter" };
  }
  if (topic === "hotel") {
    if (/(room|key|check in|check-in|passport)/i.test(normalized) || userTurns >= 2) return chooseCandidate([
      { english: "Here is your room key. Would you like me to explain the breakfast time and hotel facilities?", chinese: "这是您的房卡。需要我介绍早餐时间和酒店设施吗？", intent: "hotel.room", pattern: "hotel-facilities" },
      { english: "Your room is ready. Is there anything you would like us to prepare before you go upstairs?", chinese: "您的房间已经准备好了。上楼前还需要我们准备什么吗？", intent: "hotel.request", pattern: "hotel-request" },
    ], history);
    return { english: "Welcome to the hotel. May I see your passport, please?", chinese: "欢迎入住。可以看一下您的护照吗？", intent: "hotel.check-in", pattern: "hotel-checkin" };
  }
  if (topic === "airport") {
    if (/(luggage|baggage|bag|boarding|gate|seat)/i.test(normalized) || userTurns >= 2) return chooseCandidate([
      { english: "Your bag is checked in. Here is your boarding pass. Your gate is on the right after security.", chinese: "您的行李已经托运。这是登机牌，安检后右手边就是登机口。", intent: "airport.boarding", pattern: "airport-boarding" },
      { english: "Would you prefer an aisle seat or a window seat for this flight?", chinese: "这趟航班您更喜欢靠过道还是靠窗的座位？", intent: "airport.seat", pattern: "airport-seat" },
    ], history);
    return { english: "Good morning. Where are you flying today?", chinese: "早上好。您今天要飞往哪里？", intent: "airport.check-in", pattern: "airport-checkin" };
  }
  return null;
}

function topicReply(topic: Topic, scenario: SpeakingScenario, history: SpeakingMessage[], text: string, settings: SpeakingSettings): ReplyCandidate {
  const entities = extractEntities(text, history);
  const entity = entities.at(-1);
  const phrase = extractHighlightedPhrase(text);
  const concise = settings.level === "beginner";
  switch (topic) {
    case "travel":
      if (entity) return chooseCandidate([
        { english: `${entity} sounds like an exciting destination. Which place would you like to visit first?`, chinese: `${entity} 听起来是个很令人期待的目的地。你最想先去哪里？`, intent: "travel.destination", pattern: "travel-destination" },
        { english: `What would you most like to do in ${entity}?`, chinese: `你最想在 ${entity} 做什么？`, intent: "travel.activity", pattern: "travel-activity" },
      ], history);
      return { english: concise ? "Where would you like to travel, and why?" : "Where would you like to travel next, and what makes that place appealing to you?", chinese: concise ? "你想去哪里旅行？为什么？" : "你接下来想去哪里旅行？那个地方最吸引你的是什么？", intent: "travel.destination", pattern: "travel-open" };
    case "food":
      if (entity) return chooseCandidate([
        { english: `${entity} sounds delicious. What did you enjoy most about it?`, chinese: `${entity} 听起来很好吃。你最喜欢它的哪一点？`, intent: "food.preference", pattern: "food-preference" },
        { english: `How did you discover ${entity}, and would you order it again?`, chinese: `你是怎么发现 ${entity} 的？还会再点一次吗？`, intent: "food-experience", pattern: "food-experience" },
      ], history);
      return { english: concise ? "What did you eat recently?" : "What did you eat recently, and what made the meal memorable?", chinese: concise ? "你最近吃了什么？" : "你最近吃了什么？这顿饭有什么让你印象深刻的地方？", intent: "food.experience", pattern: "food-open" };
    case "work":
      if (/(busy|meeting|meetings|deadline|project)/i.test(normalize(text))) return chooseCandidate([
        { english: "That sounds like a full day. Which part of the work needed the most attention?", chinese: "听起来今天安排得很满。哪一部分工作最需要你投入精力？", intent: "work.detail", pattern: "work-detail" },
        { english: "What was the most important decision or result from that work?", chinese: "那项工作中最重要的决定或结果是什么？", intent: "work-result", pattern: "work-result" },
      ], history);
      return { english: concise ? "What are you working on today?" : "What are you working on today, and what would a good result look like?", chinese: concise ? "你今天在忙什么工作？" : "你今天在做什么工作？怎样才算取得了好的结果？", intent: "work.topic", pattern: "work-open" };
    case "movie":
      if (entity) return chooseCandidate([
        { english: `${entity} sounds worth discussing. What did you enjoy most about it?`, chinese: `${entity} 很值得聊聊。你最喜欢它的哪一点？`, intent: "movie.opinion", pattern: "movie-opinion" },
        { english: `What scene or character from ${entity} stayed in your mind?`, chinese: `${entity} 里的哪个场景或角色让你印象最深？`, intent: "movie.detail", pattern: "movie-detail" },
      ], history);
      return { english: "What movie or series have you watched recently?", chinese: "你最近看了哪部电影或电视剧？", intent: "movie.title", pattern: "movie-open" };
    case "shopping":
      return { english: "What are you looking for, and what color or size do you prefer?", chinese: "你在找什么？更喜欢什么颜色或尺码？", intent: "shopping.preference", pattern: "shopping-preference" };
    case "study":
      return { english: "What part of English would you like to practice today?", chinese: "你今天想练习英语的哪一部分？", intent: "study.goal", pattern: "study-goal" };
    case "hobby":
      return { english: `You mentioned ${phrase || "an interest"}. How often do you make time for it?`, chinese: `你提到了${phrase || "一个兴趣"}。你多久会安排时间做一次？`, intent: "hobby.routine", pattern: "hobby-routine" };
    case "social":
      return { english: "That sounds like a good chance to connect. What did you talk about?", chinese: "那听起来是一次很好的交流机会。你们聊了些什么？", intent: "social.detail", pattern: "social-detail" };
    default:
      return chooseCandidate([
        { english: `I heard you mention “${phrase || "that"}”. What happened next?`, chinese: `我注意到你提到了“${phrase || "这个"}”。后来发生了什么？`, intent: "daily.detail", pattern: "daily-detail" },
        { english: `What was the most important part of “${phrase || "that experience"}” for you?`, chinese: `对你来说，“${phrase || "这段经历"}”最重要的部分是什么？`, intent: "daily.reflection", pattern: "daily-reflection" },
        { english: "How did that make you feel?", chinese: "那让你有什么感受？", intent: "daily.feeling", pattern: "daily-feeling" },
      ], history);
  }
}

export function generateLocalConversationReply({ scenario, settings, history, userText }: { scenario: SpeakingScenario; settings: SpeakingSettings; history: SpeakingMessage[]; userText: string }): LocalConversationReply {
  const topic = detectTopic(scenario, userText, history);
  return rolePlayReply(topic, scenario, history, userText) ?? topicReply(topic, scenario, history, userText, settings);
}
