import type { TrendItem, TrendOutfitTheme } from "./types";

export const trendOutfitThemes: TrendOutfitTheme[] = [
  { id: "city-boy", title: "City Boy", reason: "今天从宽松比例、运动鞋和轻户外单品中提取城市穿搭灵感。", suitableFor: "通勤、城市漫步、周末咖啡", tags: ["宽松比例", "城市户外"], tone: "from-[#E7EEF2] to-[#F9FCFD]" },
  { id: "clean-fit", title: "Clean Fit", reason: "今天用干净的色彩和清晰的轮廓，保留运动单品的轻松感。", suitableFor: "日常通勤、见朋友、旅行", tags: ["低饱和", "简洁"], tone: "from-[#E8E5FB] to-[#F7F4FF]" },
  { id: "american-retro", title: "美式复古", reason: "今天关注经典运动鞋、复古运动服和有层次的休闲搭配。", suitableFor: "周末出行、看展、音乐现场", tags: ["复古运动", "层次感"], tone: "from-[#F4ECDD] to-[#FFFCF6]" },
  { id: "outdoor-urban", title: "户外城市", reason: "今天把轻量户外功能带进城市日常，重点观察材质和实用细节。", suitableFor: "城市通勤、短途出行、轻户外", tags: ["功能面料", "轻户外"], tone: "from-[#E7F0E5] to-[#FAFFFA]" },
  { id: "sport-leisure", title: "运动休闲", reason: "今天从运动场景出发，看看舒适轮廓如何自然进入日常穿着。", suitableFor: "运动前后、周末休闲、日常出行", tags: ["运动感", "舒适"], tone: "from-[#F6E6E3] to-[#FFF9F8]" },
  { id: "japanese-workwear", title: "日系工装", reason: "今天观察宽松剪裁、耐用材质和克制配色如何形成稳定的日常风格。", suitableFor: "通勤、城市探索、周末活动", tags: ["工装", "克制配色"], tone: "from-[#EEE6F2] to-[#FCF8FF]" },
];

export const outfitArticles: TrendItem[] = [
  {
    id: "outfit-article-01",
    kind: "article",
    label: "今日穿搭文章",
    title: "Nike Styling Tips：从运动单品出发的穿搭灵感",
    summary: "Nike 官方 Styling Tips 页面，集中整理运动服装、鞋款和日常场景的穿搭建议。",
    recommendation: "这篇内容适合观察运动单品如何进入日常搭配。页面覆盖多个场景，适合在夏季通勤和周末出行前快速浏览。",
    sourceName: "Nike 官方 Product Advice",
    sourceUrl: "https://www.nike.com/product-advice/styling-tips",
    publishedAt: "页面持续更新",
    tags: ["运动休闲", "日常穿搭"],
    brand: "Nike",
    tone: "from-[#F6E6E3] to-[#FFF9F8]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-article-02",
    kind: "article",
    label: "今日穿搭文章",
    title: "How To Style Superstars：adidas Superstar 场景穿搭",
    summary: "adidas 官方造型文章，围绕 Superstar 分享办公、音乐现场和日常出行的搭配思路。",
    recommendation: "这篇内容适合喜欢经典鞋款和低饱和配色的人。它把同一双鞋放进不同场景，方便比较正式感与休闲感的变化。",
    sourceName: "adidas 官方 Blog",
    sourceUrl: "https://www.adidas.com/us/blog/how-to-style-superstars-outfit-inspiration-for-any-occasion",
    publishedAt: "2026年3月",
    tags: ["Clean Fit", "经典鞋款"],
    brand: "adidas",
    tone: "from-[#E7EDF6] to-[#FAFCFF]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-article-03",
    kind: "article",
    label: "今日穿搭文章",
    title: "How To Style A Soccer Jersey：球衣进入日常街头",
    summary: "adidas 官方文章，讨论球衣的层次、比例和配件组合，适合寻找运动街头灵感。",
    recommendation: "这篇内容适合想把运动元素穿得更轻松的人。可以重点观察球衣与日常下装、外套之间的比例关系。",
    sourceName: "adidas 官方 Blog",
    sourceUrl: "https://www.adidas.com/us/blog/1033157-how-to-style-a-soccer-jersey",
    publishedAt: "2026年5月",
    tags: ["美式复古", "运动街头"],
    brand: "adidas",
    tone: "from-[#E5ECF7] to-[#FAFCFF]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-article-04",
    kind: "article",
    label: "今日穿搭文章",
    title: "How To Style The adidas Samba：Samba 的多场景搭配",
    summary: "adidas 官方造型指南，围绕 Samba 展示从日常到工作场景的多种穿搭方向。",
    recommendation: "这篇内容适合建立一双经典鞋款的搭配思路。它更适合春夏和换季时参考轻层次、平衡感与颜色呼应。",
    sourceName: "adidas 官方 Blog",
    sourceUrl: "https://www.adidas.com/us/blog/how-to-style-the-adidas-samba-5-outfits-and-ideas",
    publishedAt: "2025年5月",
    tags: ["经典鞋款", "日常通勤"],
    brand: "adidas",
    tone: "from-[#E7EDF6] to-[#FAFCFF]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-article-05",
    kind: "article",
    label: "今日穿搭文章",
    title: "HOKA Blog：跑步、户外与城市生活的穿着灵感",
    summary: "HOKA 官方 Blog 入口，包含跑步、徒步和城市活动相关的公开内容。",
    recommendation: "这篇入口适合观察户外功能如何转化为城市穿着语言。更适合春夏短途出行和轻户外场景的灵感收集。",
    sourceName: "HOKA 官方 Blog",
    sourceUrl: "https://au.hoka.com/blog",
    publishedAt: "页面持续更新",
    tags: ["户外城市", "轻户外"],
    brand: "HOKA",
    tone: "from-[#E7F0E5] to-[#FAFFFA]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-article-06",
    kind: "article",
    label: "今日穿搭文章",
    title: "adidas Style：官方风格灵感文章集合",
    summary: "adidas 官方 Style 栏目，持续更新球衣、Superstar 和日常风格相关内容。",
    recommendation: "这篇集合适合想持续浏览穿搭内容的人。可以按自己的场景筛选，不需要把单一造型直接照搬。",
    sourceName: "adidas 官方 Style",
    sourceUrl: "https://www.adidas.com/us/blog/Style",
    publishedAt: "页面持续更新",
    tags: ["风格灵感", "持续更新"],
    brand: "adidas",
    tone: "from-[#E7EDF6] to-[#FAFCFF]",
    featuredInOutfit: true,
  },
];

