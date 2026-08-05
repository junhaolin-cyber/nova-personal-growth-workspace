"use client";

import * as React from "react";
import { ArrowRight, BriefcaseBusiness, Coffee, Globe2, Plane, Sparkles } from "lucide-react";
import type { SpeakingCategory, SpeakingScenario } from "../types";
import { categoryLabels, difficultyLabels } from "../scenarios";

type Filter = "all" | "beginner" | "intermediate" | "advanced" | SpeakingCategory;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "全部" }, { value: "beginner", label: "初级" }, { value: "intermediate", label: "中级" }, { value: "advanced", label: "高级" }, { value: "daily", label: "日常" }, { value: "travel", label: "旅行" }, { value: "work", label: "职场" }, { value: "interview", label: "面试" },
];

function categoryIcon(category: SpeakingCategory) {
  if (category === "travel") return Plane;
  if (category === "work" || category === "interview") return BriefcaseBusiness;
  if (category === "daily") return Coffee;
  return Globe2;
}

export function ScenarioSelector({ scenarios, selectedId, onStart }: { scenarios: SpeakingScenario[]; selectedId: string | null; onStart: (scenario: SpeakingScenario) => void }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const filtered = scenarios.filter((scenario) => filter === "all" || scenario.difficulty === filter || scenario.category === filter);
  return <section className="rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="flex items-center gap-2 text-sm font-semibold text-accent"><Sparkles size={16} />选择一个情景，开始开口</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">今天想练什么？</h2><p className="mt-2 text-sm text-muted">先用熟悉的生活场景热身，AI 会根据你的回答自然追问。</p></div><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === item.value ? "bg-ink text-white" : "bg-canvas text-muted hover:text-ink"}`}>{item.label}</button>)}</div></div><div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((scenario) => { const Icon = categoryIcon(scenario.category); const isSelected = selectedId === scenario.id; return <button key={scenario.id} type="button" onClick={() => onStart(scenario)} className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card ${isSelected ? "border-accent bg-[#F5F4FF]" : "border-line bg-white hover:border-[#C9C8FA]"}`}><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#F0F0FF] text-accent"><Icon size={18} /></div><ArrowRight size={17} className="text-muted transition group-hover:translate-x-1 group-hover:text-accent" /></div><h3 className="mt-4 font-bold">{scenario.titleZh}<span className="ml-2 text-xs font-medium text-muted">{scenario.titleEn}</span></h3><p className="mt-2 min-h-[40px] text-xs leading-5 text-muted">{scenario.description}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted"><span className="rounded-lg bg-canvas px-2 py-1">{difficultyLabels[scenario.difficulty]}</span><span className="rounded-lg bg-canvas px-2 py-1">{categoryLabels[scenario.category]}</span><span>{scenario.durationMinutes} 分钟</span></div></button>; })}</div>{filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">没有符合条件的情景。</p>}</section>;
}
