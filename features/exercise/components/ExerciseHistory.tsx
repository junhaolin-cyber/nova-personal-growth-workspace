"use client";

import * as React from "react";
import { CalendarDays, Clock3, Edit3, MapPin, RotateCcw, Search, Trash2 } from "lucide-react";
import { addDays, formatDateLabel, getDateKey, truncateText } from "../utils";
import { formatDuration } from "./ExerciseOverview";
import type { ExerciseIntensity, ExerciseRecord, ExerciseType } from "../types";

const intensityLabel: Record<ExerciseIntensity, string> = { easy: "轻松", moderate: "适中", high: "较高" };
const feelingLabel = { great: "很好", normal: "一般", tired: "有点累" };

function sortRecords(records: ExerciseRecord[], order: "newest" | "oldest"): ExerciseRecord[] {
  return [...records].sort((a, b) => {
    const aValue = a.exerciseDate + (a.startTime ?? "");
    const bValue = b.exerciseDate + (b.startTime ?? "");
    return order === "newest" ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
  });
}

interface ExerciseHistoryProps {
  title: string;
  subtitle: string;
  records: ExerciseRecord[];
  types: ExerciseType[];
  showFilters?: boolean;
  limit?: number;
  onEdit: (record: ExerciseRecord) => void;
  onDelete: (record: ExerciseRecord) => void;
  onRepeat: (record: ExerciseRecord) => void;
}

export function ExerciseHistory({ title, subtitle, records, types, showFilters = false, limit, onEdit, onDelete, onRepeat }: ExerciseHistoryProps) {
  const [range, setRange] = React.useState("all");
  const [typeId, setTypeId] = React.useState("all");
  const [intensity, setIntensity] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [order, setOrder] = React.useState<"newest" | "oldest">("newest");
  const todayKey = getDateKey();
  const start = range === "today" ? todayKey : range === "week" ? addDays(todayKey, -6) : range === "month" ? todayKey.slice(0, 7) + "-01" : range === "30days" ? addDays(todayKey, -29) : "";
  const filtered = sortRecords(records.filter((record) => {
    const matchesRange = !start || (range === "month" ? record.exerciseDate.startsWith(todayKey.slice(0, 7)) : record.exerciseDate >= start && record.exerciseDate <= todayKey);
    return matchesRange && (typeId === "all" || record.typeId === typeId) && (intensity === "all" || record.intensity === intensity) && (!search.trim() || (record.note ?? "").toLowerCase().includes(search.trim().toLowerCase()) || (record.location ?? "").toLowerCase().includes(search.trim().toLowerCase()));
  }), order).slice(0, limit);
  const typeMap = new Map(types.map((type) => [type.id, type]));
  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#4F9060]">{title}</p><h2 className="mt-2 text-xl font-extrabold">{subtitle}</h2></div>{limit && records.length > limit && <span className="text-xs font-semibold text-muted">显示最近 {limit} 条</span>}</div>
    {showFilters && <div className="mt-5 grid gap-3 rounded-2xl bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-bold text-muted">时间范围<select value={range} onChange={(event) => setRange(event.target.value)} className="form-input mt-2 w-full bg-white"><option value="all">全部</option><option value="today">今天</option><option value="week">本周</option><option value="month">本月</option><option value="30days">最近 30 天</option></select></label><label className="text-xs font-bold text-muted">运动类型<select value={typeId} onChange={(event) => setTypeId(event.target.value)} className="form-input mt-2 w-full bg-white"><option value="all">全部类型</option>{types.map((type) => <option key={type.id} value={type.id}>{type.icon} {type.name}</option>)}</select></label><label className="text-xs font-bold text-muted">运动强度<select value={intensity} onChange={(event) => setIntensity(event.target.value)} className="form-input mt-2 w-full bg-white"><option value="all">全部强度</option><option value="easy">轻松</option><option value="moderate">适中</option><option value="high">较高</option></select></label><label className="text-xs font-bold text-muted">搜索备注或地点<span className="relative mt-2 block"><Search className="pointer-events-none absolute left-3 top-3 text-muted" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="form-input w-full bg-white pl-9" placeholder="输入关键词" /></span></label><label className="text-xs font-bold text-muted">排序<select value={order} onChange={(event) => setOrder(event.target.value as "newest" | "oldest")} className="form-input mt-2 w-full bg-white"><option value="newest">最新记录</option><option value="oldest">最早记录</option></select></label></div>}
    <div className="mt-5 space-y-3">{filtered.length ? filtered.map((record) => <ExerciseRecordCard key={record.id} record={record} type={typeMap.get(record.typeId)} onEdit={onEdit} onDelete={onDelete} onRepeat={onRepeat} />) : <div className="rounded-2xl border border-dashed border-[#D9DEE3] bg-canvas px-5 py-10 text-center text-sm text-muted">{showFilters ? "没有符合条件的运动记录。" : "今天还没有运动记录，先记录一次吧。"}</div>}</div>
    {showFilters && <p className="mt-4 text-right text-xs text-muted">共 {filtered.length} 条</p>}
  </section>;
}

function ExerciseRecordCard({ record, type, onEdit, onDelete, onRepeat }: { record: ExerciseRecord; type?: ExerciseType; onEdit: (record: ExerciseRecord) => void; onDelete: (record: ExerciseRecord) => void; onRepeat: (record: ExerciseRecord) => void }) {
  return <article className="rounded-2xl border border-line bg-white px-4 py-4 transition hover:border-[#B9D9BD] sm:px-5"><div className="flex flex-wrap items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E0F0E2] text-xl">{type?.icon ?? "◌"}</span><div className="min-w-[180px] flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{type?.name ?? "已停用类型"}</h3><span className="rounded-full bg-canvas px-2 py-1 text-xs text-muted">{formatDateLabel(record.exerciseDate)}</span>{record.intensity && <span className="rounded-full bg-[#F5F1E8] px-2 py-1 text-xs font-semibold text-[#9A774C]">{intensityLabel[record.intensity]}</span>}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{record.startTime || "未填写时间"}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{record.durationMinutes === null ? "未填写时长" : formatDuration(record.durationMinutes)}</span>{record.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{record.location}</span>}{record.feeling && <span>{feelingLabel[record.feeling]}</span>}</div>{record.note && <p className="mt-3 text-sm leading-6 text-muted">{truncateText(record.note)}</p>}</div><div className="flex items-center gap-1"><button type="button" onClick={() => onRepeat(record)} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label="再记一次"><RotateCcw size={15} /></button><button type="button" onClick={() => onEdit(record)} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label="编辑运动记录"><Edit3 size={15} /></button><button type="button" onClick={() => onDelete(record)} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-[#FFF4F0] hover:text-[#B15D4B]" aria-label="删除运动记录"><Trash2 size={15} /></button></div></div></article>;
}

export { intensityLabel };