export const outfitVideos: TrendItem[] = [
  {
    id: "outfit-video-01",
    kind: "video",
    label: "今日穿搭视频",
    title: "Nike 官方视频：运动与生活方式内容",
    summary: "打开 Nike 官方 YouTube 视频页，浏览品牌故事、运动员和生活方式相关公开视频。",
    recommendation: "适合从视觉内容观察运动风格和品牌叙事。视频列表会随官方频道更新，适合每天快速浏览最新内容。",
    sourceName: "Nike Official on YouTube",
    sourceUrl: "https://www.youtube.com/@nike/videos",
    publishedAt: "官方频道持续更新",
    tags: ["运动休闲", "品牌故事"],
    brand: "Nike",
    tone: "from-[#F6E6E3] to-[#FFF9F8]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-video-02",
    kind: "video",
    label: "今日穿搭视频",
    title: "adidas 官方视频：Originals 与运动文化",
    summary: "打开 adidas 官方 YouTube 视频页，浏览 Originals、运动项目和品牌文化相关公开视频。",
    recommendation: "适合观察复古运动与街头文化的视觉表达。视频内容适合周末和城市出行前获取快速灵感。",
    sourceName: "adidas Official on YouTube",
    sourceUrl: "https://www.youtube.com/@adidas/videos",
    publishedAt: "官方频道持续更新",
    tags: ["美式复古", "Originals"],
    brand: "adidas",
    tone: "from-[#E5ECF7] to-[#FAFCFF]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-video-03",
    kind: "video",
    label: "今日穿搭视频",
    title: "New Balance 官方视频：跑步与日常风格",
    summary: "打开 New Balance 官方 YouTube 视频页，浏览跑步、运动员和品牌故事相关公开视频。",
    recommendation: "适合观察复古跑鞋和日常休闲风格的结合。视频列表持续变化，可以每天浏览不同的品牌内容。",
    sourceName: "New Balance on YouTube",
    sourceUrl: "https://www.youtube.com/@newbalance/videos",
    publishedAt: "官方频道持续更新",
    tags: ["City Boy", "复古跑鞋"],
    brand: "New Balance",
    tone: "from-[#E6F0F2] to-[#FAFFFF]",
    featuredInOutfit: true,
  },
  {
    id: "outfit-video-04",
    kind: "video",
    label: "今日穿搭视频",
    title: "ASICS 官方视频：运动科技与训练内容",
    summary: "打开 ASICS 官方 YouTube 视频页，浏览运动科技、训练和品牌内容。",
    recommendation: "适合关注运动功能和训练场景的人。推荐从鞋服结构、动作场景和配色中寻找可转化到日常的细节。",
    sourceName: "ASICS on YouTube",
    sourceUrl: "https://www.youtube.com/@ASICS/videos",
    publishedAt: "官方频道持续更新",
    tags: ["运动科技", "功能风格"],
    brand: "ASICS",
    tone: "from-[#EDE9F8] to-[#FCFAFF]",
    featuredInOutfit: true,
  },
];

function dayNumber(date: Date): number {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
}

function rotate<T>(items: T[], offset: number, count: number): T[] {
  return Array.from({ length: Math.min(count, items.length) }, (_, index) => items[(offset + index) % items.length]);
}

export function getDailyOutfitContent(date = new Date()): { theme: TrendOutfitTheme; items: TrendItem[] } {
  const index = dayNumber(date);
  const theme = trendOutfitThemes[index % trendOutfitThemes.length];
  const articles = rotate(outfitArticles, index % outfitArticles.length, 4);
  const videos = rotate(outfitVideos, index % outfitVideos.length, 4);
  return { theme, items: [...articles, ...videos] };
}
