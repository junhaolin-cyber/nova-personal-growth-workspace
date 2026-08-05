"use client";

import * as React from "react";
import { CalendarDays, Clock3, MapPin, Save, X } from "lucide-react";
import { getDateKey } from "../utils";
import { validateExerciseRecord } from "../validation";
import type { ExerciseRecordInput, ExerciseType } from "../types";

export const emptyExerciseRecordInput = (): ExerciseRecordInput => ({
  typeId: "",
  exerciseDate: getDateKey(),
  startTime: "",
  durationMinutes: "",
  location: "",
  intensity: "",
  feeling: "",
  note: "",
  imageUrl: "",
});

export function exerciseRecordToInput(record: { typeId: string; exerciseDate: string; startTime?: string; durationMinutes: number | null; location?: string; intensity?: ExerciseRecordInput["intensity"]; feeling?: ExerciseRecordInput["feeling"]; note?: string; imageUrl?: string }): ExerciseRecordInput {
  return {
    typeId: record.typeId,
    exerciseDate: record.exerciseDate,
    startTime: record.startTime ?? "",
    durationMinutes: record.durationMinutes === null ? "" : String(record.durationMinutes),
    location: record.location ?? "",
    intensity: record.intensity ?? "",
    feeling: record.feeling ?? "",
    note: record.note ?? "",
    imageUrl: record.imageUrl ?? "",
  };
}

interface ExerciseRecordFormProps {
  types: ExerciseType[];
  initialValue?: ExerciseRecordInput;
  title: string;
  onSave: (input: ExerciseRecordInput) => void;
  onCancel?: () => void;
}

export function ExerciseRecordForm({ types, initialValue, title, onSave, onCancel }: ExerciseRecordFormProps) {
  const [input, setInput] = React.useState<ExerciseRecordInput>(() => initialValue ?? emptyExerciseRecordInput());
  const [error, setError] = React.useState("");

  React.useEffect(() => { setInput(initialValue ?? emptyExerciseRecordInput()); setError(""); }, [initialValue]);
  const activeTypes = types.filter((type) => type.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const update = (patch: Partial<ExerciseRecordInput>) => setInput((current) => ({ ...current, ...patch }));
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateExerciseRecord(input);
    if (validationError) { setError(validationError); return; }
    setError("");
    onSave(input);
  };

  return <form onSubmit={handleSubmit} className="rounded-[24px] border border-[#D9E8DB] bg-[#F8FCF8] p-6 shadow-card sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#4F9060]">快速记录运动</p><h3 className="mt-2 text-xl font-extrabold">{title}</h3><p className="mt-2 text-sm text-muted">只记录真实参加过的运动，不需要制定固定计划。</p></div>{onCancel && <button type="button" onClick={onCancel} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label="取消编辑"><X size={17} /></button>}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-ink">运动类型<span className="ml-1 text-[#B15D4B]">*</span><select value={input.typeId} onChange={(event) => update({ typeId: event.target.value })} className="form-input mt-2 w-full"><option value="">请选择运动类型</option>{activeTypes.map((type) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-ink">运动日期<span className="ml-1 text-[#B15D4B]">*</span><span className="relative mt-2 block"><CalendarDays className="pointer-events-none absolute left-3 top-3.5 text-muted" size={16} /><input type="date" value={input.exerciseDate} onChange={(event) => update({ exerciseDate: event.target.value })} className="form-input w-full pl-10" /></span></label>
      <label className="text-sm font-semibold text-ink">开始时间<span className="relative mt-2 block"><Clock3 className="pointer-events-none absolute left-3 top-3.5 text-muted" size={16} /><input type="time" value={input.startTime} onChange={(event) => update({ startTime: event.target.value })} className="form-input w-full pl-10" /></span></label>
      <label className="text-sm font-semibold text-ink">运动时长（分钟）<input type="number" min="0" max="1440" value={input.durationMinutes} onChange={(event) => update({ durationMinutes: event.target.value })} className="form-input mt-2 w-full" placeholder="例如 45" /></label>
      <label className="text-sm font-semibold text-ink">运动地点<span className="relative mt-2 block"><MapPin className="pointer-events-none absolute left-3 top-3.5 text-muted" size={16} /><input value={input.location} onChange={(event) => update({ location: event.target.value })} className="form-input w-full pl-10" placeholder="例如 小区球场" /></span></label>
      <label className="text-sm font-semibold text-ink">运动强度<select value={input.intensity} onChange={(event) => update({ intensity: event.target.value as ExerciseRecordInput["intensity"] })} className="form-input mt-2 w-full"><option value="">不填写</option><option value="easy">轻松</option><option value="moderate">适中</option><option value="high">较高</option></select></label>
      <label className="text-sm font-semibold text-ink">运动感受<select value={input.feeling} onChange={(event) => update({ feeling: event.target.value as ExerciseRecordInput["feeling"] })} className="form-input mt-2 w-full"><option value="">不填写</option><option value="great">很好</option><option value="normal">一般</option><option value="tired">有点累</option></select></label>
      <label className="text-sm font-semibold text-ink sm:col-span-2">简单备注<textarea value={input.note} onChange={(event) => update({ note: event.target.value })} className="form-input mt-2 min-h-24 w-full resize-y" maxLength={500} placeholder="记录一下今天的状态或特别的瞬间" /></label>
      <label className="text-sm font-semibold text-ink sm:col-span-2">照片或图片引用（可选）<input type="url" value={input.imageUrl} onChange={(event) => update({ imageUrl: event.target.value })} className="form-input mt-2 w-full" placeholder="https://…" /></label>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF4F0] px-4 py-3 text-sm font-semibold text-[#B15D4B]">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2A2D32]"><Save size={16} />保存记录</button>{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-muted hover:text-ink">取消</button>}</div>
  </form>;
}
