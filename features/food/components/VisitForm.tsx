"use client";

import * as React from "react";
import type { VisitRecord } from "../types";

export type VisitInput = Omit<VisitRecord, "id" | "restaurantId">;

interface VisitFormProps { onSave: (input: VisitInput) => void; onCancel: () => void; }

export function VisitForm({ onSave, onCancel }: VisitFormProps) {
  const [visitedAt, setVisitedAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [dishes, setDishes] = React.useState("");
  const [spendPerPerson, setSpendPerPerson] = React.useState("");
  const [personalRating, setPersonalRating] = React.useState("");
  const [note, setNote] = React.useState("");
  const [wouldReturn, setWouldReturn] = React.useState<"yes" | "no" | "unknown">("unknown");
  const save = () => onSave({ visitedAt, dishes: dishes.trim(), spendPerPerson: spendPerPerson ? Number(spendPerPerson) : null, personalRating: personalRating ? Number(personalRating) : null, note: note.trim(), wouldReturn: wouldReturn === "unknown" ? null : wouldReturn === "yes" });
  return <section className="rounded-[24px] border border-[#DCEEF1] bg-[#F8FCFC] p-6 shadow-card sm:p-7"><div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-extrabold">记录这次探店</h3><p className="mt-1 text-sm text-muted">只记录你亲自体验过的信息。</p></div><button onClick={onCancel} className="text-sm font-bold text-muted hover:text-ink">取消</button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-muted">到店日期<input type="date" value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} className="form-input mt-2" /></label><label className="text-xs font-bold text-muted">人均消费（可选）<input type="number" min="0" step="0.01" value={spendPerPerson} onChange={(event) => setSpendPerPerson(event.target.value)} className="form-input mt-2" placeholder="例如 120" /></label><label className="text-xs font-bold text-muted">自己的评分（1–5，可选）<input type="number" min="1" max="5" step="0.5" value={personalRating} onChange={(event) => setPersonalRating(event.target.value)} className="form-input mt-2" placeholder="给自己的体验打分" /></label><label className="text-xs font-bold text-muted">点了什么<input value={dishes} onChange={(event) => setDishes(event.target.value)} className="form-input mt-2" placeholder="记录菜名或饮品" /></label><label className="text-xs font-bold text-muted md:col-span-2">一句话评价<textarea value={note} onChange={(event) => setNote(event.target.value)} className="form-input mt-2 min-h-24 resize-y" placeholder="这次体验最值得记住的地方" /></label><label className="text-xs font-bold text-muted md:col-span-2">还会再去吗<select value={wouldReturn} onChange={(event) => setWouldReturn(event.target.value as "yes" | "no" | "unknown")} className="form-input mt-2"><option value="unknown">暂不判断</option><option value="yes">会</option><option value="no">不会</option></select></label></div><button onClick={save} className="mt-5 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A2D32]">保存探店记录</button></section>;
}

