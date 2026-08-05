import type { TrendBrand, TrendItem } from "./types";

export const trendBrands: TrendBrand[] = [
  { id: "nike", name: "Nike", description: "运动、文化与日常生活方式。", website: "https://www.nike.com/", focus: "运动生活", tone: "bg-[#F3E5DE] text-[#B05F45]" },
  { id: "adidas", name: "adidas", description: "运动表现、Originals 与街头文化。", website: "https://www.adidas.com/", focus: "运动与街头", tone: "bg-[#E4E9F3] text-[#56709B]" },
  { id: "new-balance", name: "New Balance", description: "跑步基因与复古日常风格。", website: "https://www.newbalance.com/", focus: "跑步与复古", tone: "bg-[#E4EFF2] text-[#3D8190]" },
  { id: "asics", name: "ASICS", description: "以运动科学为基础的跑步与训练装备。", website: "https://www.asics.com/", focus: "跑步科技", tone: "bg-[#E8E5F6] text-[#6F64A4]" },
  { id: "hoka", name: "HOKA", description: "缓震、户外与城市运动体验。", website: "https://www.hoka.com/", focus: "户外缓震", tone: "bg-[#E6F0E4] text-[#4F855A]" },
  { id: "salomon", name: "Salomon", description: "越野、户外和城市机能风格。", website: "https://www.salomon.com/", focus: "户外机能", tone: "bg-[#F3EAD9] text-[#9A7442]" },
  { id: "supreme", name: "Supreme", description: "滑板文化、街头联名与限量设计。", website: "https://supreme.com/", focus: "街头文化", tone: "bg-[#F5E2E4] text-[#A64C5C]" },
  { id: "stussy", name: "Stüssy", description: "海岸文化、音乐与经典街头表达。", website: "https://www.stussy.com/", focus: "街头生活", tone: "bg-[#EEE6F2] text-[#805C9C]" },
];

