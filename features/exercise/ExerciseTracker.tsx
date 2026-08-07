"use client";

import * as React from "react";
import { Activity, Plus, ShieldCheck } from "lucide-react";
import { ExerciseOverview } from "./components/ExerciseOverview";
import { ExerciseRecordForm, emptyExerciseRecordInput, exerciseRecordToInput } from "./components/ExerciseRecordForm";
import { ExerciseTypeManager } from "./components/ExerciseTypeManager";
import { ExerciseHistory } from "./components/ExerciseHistory";
import { ExerciseCalendar } from "./components/ExerciseCalendar";
import { ExerciseStatistics } from "./components/ExerciseStatistics";
import { ExerciseDataManager } from "./components/ExerciseDataManager";
import { calculateExerciseStats } from "./stats";
import { createDefaultExerciseData, loadExerciseData, saveExerciseData } from "./storage";
import { createId, getDateKey, getMonthKey, shiftMonth } from "./utils";
import type { ExerciseData, ExerciseRecord, ExerciseRecordInput, ExerciseType } from "./types";
import { SECOND_BATCH_REMOTE_MERGED_EVENT } from "@/features/sync/events";

export function ExerciseTracker() {
  const [data, setData] = React.useState<ExerciseData>(() => createDefaultExerciseData());
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingRecordId, setEditingRecordId] = React.useState<string>();
  const [formValue, setFormValue] = React.useState<ExerciseRecordInput>();
  const [calendarMonth, setCalendarMonth] = React.useState(getMonthKey());
  const [selectedDate, setSelectedDate] = React.useState(getDateKey());
  const stats = calculateExerciseStats(data);
  const typeMap = new Map(data.types.map((type) => [type.id, type]));

  React.useEffect(() => {
    const saved = loadExerciseData();
    setData(saved);
    setCalendarMonth(saved.settings.calendarMonth);
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (isHydrated) saveExerciseData({ ...data, settings: { ...data.settings, calendarMonth } });
  }, [calendarMonth, data, isHydrated]);

  React.useEffect(() => {
    const handleRemoteMerged = () => setData(loadExerciseData());
    window.addEventListener(SECOND_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
    return () => window.removeEventListener(SECOND_BATCH_REMOTE_MERGED_EVENT, handleRemoteMerged);
  }, []);

  if (!isHydrated) return <div className="mx-auto max-w-[1240px] rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-muted shadow-card">正在准备运动记录空间…</div>;

  const openCreateForm = () => { setEditingRecordId(undefined); setFormValue(emptyExerciseRecordInput()); setIsFormOpen(true); };
  const openEditForm = (record: ExerciseRecord) => { setEditingRecordId(record.id); setFormValue(exerciseRecordToInput(record)); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); setEditingRecordId(undefined); setFormValue(undefined); };
  const saveRecord = (input: ExerciseRecordInput) => {
    const now = new Date().toISOString();
    const record: ExerciseRecord = {
      id: editingRecordId ?? createId("exercise-record"),
      typeId: input.typeId,
      exerciseDate: input.exerciseDate,
      startTime: input.startTime || undefined,
      durationMinutes: input.durationMinutes.trim() ? Number(input.durationMinutes) : null,
      location: input.location.trim() || undefined,
      intensity: input.intensity || undefined,
      feeling: input.feeling || undefined,
      note: input.note.trim() || undefined,
      imageUrl: input.imageUrl.trim() || undefined,
      createdAt: editingRecordId ? (data.records.find((item) => item.id === editingRecordId)?.createdAt ?? now) : now,
      updatedAt: now,
    };
    setData((current) => ({ ...current, records: editingRecordId ? current.records.map((item) => item.id === editingRecordId ? record : item) : [record, ...current.records] }));
    closeForm();
  };
  const deleteRecord = (record: ExerciseRecord) => {
    if (!window.confirm("确认删除这条运动记录吗？")) return;
    if (!window.confirm("请再次确认，删除后这条记录无法恢复。")) return;
    setData((current) => ({ ...current, records: current.records.filter((item) => item.id !== record.id) }));
  };
  const repeatRecord = (record: ExerciseRecord) => { setEditingRecordId(undefined); setFormValue({ ...exerciseRecordToInput(record), exerciseDate: getDateKey() }); setIsFormOpen(true); };
  const createType = (name: string, icon: string) => {
    const now = new Date().toISOString();
    setData((current) => ({ ...current, types: [...current.types, { id: createId("exercise-type"), name, icon, sortOrder: current.types.length, isFavorite: false, isActive: true, createdAt: now, updatedAt: now }] }));
  };
  const updateType = (id: string, patch: Partial<ExerciseType>) => setData((current) => ({ ...current, types: current.types.map((type) => type.id === id ? { ...type, ...patch, updatedAt: new Date().toISOString() } : type) }));
  const usageCount = (typeId: string) => data.records.filter((record) => record.typeId === typeId).length;
  const deleteType = (id: string) => {
    if (usageCount(id) > 0) return;
    if (!window.confirm("确认删除这个未使用的运动类型吗？")) return;
    setData((current) => ({ ...current, types: current.types.filter((type) => type.id !== id) }));
  };
  const moveType = (id: string, direction: -1 | 1) => setData((current) => {
    const sorted = [...current.types].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((type) => type.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) return current;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    return { ...current, types: sorted.map((type, sortOrder) => ({ ...type, sortOrder, updatedAt: new Date().toISOString() })) };
  });
  const importData = (incoming: ExerciseData, mode: "merge" | "replace") => {
    if (mode === "replace") {
      if (!window.confirm("覆盖导入会替换运动打卡自己的类型、记录和设置，其他模块不会受影响。继续吗？")) return;
      if (!window.confirm("请再次确认覆盖运动打卡数据。")) return;
      setData(incoming);
      setCalendarMonth(incoming.settings.calendarMonth);
      return;
    }
    setData((current) => {
      const typeIds = new Set(current.types.map((type) => type.id));
      const recordIds = new Set(current.records.map((record) => record.id));
      return { ...current, types: [...current.types, ...incoming.types.filter((type) => !typeIds.has(type.id))], records: [...current.records, ...incoming.records.filter((record) => !recordIds.has(record.id))] };
    });
  };
  const selectedRecord = editingRecordId ? data.records.find((record) => record.id === editingRecordId) : undefined;
  const recentRecords = [...data.records].sort((a, b) => (b.exerciseDate + (b.startTime ?? "")).localeCompare(a.exerciseDate + (a.startTime ?? "")));

  return <div className="mx-auto max-w-[1240px] space-y-8">
    <section className="flex flex-wrap items-end justify-between gap-6"><div><p className="flex items-center gap-2 text-sm font-bold text-[#4F9060]"><Activity size={16} />生活记录 · 运动打卡</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">把运动记下来，慢慢看见变化</h1><p className="mt-3 text-sm text-muted">不设固定任务，只记录你真实完成过的每一次运动。</p></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-2xl border border-[#D9E8DB] bg-[#F7FBF7] px-4 py-3 text-xs font-bold text-[#4F9060] sm:flex"><ShieldCheck size={15} />数据只保存在本地</div><button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2A2D32]"><Plus size={17} />新增运动</button></div></section>
    <ExerciseOverview stats={stats} />
    {isFormOpen && <ExerciseRecordForm key={editingRecordId ?? "new"} types={data.types} initialValue={formValue} title={selectedRecord ? "编辑运动记录" : "记录一次运动"} onSave={saveRecord} onCancel={closeForm} />}
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]"><ExerciseHistory title="最近运动记录" subtitle="每次运动都值得被看见" records={recentRecords} types={data.types} limit={6} onEdit={openEditForm} onDelete={deleteRecord} onRepeat={repeatRecord} /><ExerciseCalendar monthKey={calendarMonth} selectedDate={selectedDate} records={data.records} onMonthChange={(direction) => setCalendarMonth((current) => shiftMonth(current, direction === "prev" ? -1 : 1))} onSelectDate={setSelectedDate} /></div>
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><ExerciseTypeManager types={data.types} getUsageCount={usageCount} onCreate={createType} onUpdate={updateType} onDelete={deleteType} onMove={moveType} /><ExerciseStatistics stats={stats} /></div>
    <ExerciseHistory title="历史记录" subtitle="按时间和条件找到过去的运动" records={data.records} types={data.types} showFilters onEdit={openEditForm} onDelete={deleteRecord} onRepeat={repeatRecord} />
    <ExerciseDataManager data={data} onImport={importData} />
  </div>;
}
