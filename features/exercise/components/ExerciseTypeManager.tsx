"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Check, Edit3, Plus, Power, Star, Trash2 } from "lucide-react";
import { EXERCISE_ICON_OPTIONS } from "../exerciseTypes";
import type { ExerciseType } from "../types";

interface ExerciseTypeManagerProps {
  types: ExerciseType[];
  getUsageCount: (typeId: string) => number;
  onCreate: (name: string, icon: string) => void;
  onUpdate: (id: string, patch: Partial<ExerciseType>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

export function ExerciseTypeManager({ types, getUsageCount, onCreate, onUpdate, onDelete, onMove }: ExerciseTypeManagerProps) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("✨");
  const [editingId, setEditingId] = React.useState<string>();
  const [editingName, setEditingName] = React.useState("");
  const [editingIcon, setEditingIcon] = React.useState("");
  const orderedTypes = [...types].sort((a, b) => a.sortOrder - b.sortOrder);
  const submitNew = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), icon);
    setName("");
  };
  const startEditing = (type: ExerciseType) => { setEditingId(type.id); setEditingName(type.name); setEditingIcon(type.icon); };
  const saveEditing = () => {
    if (!editingId || !editingName.trim()) return;
    onUpdate(editingId, { name: editingName.trim(), icon: editingIcon || "✨" });
    setEditingId(undefined);
  };

  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#4F9060]">我的运动类型</p><h2 className="mt-2 text-xl font-extrabold">按自己的方式记录</h2><p className="mt-2 text-sm leading-6 text-muted">常用类型会排在前面，停用类型仍会保留历史记录。</p></div><span className="rounded-full bg-[#E0F0E2] px-3 py-1.5 text-xs font-bold text-[#4F9060]">{orderedTypes.filter((type) => type.isActive).length} 个启用</span></div>
    <form onSubmit={submitNew} className="mt-5 flex flex-col gap-3 rounded-2xl bg-canvas p-4 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} className="form-input min-w-0 flex-1 bg-white" placeholder="新增运动类型，例如攀岩" aria-label="新增运动类型" /><select value={icon} onChange={(event) => setIcon(event.target.value)} className="form-input bg-white sm:w-28" aria-label="选择运动图标">{EXERCISE_ICON_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white"><Plus size={16} />新增类型</button></form>
    <div className="mt-5 space-y-2">{orderedTypes.map((type, index) => <div key={type.id} className={"rounded-2xl border px-4 py-3 " + (type.isActive ? "border-line bg-white" : "border-dashed border-[#D9DEE3] bg-canvas opacity-70")}><div className="flex flex-wrap items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#E0F0E2] text-lg">{type.icon}</span>{editingId === type.id ? <div className="flex min-w-[220px] flex-1 flex-wrap gap-2"><input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="form-input min-w-0 flex-1 bg-white" aria-label="编辑运动类型名称" /><select value={editingIcon} onChange={(event) => setEditingIcon(event.target.value)} className="form-input w-20 bg-white" aria-label="编辑运动类型图标">{EXERCISE_ICON_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div> : <div className="min-w-[160px] flex-1"><p className="font-bold">{type.name}</p><p className="mt-1 text-xs text-muted">{getUsageCount(type.id)} 条历史记录 · {type.isActive ? "可用于新记录" : "已停用"}</p></div>}<button type="button" onClick={() => onUpdate(type.id, { isFavorite: !type.isFavorite })} className={"grid size-9 place-items-center rounded-xl border bg-white " + (type.isFavorite ? "border-[#E8D3A9] text-[#B27C32]" : "border-line text-muted")} aria-label={type.isFavorite ? "取消常用" : "设为常用"}><Star size={15} fill={type.isFavorite ? "currentColor" : "none"} /></button>{editingId === type.id ? <button type="button" onClick={saveEditing} className="grid size-9 place-items-center rounded-xl bg-[#E0F0E2] text-[#4F9060]" aria-label="保存类型编辑"><Check size={16} /></button> : <button type="button" onClick={() => startEditing(type)} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label="编辑运动类型"><Edit3 size={15} /></button>}<button type="button" onClick={() => onUpdate(type.id, { isActive: !type.isActive })} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label={type.isActive ? "停用运动类型" : "恢复运动类型"}><Power size={15} /></button><button type="button" onClick={() => onMove(type.id, -1)} disabled={index === 0} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted disabled:opacity-30" aria-label="上移运动类型"><ArrowUp size={15} /></button><button type="button" onClick={() => onMove(type.id, 1)} disabled={index === orderedTypes.length - 1} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted disabled:opacity-30" aria-label="下移运动类型"><ArrowDown size={15} /></button><button type="button" onClick={() => onDelete(type.id)} disabled={getUsageCount(type.id) > 0} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-[#B15D4B] disabled:cursor-not-allowed disabled:opacity-30" aria-label={getUsageCount(type.id) > 0 ? "已有记录不能删除" : "删除运动类型"}><Trash2 size={15} /></button></div></div>)}</div>
  </section>;
}
