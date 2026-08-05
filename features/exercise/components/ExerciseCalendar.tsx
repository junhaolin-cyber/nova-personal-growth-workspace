"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { getCalendarDays, summarizeDay } from "../stats";
import { formatMonthLabel, getDateKey } from "../utils";
import type { ExerciseRecord } from "../types";

interface ExerciseCalendarProps {
  monthKey: string;
  selectedDate: string;
  records: ExerciseRecord[];
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}

export function ExerciseCalendar({ monthKey, selectedDate, records, onMonthChange, onSelectDate }: ExerciseCalendarProps) {
  const days = getCalendarDays(monthKey);
  const today = getDateKey();
  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-[#4F9060]"><CalendarDays size={16} />运动日历</p><h2 className="mt-2 text-xl font-extrabold">{formatMonthLabel(monthKey)}</h2></div><div className="flex items-center gap-2"><button type="button" onClick={() => onMonthChange("prev")} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label="上个月"><ChevronLeft size={17} /></button><button type="button" onClick={() => onMonthChange("next")} className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:text-ink" aria-label="下个月"><ChevronRight size={17} /></button></div></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day} className="py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const summary = summarizeDay(records, day.date); const active = summary.count > 0; return <button type="button" key={day.date} onClick={() => onSelectDate(day.date)} className={"relative min-h-12 rounded-xl p-2 text-sm transition " + (day.isCurrentMonth ? "text-ink" : "text-[#C4C8CE]") + (selectedDate === day.date ? " bg-[#E0F0E2] font-extrabold text-[#4F9060]" : " hover:bg-canvas")}><span className={today === day.date ? "underline decoration-2 underline-offset-4" : ""}>{Number(day.date.slice(-2))}</span>{active && <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#4F9060]" aria-label={summary.count + " 次运动"} />}</button>; })}</div><div className="mt-5 rounded-2xl bg-canvas px-4 py-4 text-sm">{(() => { const summary = summarizeDay(records, selectedDate); return <><p className="font-bold">{selectedDate === today ? "今天" : selectedDate} · {summary.count ? summary.count + " 次运动" : "没有运动记录"}</p><p className="mt-1 text-xs text-muted">{summary.count ? "当天累计 " + summary.durationMinutes + " 分钟（未填写时长的记录不计入时长）" : "点击其他日期查看当天记录。"}</p></>; })()}</div></section>;
}
