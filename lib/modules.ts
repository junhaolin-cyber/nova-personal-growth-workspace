import type { LucideIcon } from "lucide-react";
import { BookOpen, Brain, CircleDollarSign, Dumbbell, Languages, LineChart, Mic2, Newspaper, NotebookPen, ReceiptText, Utensils, CheckSquare2 } from "lucide-react";

export type ModuleDefinition = { slug: string; label: string; labelEn: string; description: string; descriptionEn: string; icon: LucideIcon; tone: string; meta: string; metaEn: string };

export const modules: ModuleDefinition[] = [
  { slug: "today", label: "今日计划", labelEn: "Today", description: "把今天变得清晰而可执行", descriptionEn: "Make today clear and actionable", icon: CheckSquare2, tone: "bg-[#E7E9FF] text-[#5452C7]", meta: "3 项待完成", metaEn: "3 open" },
  { slug: "english", label: "英语学习", labelEn: "English", description: "每天一点，持续积累", descriptionEn: "A little every day", icon: Languages, tone: "bg-[#DDEFE4] text-[#43845D]", meta: "连续 12 天", metaEn: "12 day streak" },
  { slug: "speaking", label: "AI 口语", labelEn: "AI Speaking", description: "和 AI 自然地聊一会儿", descriptionEn: "Practice naturally with AI", icon: Mic2, tone: "bg-[#F7E5D5] text-[#B26F3C]", meta: "开始练习", metaEn: "Start a session" },
  { slug: "finance", label: "理财学习", labelEn: "Finance", description: "建立自己的长期判断力", descriptionEn: "Build long-term judgement", icon: CircleDollarSign, tone: "bg-[#E9E5FA] text-[#7D68B7]", meta: "本周 2 个主题", metaEn: "2 topics this week" },
  { slug: "books", label: "读书笔记", labelEn: "Book Notes", description: "让读过的书真正留下来", descriptionEn: "Keep what you read", icon: BookOpen, tone: "bg-[#F6E6E0] text-[#B66352]", meta: "18 本在读", metaEn: "18 books" },
  { slug: "ledger", label: "记账本", labelEn: "Ledger", description: "看见每一笔钱的去向", descriptionEn: "See where your money goes", icon: ReceiptText, tone: "bg-[#DCEEF1] text-[#3D8290]", meta: "本月 ¥ 4,280", metaEn: "¥4,280 this month" },
  { slug: "food", label: "美食日记", labelEn: "Food Journal", description: "记录那些值得再去的味道", descriptionEn: "Remember flavours worth revisiting", icon: Utensils, tone: "bg-[#F8E7D4] text-[#C07C3F]", meta: "本月 6 条记录", metaEn: "6 entries" },
  { slug: "exercise", label: "运动打卡", labelEn: "Exercise", description: "照顾身体，也照顾能量", descriptionEn: "Care for your body and energy", icon: Dumbbell, tone: "bg-[#E0F0E2] text-[#4F9060]", meta: "连续 5 天", metaEn: "5 day streak" },
  { slug: "news", label: "新闻资讯", labelEn: "News", description: "只关注真正重要的事", descriptionEn: "Focus on what matters", icon: Newspaper, tone: "bg-[#E5EBF4] text-[#55739B]", meta: "今日 8 条精选", metaEn: "8 highlights" },
  { slug: "stocks", label: "股票行情", labelEn: "Stocks", description: "保持关注，不被噪音牵着走", descriptionEn: "Stay informed, ignore the noise", icon: LineChart, tone: "bg-[#F1E9DE] text-[#9A774C]", meta: "自选 12 只", metaEn: "12 watchlist items" },
  { slug: "assistant", label: "AI 助手", labelEn: "AI Assistant", description: "把想法交给一个可靠的伙伴", descriptionEn: "A reliable partner for your ideas", icon: Brain, tone: "bg-[#E8E7F7] text-[#625FA8]", meta: "随时可用", metaEn: "Always ready" },
];

export const moduleMap = Object.fromEntries(modules.map((item) => [item.slug, item]));
