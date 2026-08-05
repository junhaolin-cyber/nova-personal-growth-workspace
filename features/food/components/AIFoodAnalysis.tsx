"use client";

import { AlertCircle, CheckCircle2, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import type { FoodAnalysis } from "../types";

export function AIFoodAnalysis({ analysis }: { analysis: FoodAnalysis }) {
  return <section className="rounded-[24px] border border-[#DDD9F2] bg-[#FAF9FF] p-6 shadow-card sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-[#7463B1]"><Sparkles size={16} />AI 探店分析</p><h3 className="mt-2 text-xl font-extrabold">先把信息看清楚，再决定要不要去</h3></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#7463B1]">{analysis.recommendationIndex}</span></div><p className="mt-5 text-sm leading-7 text-muted">{analysis.summary}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><AnalysisList title="适合场景" icon={<CheckCircle2 size={16} />} items={analysis.suitableFor} tone="text-[#43845D]" /><AnalysisList title="行动建议" icon={<Lightbulb size={16} />} items={analysis.suggestions} tone="text-[#B26F3C]" /><AnalysisList title="需要留意" icon={<ShieldAlert size={16} />} items={analysis.cautions} tone="text-[#B26F3C]" /><div className="rounded-2xl border border-white bg-white/70 p-4"><p className="flex items-center gap-2 text-xs font-bold text-muted"><AlertCircle size={15} />资料边界</p><p className="mt-2 text-xs leading-6 text-muted">{analysis.basis}</p></div></div></section>;
}

function AnalysisList({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: string[]; tone: string }) {
  return <div className="rounded-2xl border border-white bg-white/70 p-4"><p className={`flex items-center gap-2 text-xs font-bold ${tone}`}>{icon}{title}</p><ul className="mt-3 space-y-2 text-sm leading-6 text-muted">{items.map((item) => <li key={item}>· {item}</li>)}</ul></div>;
}

