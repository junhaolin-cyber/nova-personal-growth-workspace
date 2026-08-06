import type { LucideIcon } from "lucide-react";
import { CheckSquare2, CircleDollarSign, Clapperboard, Compass, Dumbbell, Languages, Mic2, Newspaper, ReceiptText, Utensils } from "lucide-react";

export type ModuleDefinition = { slug: string; label: string; labelEn: string; description: string; descriptionEn: string; icon: LucideIcon; tone: string; iconColor: string; meta: string; metaEn: string };

export const modules: ModuleDefinition[] = [
  { slug: "today", label: "今日计划", labelEn: "Today", description: "把今天变得清晰而可执行", descriptionEn: "Make today clear and actionable", icon: CheckSquare2, tone: "bg-[#E7E9FF] text-[#5452C7]", iconColor: "text-[#5E5CE6]", meta: "3 项待完成", metaEn: "3 open" },
  { slug: "english", label: "英语学习", labelEn: "English", description: "每天一点，持续积累", descriptionEn: "A little every day", icon: Languages, tone: "bg-[#DDEFE4] text-[#43845D]", iconColor: "text-[#43845D]", meta: "连续 12 天", metaEn: "12 day streak" },
  { slug: "speaking", label: "AI 口语", labelEn: "AI Speaking", description: "和 AI 自然地聊一会儿", descriptionEn: "Practice naturally with AI", icon: Mic2, tone: "bg-[#F7E5D5] text-[#B26F3C]", iconColor: "text-[#B26F3C]", meta: "开始练习", metaEn: "Start a session" },
  { slug: "finance", label: "理财学习", labelEn: "Finance", description: "建立自己的长期判断力", descriptionEn: "Build long-term judgement", icon: CircleDollarSign, tone: "bg-[#E9E5FA] text-[#7D68B7]", iconColor: "text-[#7D68B7]", meta: "本周 2 个主题", metaEn: "2 topics this week" },
  { slug: "ledger", label: "记账本", labelEn: "Ledger", description: "看见每一笔钱的去向", descriptionEn: "See where your money goes", icon: ReceiptText, tone: "bg-[#DCEEF1] text-[#3D8290]", iconColor: "text-[#3D8290]", meta: "本月 ¥ 4,280", metaEn: "¥4,280 this month" },
  { slug: "food", label: "美食日记", labelEn: "Food Journal", description: "记录那些值得再去的味道", descriptionEn: "Remember flavours worth revisiting", icon: Utensils, tone: "bg-[#F8E7D4] text-[#C07C3F]", iconColor: "text-[#C07C3F]", meta: "本月 6 条记录", metaEn: "6 entries" },
  { slug: "exercise", label: "运动打卡", labelEn: "Exercise", description: "照顾身体，也照顾能量", descriptionEn: "Care for your body and energy", icon: Dumbbell, tone: "bg-[#E0F0E2] text-[#4F9060]", iconColor: "text-[#4F9060]", meta: "连续 5 天", metaEn: "5 day streak" },
  { slug: "news", label: "新闻资讯", labelEn: "News", description: "只关注真正重要的事", descriptionEn: "Focus on what matters", icon: Newspaper, tone: "bg-[#E5EBF4] text-[#55739B]", iconColor: "text-[#55739B]", meta: "今日 8 条精选", metaEn: "8 highlights" },
  { slug: "trend-life", label: "潮流生活", labelEn: "Trend Life", description: "发现潮流、品牌与生活灵感", descriptionEn: "Discover style, brands and inspiration", icon: Compass, tone: "bg-[#F0E7F6] text-[#8A5BA6]", iconColor: "text-[#8A5BA6]", meta: "每日发现灵感", metaEn: "Daily inspiration" },
  { slug: "movies-tv", label: "电影电视", labelEn: "Movies & TV", description: "记录值得观看的好故事", descriptionEn: "Keep track of stories worth watching", icon: Clapperboard, tone: "bg-[#E4EDF5] text-[#557B9C]", iconColor: "text-[#557B9C]", meta: "我的片单", metaEn: "My watchlist" },
];

export const moduleMap = Object.fromEntries(modules.map((item) => [item.slug, item]));

export const activeIconShapes: Record<string, string> = {
  today: "rounded-xl",
  english: "rounded-full",
  speaking: "rounded-[11px] -rotate-3",
  finance: "rounded-full",
  ledger: "rounded-[8px]",
  food: "rounded-full rotate-3",
  exercise: "rounded-[10px] rotate-3",
  news: "rounded-[8px]",
  "trend-life": "rounded-[12px] rotate-2",
  "trend-sports": "rounded-[10px] -rotate-3",
  "movies-tv": "rounded-[7px] rotate-2",
};
