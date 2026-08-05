import { ShieldAlert } from "lucide-react";

export function FinanceDisclaimer() { return <div className="flex items-start gap-3 rounded-2xl border border-[#E8D6B8] bg-[#FFF8EC] px-4 py-3 text-sm leading-6 text-[#8A6C49]"><ShieldAlert size={18} className="mt-1 shrink-0" /><p><span className="font-bold">学习边界：</span>本模块只提供个人财经教育、概念解释和风险识别练习，不推荐具体股票、基金，不预测涨跌，不提供买卖时机或个性化投资方案。</p></div>; }
