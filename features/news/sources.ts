import type { NewsCategory, NewsSource } from "./types";

const now = "2026-08-05T00:00:00.000Z";

export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: "gdelt",
    name: "GDELT 全球新闻数据",
    domain: "gdeltproject.org",
    sourceType: "gdelt",
    language: "多语言",
    countryOrRegion: "全球",
    categories: ["推荐", "国际", "时政", "社会", "财经", "科技", "体育", "环境", "军事"],
    homepageUrl: "https://www.gdeltproject.org/",
    isEnabled: true,
    reliabilityNote: "公开新闻研究数据源，适合跨来源检索和事件发现。",
    usageNote: "仅展示标题、摘要、来源和原文链接，不复制完整正文。",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cns-rss",
    name: "中新网 RSS",
    domain: "chinanews.com.cn",
    sourceType: "official-rss",
    language: "中文",
    countryOrRegion: "中国",
    categories: ["国内", "时政", "社会", "财经", "体育", "文化", "娱乐", "健康", "教育"],
    rssUrl: "https://www.chinanews.com.cn/rss/scroll-news.xml",
    homepageUrl: "https://www.chinanews.com/",
    isEnabled: false,
    reliabilityNote: "新闻机构公开 RSS，分类覆盖较广。",
    usageNote: "网站声明稿件使用需书面授权；确认授权或个人使用范围后再启用。",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "xinhua-en-rss",
    name: "新华社英文 RSS",
    domain: "xinhuanet.com",
    sourceType: "official-rss",
    language: "英文",
    countryOrRegion: "中国 / 国际",
    categories: ["国际", "国内", "财经", "科技", "体育", "文化", "娱乐", "健康"],
    rssUrl: "https://www.xinhuanet.com/english/rss/index.htm",
    homepageUrl: "https://english.news.cn/",
    isEnabled: false,
    reliabilityNote: "新华社英文站公开 RSS 入口。",
    usageNote: "仅在确认具体 Feed 地址和展示授权后启用。",
    createdAt: now,
    updatedAt: now,
  },
];

export const CATEGORY_QUERIES: Record<NewsCategory, string> = {
  推荐: "(world OR China OR economy OR technology OR sports OR health)",
  国内: "(China OR 中国 OR 国内)",
  国际: "(world OR international OR 国际 OR global)",
  时政: "(politics OR government OR election OR 政策 OR 政治)",
  社会: "(society OR social OR 社会 OR public)",
  财经: "(economy OR finance OR business OR market OR 财经 OR 经济)",
  科技: "(technology OR science OR AI OR 科技 OR 科学)",
  体育: "(sports OR football OR basketball OR 体育 OR 足球 OR 篮球)",
  文化: "(culture OR art OR 文化 OR 艺术)",
  娱乐: "(entertainment OR film OR music OR 娱乐 OR 电影)",
  健康: "(health OR medicine OR 健康 OR 医疗)",
  教育: "(education OR school OR 教育 OR 学校)",
  环境: "(climate OR environment OR 环境 OR 气候)",
  军事: "(military OR defense OR conflict OR 军事 OR 国防)",
  其他: "(news OR 新闻)",
};

export function getSourceById(id: string, sources: NewsSource[] = DEFAULT_NEWS_SOURCES): NewsSource | undefined {
  return sources.find((source) => source.id === id);
}
