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
  "basketball", "e-commerce", "action movies",
];

const questionIntentPatterns: Array<{ intent: string; pattern: RegExp }> = [
  { intent: "restaurant.menu", pattern: /\b(menu|see the menu|look at the menu)\b/i },
  { intent: "restaurant.order", pattern: /\b(order|what would you like to (order|have)|ready to order|main dish)\b/i },
  { intent: "restaurant.allergy", pattern: /\b(allerg|special request)\b/i },
  { intent: "restaurant.drink", pattern: /\b(drink|beverage|something to drink)\b/i },
  { intent: "restaurant.preference", pattern: /\b(cooked|sauce|side dish|spicy)\b/i },
  { intent: "restaurant.dessert", pattern: /\b(dessert|sweet)\b/i },
  { intent: "restaurant.payment", pattern: /\b(bill|pay|payment|check out)\b/i },
  { intent: "restaurant.feedback", pattern: /\b(how was.*(meal|everything)|enjoy.*meal|especially enjoyed)\b/i },
  { intent: "restaurant.recommendation", pattern: /\b(recommend to someone|first time)\b/i },
  { intent: "restaurant.next", pattern: /\b(come back|next time)\b/i },
  { intent: "hotel.room", pattern: /\b(room key|breakfast time|hotel facilities)\b/i },
  { intent: "hotel.request", pattern: /\b(anything.*prepare|extra towel|room service|go upstairs)\b/i },
  { intent: "hotel.amenity", pattern: /\b(gym|pool|facility|facilities)\b/i },
  { intent: "hotel.checkout", pattern: /\b(check out|leave the hotel|departure)\b/i },
  { intent: "hotel.local", pattern: /\b(nearby|near the hotel|local restaurant)\b/i },
  { intent: "hotel.problem", pattern: /\b(problem|not working|too noisy|noise)\b/i },
  { intent: "hotel.stay", pattern: /\b(how many nights|how long.*stay.*with us)\b/i },
  { intent: "hotel.service", pattern: /\b(housekeeping|clean the room)\b/i },
  { intent: "hotel.review", pattern: /\b(enjoy.*stay|stay so far)\b/i },
  { intent: "hotel.comfort", pattern: /\b(make your stay more comfortable|more comfortable)\b/i },
  { intent: "airport.baggage", pattern: /\b(bag|luggage|baggage|boarding pass)\b/i },
  { intent: "airport.seat", pattern: /\b(aisle|window seat)\b/i },
  { intent: "airport.gate", pattern: /\b(gate)\b/i },
  { intent: "airport.security", pattern: /\b(security)\b/i },
  { intent: "airport.timing", pattern: /\b(boarding time|what time.*flight|departure time|arrive at the gate)\b/i },
  { intent: "airport.transfer", pattern: /\b(transfer|connecting flight|connection)\b/i },
  { intent: "airport.arrival", pattern: /\b(when.*arrive|arrival)\b/i },
  { intent: "airport.food", pattern: /\b(eat or drink before the flight)\b/i },
  { intent: "airport.trip", pattern: /\b(enjoy.*flight|looking forward.*trip)\b/i },
  { intent: "airport.transport", pattern: /\b(transportation after you land)\b/i },
  { intent: "travel.destination", pattern: /\b(where would you like to travel|which place.*visit|first time.*visit|where.*travel next)\b/i },
  { intent: "travel.reason", pattern: /\b(why.*(like|choose)|what makes.*special to you|what makes.*appealing)\b/i },
  { intent: "travel.activity", pattern: /\b(what would you most like to do|what kind of activities|activities on a trip)\b/i },
  { intent: "travel.food", pattern: /\b(local food|what.*eat|cuisine)\b/i },
  { intent: "travel.experience", pattern: /\b(memorable experience|enjoy.*there|what happened there|trip memorable)\b/i },
  { intent: "travel.companion", pattern: /\b(who.*travel|travel with)\b/i },
  { intent: "travel.accommodation", pattern: /\b(where.*stay|kind of place.*stay|accommodation)\b/i },
  { intent: "travel.transport", pattern: /\b(how.*get around|transport)\b/i },
  { intent: "travel.plan", pattern: /\b(how long.*stay|when.*go|plan a trip)\b/i },
  { intent: "travel.culture", pattern: /\b(learn.*about|culture|tradition)\b/i },
  { intent: "travel.return", pattern: /\b(visit .* again|visit again)\b/i },
  { intent: "travel.prepare", pattern: /\b(prepare before leaving|need to prepare)\b/i },
  { intent: "travel.next", pattern: /\b(place would you like to visit next|next stop)\b/i },
  { intent: "movie.recommendation", pattern: /\b(recommend.*movies?|recommend.*film|recommend.*series)\b/i },
  { intent: "food.preference", pattern: /\b(sounds delicious|what food do you enjoy most|favorite food)\b/i },
  { intent: "food.discovery", pattern: /\b(discover|find)\b/i },
  { intent: "food.occasion", pattern: /\b(when.*eat|usually eat|usually enjoy.*food)\b/i },
  { intent: "food.cooking", pattern: /\b(make|cook).*(yourself|it)\b/i },
  { intent: "food.ingredients", pattern: /\b(ingredients|flavors)\b/i },
  { intent: "food.restaurant", pattern: /\b(where do you usually go.*(eat|meal))\b/i },
  { intent: "food.recommendation", pattern: /\b(what food would you recommend|recommend.*food|recommend.*dish|would you recommend .* to a friend)\b/i },
  { intent: "food.memory", pattern: /\b(memorable (food )?experience|connected with)\b/i },
  { intent: "food.variation", pattern: /\b(change.*taste|suit your taste)\b/i },
  { intent: "food.next", pattern: /\b(try next|next.*food)\b/i },
  { intent: "work.role", pattern: /\b(what do you usually do at work|what kind of work|responsibilit|your role)\b/i },
  { intent: "work.tasks", pattern: /\b(typical day|daily task)\b/i },
  { intent: "work.challenge", pattern: /\b(challenging|difficult part)\b/i },
  { intent: "work.team", pattern: /\b(who do you usually work with|your team)\b/i },
  { intent: "work.skills", pattern: /\b(skill.*help|useful skill)\b/i },
  { intent: "work.enjoyment", pattern: /\b(enjoy most about your work|like most about your work)\b/i },
  { intent: "work.goal", pattern: /\b(improve next|work goal)\b/i },
  { intent: "work.result", pattern: /\b(result.*proud|important decision)\b/i },
  { intent: "work.career", pattern: /\b(become interested|how did you.*field)\b/i },
  { intent: "work.balance", pattern: /\b(manage busy|manage your time|busy periods)\b/i },
  { intent: "work.topic", pattern: /\b(working on today|current plan|project update)\b/i },
  { intent: "movie.title", pattern: /\b(what movie|what film|what.*watch.*recently)\b/i },
  { intent: "movie.genre", pattern: /\b(kind of movies?|genre|what do you enjoy about.*movies)\b/i },
  { intent: "movie.opinion", pattern: /\b(sounds worth discussing|what did you enjoy most about the last movie|what do you think.*movie)\b/i },
  { intent: "movie.detail", pattern: /\b(scene|character)\b/i },
  { intent: "movie.ending", pattern: /\b(ending of|how did it finish|what was the ending)\b/i },
  { intent: "movie.theme", pattern: /\b(message|theme|meaning)\b/i },
  { intent: "movie.recommendation", pattern: /\b(recommend.*movie|recommend.*film|recommend.*series|what movie would you recommend)\b/i },
  { intent: "movie.experience", pattern: /\b(when did you watch|who did you watch|where did you watch|where do you usually watch movies)\b/i },
  { intent: "movie.comparison", pattern: /\b(compare|similar)\b/i },
  { intent: "movie.next", pattern: /\b(watch next|next movie)\b/i },
  { intent: "movie.rewatch", pattern: /\b(watch .* again|rewatch)\b/i },
  { intent: "movie.memory", pattern: /\b(make.*movie memorable|movie memorable)\b/i },
  { intent: "shopping.item", pattern: /\b(looking for|shopping for)\b/i },
  { intent: "shopping.preference", pattern: /\b(color|size|prefer)\b/i },
  { intent: "shopping.budget", pattern: /\b(budget|price|afford)\b/i },
  { intent: "shopping.try", pattern: /\b(try it on|fit)\b/i },
  { intent: "shopping.decision", pattern: /\b(decide|choose|take it)\b/i },
  { intent: "shopping.quality", pattern: /\b(quality|last long|durable)\b/i },
  { intent: "shopping.store", pattern: /\b(shop|store|online)\b/i },
  { intent: "shopping.gift", pattern: /\b(gift|buy for someone)\b/i },
  { intent: "study.goal", pattern: /\b(what part of english|practice today)\b/i },
  { intent: "study.challenge", pattern: /\b(difficult|challenging|struggle)\b/i },
  { intent: "study.habit", pattern: /\b(how often.*study|study habit)\b/i },
  { intent: "study.resource", pattern: /\b(book|resource|app|lesson)\b/i },
  { intent: "study.progress", pattern: /\b(improved|improvement|progress)\b/i },
  { intent: "study.goal_next", pattern: /\b(next English goal|goal next)\b/i },
  { intent: "study.situation", pattern: /\b(use English|real situation)\b/i },
  { intent: "hobby.routine", pattern: /\b(how often|make time)\b/i },
  { intent: "hobby.origin", pattern: /\b(started|start|begin.*hobby)\b/i },
  { intent: "hobby.feeling", pattern: /\b(feel when|relax)\b/i },
  { intent: "hobby.detail", pattern: /\b(what do you like about)\b/i },
  { intent: "hobby.next", pattern: /\b(try.*hobby|try or learn next|learn next)\b/i },
  { intent: "social.detail", pattern: /\b(what did you talk about)\b/i },
  { intent: "social.people", pattern: /\b(who were you with|who.*party)\b/i },
  { intent: "social.next", pattern: /\b(see them again|next time)\b/i },
  { intent: "social.memory", pattern: /\b(memorable part of the gathering|gathering)\b/i },
  { intent: "social.opinion", pattern: /\b(enjoy most about meeting|what did you think)\b/i },
  { intent: "daily.detail", pattern: /\b(what happened next)\b/i },
  { intent: "daily.reflection", pattern: /\b(most important part)\b/i },
  { intent: "daily.feeling", pattern: /\b(how did that make you feel)\b/i },
  { intent: "daily.plan", pattern: /\b(plan for tomorrow|next plan)\b/i },
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
  const lastAiMessage = history.filter((message) => message.role === "ai").at(-1);
  const previousIntent = lastAiMessage ? inferQuestionIntent(lastAiMessage.text) : "";
  const previousTopic = previousIntent.includes(".") ? previousIntent.split(".")[0] as Topic : "";
  if (previousTopic && ordered.includes(previousTopic)) return previousTopic;
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

function extractSubjectPhrase(text: string) {
  const cleaned = text.trim().replace(/[.!?]+$/, "");
  const match = cleaned.match(/\b(?:like|love|enjoy|prefer|watch|watched|work in|work at|study|practice|cook|eat|ate|looking for)\s+(?:to\s+)?(.+)/i);
  if (match?.[1]) {
    const subject = match[1].trim().replace(/^(?:that|this)\s+/i, "");
    return /^(it|that|this|a|an|the)\b/i.test(subject) ? "" : subject;
  }
  if (/^(because|with|when|last|it|they|we|yes|no|i|the)\b/i.test(cleaned)) return "";
  return cleaned.split(/\s+/).length <= 4 ? cleaned : "";
}

function inferQuestionIntent(text: string) {
  const normalized = normalize(text);
  return questionIntentPatterns.find((item) => item.pattern.test(normalized))?.intent ?? `text:${normalized}`;
}

function chooseCandidate(candidates: ReplyCandidate[], history: SpeakingMessage[]) {
  if (candidates.length === 0) throw new Error("No local conversation candidates available.");
  const aiMessages = history.filter((message) => message.role === "ai");
  const askedIntents = new Set(aiMessages.map((message) => inferQuestionIntent(message.text)));
  const previousTexts = new Set(aiMessages.map((message) => normalize(message.text)));
  const freshCandidates = candidates.filter((candidate) => !askedIntents.has(candidate.intent) && !previousTexts.has(normalize(candidate.english)));
  const pool = freshCandidates.length ? freshCandidates : candidates.filter((candidate) => !previousTexts.has(normalize(candidate.english)));
  const usablePool = pool.length ? pool : candidates;
  const start = aiMessages.length % usablePool.length;
  for (let offset = 0; offset < usablePool.length; offset += 1) {
    const candidate = usablePool[(start + offset) % usablePool.length];
    const lastIntent = aiMessages.at(-1) ? inferQuestionIntent(aiMessages.at(-1)!.text) : "";
    if (candidate.intent !== lastIntent || usablePool.length === 1) return candidate;
  }
  return usablePool[start];
}

function rolePlayReply(topic: Topic, scenario: SpeakingScenario, history: SpeakingMessage[], text: string): ReplyCandidate | null {
  const userTurns = history.filter((message) => message.role === "user").length;
  if (topic === "restaurant" || scenario.id === "restaurant") {
    const candidates: ReplyCandidate[] = [
      { english: "Great. Please follow me. Would you like to see the menu?", chinese: "好的，请跟我来。您想看看菜单吗？", intent: "restaurant.menu", pattern: "restaurant-menu" },
      { english: "Our grilled fish and vegetable noodles are popular today. What would you like to order?", chinese: "我们今天的烤鱼和蔬菜面很受欢迎。您想点什么？", intent: "restaurant.order", pattern: "restaurant-order" },
      { english: "Of course. Do you have any allergies or special requests I should know about?", chinese: "当然可以。您有需要提前说明的过敏或特殊要求吗？", intent: "restaurant.allergy", pattern: "restaurant-allergy" },
      { english: "What would you like to drink with your meal?", chinese: "您想为这顿饭喝点什么？", intent: "restaurant.drink", pattern: "restaurant-drink" },
      { english: "How would you like your main dish prepared, and would you like a side dish?", chinese: "您的主菜希望怎么做？需要配一道小菜吗？", intent: "restaurant.preference", pattern: "restaurant-preference" },
      { english: "Would you like to look at the dessert menu after your meal?", chinese: "用餐后您想看看甜点菜单吗？", intent: "restaurant.dessert", pattern: "restaurant-dessert" },
      { english: "How was everything, and was there anything you especially enjoyed?", chinese: "整体用餐感觉怎么样？有没有特别喜欢的部分？", intent: "restaurant.feedback", pattern: "restaurant-feedback" },
      { english: "Would you like the bill now, or would you prefer to wait a little longer?", chinese: "现在需要结账吗？还是想再坐一会儿？", intent: "restaurant.payment", pattern: "restaurant-payment" },
      { english: "What would you recommend to someone visiting this restaurant for the first time?", chinese: "如果朋友第一次来这家餐厅，你会推荐什么？", intent: "restaurant.recommendation", pattern: "restaurant-recommendation" },
      { english: "Would you come back here again, and what would you try next time?", chinese: "你下次还会来吗？下次想尝试什么？", intent: "restaurant.next", pattern: "restaurant-next" },
    ];
    return chooseCandidate(userTurns <= 1 ? candidates.slice(0, 1) : candidates, history);
  }
  if (topic === "hotel") {
    const candidates: ReplyCandidate[] = [
      { english: "Here is your room key. Would you like me to explain the breakfast time and hotel facilities?", chinese: "这是您的房卡。需要我介绍早餐时间和酒店设施吗？", intent: "hotel.room", pattern: "hotel-room" },
      { english: "Your room is ready. Is there anything you would like us to prepare before you go upstairs?", chinese: "您的房间已经准备好了。上楼前还需要我们准备什么吗？", intent: "hotel.request", pattern: "hotel-request" },
      { english: "Would you like to know about the gym, pool, or another hotel facility?", chinese: "你想了解健身房、泳池或其它酒店设施吗？", intent: "hotel.amenity", pattern: "hotel-amenity" },
      { english: "How many nights will you be staying with us?", chinese: "您计划入住几晚？", intent: "hotel.stay", pattern: "hotel-stay" },
      { english: "Is there anything in the room that is not working properly?", chinese: "房间里有没有什么设施不能正常使用？", intent: "hotel.problem", pattern: "hotel-problem" },
      { english: "Would you like a recommendation for a restaurant or café nearby?", chinese: "需要我推荐附近的餐厅或咖啡馆吗？", intent: "hotel.local", pattern: "hotel-local" },
      { english: "Would you like housekeeping to clean the room at a particular time?", chinese: "你希望客房服务在某个时间来打扫吗？", intent: "hotel.service", pattern: "hotel-service" },
      { english: "What time would you like to check out on your last day?", chinese: "最后一天你想什么时候退房？", intent: "hotel.checkout", pattern: "hotel-checkout" },
      { english: "What has been the best part of your stay so far?", chinese: "到目前为止，入住体验中最满意的是什么？", intent: "hotel.review", pattern: "hotel-review" },
      { english: "Is there anything else we can arrange to make your stay more comfortable?", chinese: "还有什么可以安排，让你的入住更舒适吗？", intent: "hotel.comfort", pattern: "hotel-comfort" },
    ];
    return chooseCandidate(userTurns <= 1 ? candidates.slice(0, 1) : candidates, history);
  }
  if (topic === "airport") {
    const candidates: ReplyCandidate[] = [
      { english: "Do you have any bags to check in today?", chinese: "今天有行李需要托运吗？", intent: "airport.baggage", pattern: "airport-baggage" },
      { english: "Would you prefer an aisle seat or a window seat for this flight?", chinese: "这趟航班您更喜欢靠过道还是靠窗的座位？", intent: "airport.seat", pattern: "airport-seat" },
      { english: "Your gate is on the right after security. Would you like directions?", chinese: "安检后右手边就是登机口。需要我告诉你怎么走吗？", intent: "airport.gate", pattern: "airport-gate" },
      { english: "Have you already gone through security, or do you need help finding it?", chinese: "你已经通过安检了吗？需要我帮你找安检口吗？", intent: "airport.security", pattern: "airport-security" },
      { english: "What time would you like to arrive at the gate before boarding?", chinese: "登机前你想提前多久到登机口？", intent: "airport.timing", pattern: "airport-timing" },
      { english: "Do you have a connecting flight after this one?", chinese: "这趟航班之后还要转机吗？", intent: "airport.transfer", pattern: "airport-transfer" },
      { english: "What would you like to eat or drink before the flight?", chinese: "登机前你想吃点或喝点什么？", intent: "airport.food", pattern: "airport-food" },
      { english: "What will you do first when you arrive?", chinese: "到达后你准备先做什么？", intent: "airport.arrival", pattern: "airport-arrival" },
      { english: "What are you most looking forward to about this trip?", chinese: "这次旅行中你最期待什么？", intent: "airport.trip", pattern: "airport-trip" },
      { english: "Would you like help finding transportation after you land?", chinese: "落地后需要我帮你找交通方式吗？", intent: "airport.transport", pattern: "airport-transport" },
    ];
    return chooseCandidate(userTurns <= 1 ? candidates.slice(0, 1) : candidates, history);
  }
  return null;
}

function topicReply(topic: Topic, scenario: SpeakingScenario, history: SpeakingMessage[], text: string, settings: SpeakingSettings): ReplyCandidate {
  const entities = extractEntities(text, history);
  const entity = entities.at(-1) || extractSubjectPhrase(text);
  const phrase = extractSubjectPhrase(text);
  const concise = settings.level === "beginner";
  switch (topic) {
    case "travel":
      if (entity) return chooseCandidate([
        { english: `What makes ${entity} special to you?`, chinese: `你觉得${entity}特别在哪里？`, intent: "travel.reason", pattern: "travel-reason" },
        { english: `What would you most like to do in ${entity}?`, chinese: `你最想在${entity}做什么？`, intent: "travel.activity", pattern: "travel-activity" },
        { english: `What local food would you like to try in ${entity}?`, chinese: `你想在${entity}尝试什么当地美食？`, intent: "travel.food", pattern: "travel-food" },
        { english: `Have you had a memorable experience in ${entity}?`, chinese: `你在${entity}有过什么难忘的经历吗？`, intent: "travel.experience", pattern: "travel-experience" },
        { english: `Who would you like to travel with to ${entity}?`, chinese: `你想和谁一起去${entity}旅行？`, intent: "travel.companion", pattern: "travel-companion" },
        { english: `What kind of place would you like to stay in there?`, chinese: `在那里旅行时，你想住什么样的地方？`, intent: "travel.accommodation", pattern: "travel-accommodation" },
        { english: `How would you like to get around ${entity}?`, chinese: `你想怎样在${entity}当地出行？`, intent: "travel.transport", pattern: "travel-transport" },
        { english: `How long would you like to stay in ${entity}?`, chinese: `你想在${entity}停留多久？`, intent: "travel.plan", pattern: "travel-plan" },
        { english: `What would you like to learn about the culture of ${entity}?`, chinese: `你想了解${entity}的哪些文化？`, intent: "travel.culture", pattern: "travel-culture" },
        { english: `What would make you want to visit ${entity} again?`, chinese: `什么会让你想再次去${entity}？`, intent: "travel.return", pattern: "travel-return" },
      ], history);
      return chooseCandidate([
        { english: concise ? "Where would you like to travel, and why?" : "Where would you like to travel next, and what makes that place appealing to you?", chinese: concise ? "你想去哪里旅行？为什么？" : "你接下来想去哪里旅行？那个地方最吸引你的是什么？", intent: "travel.destination", pattern: "travel-open" },
        { english: "Who would you most like to travel with?", chinese: "你最想和谁一起旅行？", intent: "travel.companion", pattern: "travel-companion-open" },
        { english: "What kind of activities do you enjoy on a trip?", chinese: "旅行时你喜欢参加什么活动？", intent: "travel.activity", pattern: "travel-activity-open" },
        { english: "What local food would you be curious to try?", chinese: "你想尝试什么当地美食？", intent: "travel.food", pattern: "travel-food-open" },
        { english: "How do you usually plan a trip?", chinese: "你通常怎样计划旅行？", intent: "travel.plan", pattern: "travel-plan-open" },
        { english: "What would you need to prepare before leaving?", chinese: "出发前你需要准备什么？", intent: "travel.prepare", pattern: "travel-prepare-open" },
        { english: "Where would you prefer to stay during a trip?", chinese: "旅行时你更喜欢住在哪里？", intent: "travel.accommodation", pattern: "travel-accommodation-open" },
        { english: "How do you like to get around a new city?", chinese: "在新城市里你喜欢怎样出行？", intent: "travel.transport", pattern: "travel-transport-open" },
        { english: "What makes a trip memorable for you?", chinese: "什么会让一次旅行令你难忘？", intent: "travel.experience", pattern: "travel-experience-open" },
        { english: "What place would you like to visit next?", chinese: "你下一站想去哪里？", intent: "travel.next", pattern: "travel-next-open" },
      ], history);
    case "food":
      return chooseCandidate([
        { english: entity ? `${entity} sounds delicious. What did you enjoy most about it?` : (concise ? "What food do you enjoy most?" : "What food do you enjoy most, and what makes it special?"), chinese: entity ? `${entity} 听起来很好吃。你最喜欢它的哪一点？` : "你最喜欢什么食物？它有什么特别之处？", intent: "food.preference", pattern: "food-preference" },
        { english: entity ? `How did you discover ${entity}, and would you order it again?` : "How did you discover one of your favorite foods?", chinese: entity ? `你是怎么发现 ${entity} 的？还会再点一次吗？` : "你是怎么发现自己喜欢的食物的？", intent: "food.discovery", pattern: "food-discovery" },
        { english: entity ? `When do you usually eat ${entity}?` : "When do you usually enjoy your favorite food?", chinese: entity ? `你通常什么时候吃${entity}？` : "你通常什么时候享用自己喜欢的食物？", intent: "food.occasion", pattern: "food-occasion" },
        { english: entity ? `Do you ever make ${entity} yourself?` : "Do you ever cook for yourself?", chinese: entity ? `你会自己做${entity}吗？` : "你会自己做饭吗？", intent: "food.cooking", pattern: "food-cooking" },
        { english: entity ? `What ingredients or flavors make ${entity} special?` : "What ingredients or flavors do you especially like?", chinese: entity ? `哪些食材或味道让${entity}与众不同？` : "你特别喜欢哪些食材或味道？", intent: "food.ingredients", pattern: "food-ingredients" },
        { english: entity ? `Where do you usually go when you want to eat ${entity}?` : "Where do you usually go for a good meal?", chinese: entity ? `你想吃${entity}时通常会去哪儿？` : "你通常会去哪儿吃一顿好饭？", intent: "food.restaurant", pattern: "food-restaurant" },
        { english: entity ? `Would you recommend ${entity} to a friend?` : "What food would you recommend to a friend?", chinese: entity ? `你会把${entity}推荐给朋友吗？` : "你会把什么食物推荐给朋友？", intent: "food.recommendation", pattern: "food-recommendation" },
        { english: entity ? `Do you have a memorable experience connected with ${entity}?` : "Do you have a memorable food experience?", chinese: entity ? `你有没有和${entity}有关的难忘经历？` : "你有没有难忘的美食经历？", intent: "food.memory", pattern: "food-memory" },
        { english: entity ? `How would you change ${entity} to suit your taste?` : "How would you change a dish to suit your taste?", chinese: entity ? `你会怎样调整${entity}来符合自己的口味？` : "你会怎样调整一道菜来符合自己的口味？", intent: "food.variation", pattern: "food-variation" },
        { english: "What food would you like to try next?", chinese: "你下一步想尝试什么食物？", intent: "food.next", pattern: "food-next" },
      ], history);
    case "work":
      return chooseCandidate([
        { english: entity ? `What kind of work do you do in ${entity}?` : (concise ? "What kind of work do you do?" : "What kind of work do you do, and what is your role?"), chinese: entity ? `你在${entity}从事什么工作？` : "你从事什么工作？你的职责是什么？", intent: "work.role", pattern: "work-role" },
        { english: "What does a typical day look like for you?", chinese: "你通常的一天是怎样的？", intent: "work.tasks", pattern: "work-tasks" },
        { english: "What part of your work is most challenging?", chinese: "你的工作中最有挑战的部分是什么？", intent: "work.challenge", pattern: "work-challenge" },
        { english: "Who do you usually work with?", chinese: "你通常和谁一起工作？", intent: "work.team", pattern: "work-team" },
        { english: "What skill helps you most at work?", chinese: "哪项技能对你的工作最有帮助？", intent: "work.skills", pattern: "work-skills" },
        { english: "What do you enjoy most about your work?", chinese: "你最喜欢工作中的哪一部分？", intent: "work.enjoyment", pattern: "work-enjoyment" },
        { english: "What would you like to improve next at work?", chinese: "你接下来想在工作中提升什么？", intent: "work.goal", pattern: "work-goal" },
        { english: "What result from your work are you proud of?", chinese: "你对工作中的什么成果最自豪？", intent: "work.result", pattern: "work-result" },
        { english: "How did you become interested in this field?", chinese: "你是怎样对这个领域产生兴趣的？", intent: "work.career", pattern: "work-career" },
        { english: "How do you manage your time during busy periods?", chinese: "忙碌的时候你怎样管理时间？", intent: "work.balance", pattern: "work-balance" },
        { english: "What are you working on today?", chinese: "你今天在忙什么工作？", intent: "work.topic", pattern: "work-topic" },
      ], history);
    case "movie":
      return chooseCandidate([
        { english: entity ? `${entity} sounds worth discussing. What did you enjoy most about it?` : "What movie or series have you watched recently?", chinese: entity ? `${entity} 很值得聊聊。你最喜欢它的哪一点？` : "你最近看了哪部电影或电视剧？", intent: entity ? "movie.opinion" : "movie.title", pattern: "movie-opinion" },
        { english: entity ? `What scene or character from ${entity} stayed in your mind?` : "What kind of movies or series do you enjoy?", chinese: entity ? `${entity} 里的哪个场景或角色让你印象最深？` : "你喜欢什么类型的电影或电视剧？", intent: entity ? "movie.detail" : "movie.genre", pattern: "movie-detail" },
        { english: entity ? `How did you feel about the ending of ${entity}?` : "What did you enjoy most about the last movie you watched?", chinese: entity ? `你觉得${entity}的结局怎么样？` : "你最近看的电影中最喜欢哪一点？", intent: entity ? "movie.ending" : "movie.opinion", pattern: "movie-ending" },
        { english: entity ? `What message or theme did you notice in ${entity}?` : "What message or theme do you look for in a good movie?", chinese: entity ? `你在${entity}中注意到了什么主题或信息？` : "一部好电影通常要有什么主题或表达？", intent: "movie.theme", pattern: "movie-theme" },
        { english: entity ? `When did you watch ${entity}, and who were you with?` : "When and where do you usually watch movies?", chinese: entity ? `你什么时候看的${entity}？和谁一起看的？` : "你通常什么时候、在哪里看电影？", intent: "movie.experience", pattern: "movie-experience" },
        { english: entity ? `What other movie is similar to ${entity}?` : "Which two movies would you compare?", chinese: entity ? `还有哪部电影和${entity}相似？` : "你会比较哪两部电影？", intent: "movie.comparison", pattern: "movie-comparison" },
        { english: entity ? `Would you recommend ${entity} to a friend?` : "What movie would you recommend to a friend?", chinese: entity ? `你会把${entity}推荐给朋友吗？` : "你会把哪部电影推荐给朋友？", intent: "movie.recommendation", pattern: "movie-recommendation" },
        { english: "What movie or series would you like to watch next?", chinese: "你下一部想看什么电影或电视剧？", intent: "movie.next", pattern: "movie-next" },
        { english: entity ? `Would you watch ${entity} again?` : "Is there a movie you would happily watch again?", chinese: entity ? `你还会再看${entity}吗？` : "有没有一部电影是你愿意重看的？", intent: "movie.rewatch", pattern: "movie-rewatch" },
        { english: "What makes a movie memorable for you?", chinese: "什么会让一部电影令你难忘？", intent: "movie.memory", pattern: "movie-memory" },
      ], history);
    case "shopping":
      return chooseCandidate([
        { english: entity ? `What are you looking for in ${entity}?` : "What are you looking for today?", chinese: entity ? `你在找什么样的${entity}？` : "你今天在找什么？", intent: "shopping.item", pattern: "shopping-item" },
        { english: "What color or size do you prefer?", chinese: "你更喜欢什么颜色或尺码？", intent: "shopping.preference", pattern: "shopping-preference" },
        { english: "What budget would you like to stay within?", chinese: "你的预算大概是多少？", intent: "shopping.budget", pattern: "shopping-budget" },
        { english: "Would you like to try it on and check the fit?", chinese: "你想试穿一下看看合不合身吗？", intent: "shopping.try", pattern: "shopping-try" },
        { english: "What helps you decide whether to buy something?", chinese: "什么会帮助你决定要不要买一样东西？", intent: "shopping.decision", pattern: "shopping-decision" },
        { english: "How important is quality or durability to you?", chinese: "质量或耐用性对你来说有多重要？", intent: "shopping.quality", pattern: "shopping-quality" },
        { english: "Do you prefer shopping in a store or online?", chinese: "你更喜欢在实体店还是网上购物？", intent: "shopping.store", pattern: "shopping-store" },
        { english: "Are you buying this for yourself or as a gift?", chinese: "你是买给自己，还是准备作为礼物？", intent: "shopping.gift", pattern: "shopping-gift" },
      ], history);
    case "study":
      return chooseCandidate([
        { english: "What part of English would you like to practice today?", chinese: "你今天想练习英语的哪一部分？", intent: "study.goal", pattern: "study-goal" },
        { english: "Which part of English feels most difficult for you right now?", chinese: "目前英语的哪一部分对你来说最难？", intent: "study.challenge", pattern: "study-challenge" },
        { english: "How often do you usually study English?", chinese: "你通常多久学习一次英语？", intent: "study.habit", pattern: "study-habit" },
        { english: "What book, app, or lesson helps you learn best?", chinese: "哪本书、哪个应用或哪节课最能帮助你学习？", intent: "study.resource", pattern: "study-resource" },
        { english: "What improvement have you noticed recently?", chinese: "你最近注意到自己有哪些进步？", intent: "study.progress", pattern: "study-progress" },
        { english: "What is your next English goal?", chinese: "你的下一个英语目标是什么？", intent: "study.goal_next", pattern: "study-goal-next" },
        { english: "When do you get to use English in a real situation?", chinese: "你什么时候会在真实场景中使用英语？", intent: "study.situation", pattern: "study-situation" },
      ], history);
    case "hobby":
      return chooseCandidate([
        { english: `You mentioned ${phrase || "an interest"}. How often do you make time for it?`, chinese: `你提到了${phrase || "一个兴趣"}。你多久会安排时间做一次？`, intent: "hobby.routine", pattern: "hobby-routine" },
        { english: `How did you start ${phrase || "this hobby"}?`, chinese: `你是怎样开始${phrase || "这个兴趣"}的？`, intent: "hobby.origin", pattern: "hobby-origin" },
        { english: `How do you feel when you do ${phrase || "it"}?`, chinese: `做${phrase || "这件事"}时你有什么感受？`, intent: "hobby.feeling", pattern: "hobby-feeling" },
        { english: `What do you like most about ${phrase || "this hobby"}?`, chinese: `你最喜欢${phrase || "这个兴趣"}的哪一点？`, intent: "hobby.detail", pattern: "hobby-detail" },
        { english: `What would you like to try or learn next in ${phrase || "this hobby"}?`, chinese: `关于${phrase || "这个兴趣"}，你下一步想尝试或学习什么？`, intent: "hobby.next", pattern: "hobby-next" },
      ], history);
    case "social":
      return chooseCandidate([
        { english: "That sounds like a good chance to connect. What did you talk about?", chinese: "那听起来是一次很好的交流机会。你们聊了些什么？", intent: "social.detail", pattern: "social-detail" },
        { english: "Who were you with at the gathering?", chinese: "聚会时你和谁在一起？", intent: "social.people", pattern: "social-people" },
        { english: "What was the most memorable part of the gathering?", chinese: "这次聚会中最难忘的部分是什么？", intent: "social.memory", pattern: "social-memory" },
        { english: "What did you think of the people you met?", chinese: "你觉得遇到的这些人怎么样？", intent: "social.opinion", pattern: "social-opinion" },
        { english: "Would you like to see them again next time?", chinese: "你下次还想再见到他们吗？", intent: "social.next", pattern: "social-next" },
      ], history);
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
