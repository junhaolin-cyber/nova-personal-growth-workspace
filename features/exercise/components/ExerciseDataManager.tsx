"use client";

import * as React from "react";
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { createExerciseCsv, createExerciseJson, downloadExerciseFile, readExerciseImportFile } from "../export";
import { normalizeExerciseData } from "../storage";
import type { ExerciseData } from "../types";

interface ExerciseDataManagerProps {
  data: ExerciseData;
  onImport: (data: ExerciseData, mode: "merge" | "replace") => void;
}

export function ExerciseDataManager({ data, onImport }: ExerciseDataManagerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<ExerciseData>();
  const [error, setError] = React.useState("");
  const exportJson = () => downloadExerciseFile(createExerciseJson(data), "nova-运动打卡备份.json", "application/json;charset=utf-8");
  const exportCsv = () => downloadExerciseFile(createExerciseCsv(data.records, data.types), "nova-运动记录.csv", "text/csv;charset=utf-8");
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const raw = await readExerciseImportFile(file);
      if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { types?: unknown }).types) || !Array.isArray((raw as { records?: unknown }).records)) {
        setError("导入文件缺少运动类型或运动记录结构。");
        return;
      }
      const normalized = normalizeExerciseData(raw);
      if (!normalized.types.length && !normalized.records.length) { setError("导入文件中没有可识别的数据。"); return; }
      setPreview(normalized);
    } catch {
      setError("JSON 文件无法解析，请选择 NOVA 导出的运动备份。");
    }
  };
  const selectMode = (mode: "merge" | "replace") => {
    if (!preview) return;
    onImport(preview, mode);
    setPreview(undefined);
  };
  return <section className="rounded-[24px] border border-line bg-white p-6 shadow-card sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-[#4F9060]">数据管理</p><h2 className="mt-2 text-xl font-extrabold">把运动记录带走</h2><p className="mt-2 text-sm leading-6 text-muted">只操作运动打卡自己的数据，不会影响其他模块。</p></div><Download className="text-[#4F9060]" size={22} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><button type="button" onClick={exportJson} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4 text-left hover:border-[#A9D0AE]"><FileJson className="text-[#4F9060]" size={20} /><span><strong className="block text-sm">导出 JSON</strong><small className="mt-1 block text-muted">{data.records.length} 条记录</small></span></button><button type="button" onClick={exportCsv} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4 text-left hover:border-[#A9D0AE]"><FileSpreadsheet className="text-[#4F9060]" size={20} /><span><strong className="block text-sm">导出 CSV</strong><small className="mt-1 block text-muted">适合表格查看</small></span></button><button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4 text-left hover:border-[#A9D0AE]"><Upload className="text-[#4F9060]" size={20} /><span><strong className="block text-sm">导入 JSON</strong><small className="mt-1 block text-muted">先校验再导入</small></span></button></div><input ref={inputRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />{error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF4F0] px-4 py-3 text-sm font-semibold text-[#B15D4B]">{error}</p>}{preview && <div className="mt-4 rounded-2xl border border-[#E8DDBA] bg-[#FFFDF4] p-4"><p className="text-sm font-bold">已读取导入文件</p><p className="mt-2 text-xs leading-5 text-muted">将导入 {preview.types.length} 个运动类型、{preview.records.length} 条运动记录。请选择合并或覆盖。</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => selectMode("merge")} className="rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white">合并导入</button><button type="button" onClick={() => selectMode("replace")} className="rounded-xl border border-[#D7C99A] bg-white px-4 py-2.5 text-xs font-bold text-[#8A7740]">覆盖导入</button><button type="button" onClick={() => setPreview(undefined)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted">取消</button></div></div>}</section>;
}