export const trendItems: TrendItem[] = [
  { id: "trend-01", kind: "trend", label: "今日潮流", title: "运动鞋正在成为日常穿搭的视觉中心", summary: "从功能装备到城市日常，鞋款轮廓、材质和配色正在影响整套造型的节奏。", sourceName: "NOVA 编辑观察", publishedAt: "今日精选", tags: ["运动生活", "日常穿搭"], tone: "from-[#E8E5FB] to-[#F6F3FF]" },
  { id: "trend-02", kind: "trend", label: "今日潮流", title: "轻户外风格继续进入城市生活", summary: "机能面料、宽松轮廓与低饱和配色，让户外单品更容易融入通勤和周末场景。", sourceName: "NOVA 编辑观察", publishedAt: "今日精选", tags: ["轻户外", "城市机能"], tone: "from-[#E3F1ED] to-[#F4FAF8]" },
  { id: "new-01", kind: "new", label: "今日新品", title: "Nike 官方产品资讯入口", summary: "查看 Nike 最新产品新闻、系列发布和品牌故事，不在工作台内展示价格或购买入口。", sourceName: "Nike Newsroom", sourceUrl: "https://www.nike.com/product-news/", publishedAt: "持续更新", tags: ["新品", "品牌资讯"], brand: "Nike", tone: "from-[#F8E7E2] to-[#FFF8F5]" },
  { id: "new-02", kind: "new", label: "今日新品", title: "adidas Originals 官方资讯入口", summary: "关注 Originals、运动系列和联名项目的官方新闻与视觉发布。", sourceName: "adidas NEWS", sourceUrl: "https://news.adidas.com/", publishedAt: "持续更新", tags: ["新品", "Originals"], brand: "adidas", tone: "from-[#E6EDF7] to-[#F7FAFF]" },
  { id: "new-03", kind: "new", label: "今日新品", title: "ASICS 官方新闻与产品发布", summary: "从官方新闻页了解跑步、训练和运动科技相关的最新发布。", sourceName: "ASICS Press", sourceUrl: "https://corp.asics.com/en/press", publishedAt: "持续更新", tags: ["跑步", "运动科技"], brand: "ASICS", tone: "from-[#ECE8FA] to-[#FAF8FF]" },
  { id: "new-04", kind: "new", label: "今日新品", title: "New Balance 官方新闻入口", summary: "查看 New Balance 的品牌新闻、运动员合作和系列资讯。", sourceName: "New Balance News Release", sourceUrl: "https://company.newbalance.jp/press", publishedAt: "持续更新", tags: ["跑步", "复古"], brand: "New Balance", tone: "from-[#E6F0F2] to-[#F8FCFD]" },
  { id: "outfit-01", kind: "outfit", label: "今日穿搭", title: "低饱和配色 + 一双有轮廓感的运动鞋", summary: "用米色、灰色或深蓝打底，把视觉重点留给鞋款或配件，适合通勤与周末切换。", sourceName: "NOVA 灵感整理", publishedAt: "穿搭灵感", tags: ["低饱和", "通勤"], tone: "from-[#F4ECDD] to-[#FFFCF6]" },
  { id: "outfit-02", kind: "outfit", label: "今日穿搭", title: "宽松上装 + 直筒裤的轻松比例", summary: "保持上下装都有一点空间感，再用简洁鞋款收束整体，避免造型显得过于用力。", sourceName: "NOVA 灵感整理", publishedAt: "穿搭灵感", tags: ["宽松轮廓", "日常"], tone: "from-[#E7EEF2] to-[#F9FCFD]" },
  { id: "outfit-03", kind: "outfit", label: "今日穿搭", title: "轻户外单品作为一处点缀", summary: "不必整套户外化，加入一件机能马甲、越野鞋或轻量外套即可改变日常造型的气质。", sourceName: "NOVA 灵感整理", publishedAt: "穿搭灵感", tags: ["轻户外", "分层"], tone: "from-[#E7F0E5] to-[#FAFFFA]" },
  { id: "article-01", kind: "article", label: "文章推荐", title: "Nike Newsroom｜品牌、产品与运动文化", summary: "适合用来了解 Nike 官方发布的产品新闻、运动文化和设计故事。", sourceName: "Nike 官方", sourceUrl: "https://about.nike.com/en/newsroom", publishedAt: "持续更新", tags: ["品牌", "设计"], tone: "from-[#F0E7E1] to-[#FFFAF8]" },
  { id: "article-02", kind: "article", label: "文章推荐", title: "adidas NEWS｜运动、创新与 Originals", summary: "从官方新闻流中了解 adidas 的运动项目、技术创新和 Originals 内容。", sourceName: "adidas 官方", sourceUrl: "https://news.adidas.com/", publishedAt: "持续更新", tags: ["创新", "街头"], tone: "from-[#E7EDF6] to-[#FAFCFF]" },
  { id: "article-03", kind: "article", label: "文章推荐", title: "ASICS Press｜运动科学与品牌资讯", summary: "关注跑步、训练、运动科学和品牌活动相关的公开资料。", sourceName: "ASICS 官方", sourceUrl: "https://corp.asics.com/en/press", publishedAt: "持续更新", tags: ["跑步", "科技"], tone: "from-[#ECE9F8] to-[#FCFAFF]" },
  { id: "video-01", kind: "video", label: "视频推荐", title: "Nike 官方频道", summary: "品牌故事、运动员内容和系列视频，点击后跳转至 YouTube 官方频道。", sourceName: "Nike Official on YouTube", sourceUrl: "https://www.youtube.com/@nike", publishedAt: "官方频道", tags: ["视频", "运动文化"], brand: "Nike", tone: "from-[#F6E6E3] to-[#FFF9F8]" },
  { id: "video-02", kind: "video", label: "视频推荐", title: "adidas 官方频道", summary: "运动、Originals 与品牌项目视频，点击后跳转至 YouTube 官方频道。", sourceName: "adidas Official on YouTube", sourceUrl: "https://www.youtube.com/@adidas", publishedAt: "官方频道", tags: ["视频", "Originals"], brand: "adidas", tone: "from-[#E5ECF7] to-[#FAFCFF]" },
  { id: "video-03", kind: "video", label: "视频推荐", title: "New Balance 官方频道", summary: "跑步、运动员和品牌故事内容，点击后跳转至 YouTube 官方频道。", sourceName: "New Balance on YouTube", sourceUrl: "https://www.youtube.com/@newbalance", publishedAt: "官方频道", tags: ["视频", "跑步"], brand: "New Balance", tone: "from-[#E6F0F2] to-[#FAFFFF]" },
  { id: "video-04", kind: "video", label: "视频推荐", title: "ASICS 官方频道", summary: "跑步训练、运动科技和品牌内容，点击后跳转至 YouTube 官方频道。", sourceName: "ASICS on YouTube", sourceUrl: "https://www.youtube.com/@ASICS", publishedAt: "官方频道", tags: ["视频", "训练"], brand: "ASICS", tone: "from-[#EDE9F8] to-[#FCFAFF]" },
];
