"use client";

import { Settings2 } from "lucide-react";
import type { SpeakingSettings } from "../types";

export function SpeakingSettings({ settings, onChange }: { settings: SpeakingSettings; onChange: (settings: SpeakingSettings) => void }) {
  const update = <K extends keyof SpeakingSettings>(key: K, value: SpeakingSettings[K]) => onChange({ ...settings, [key]: value });
  return <section className="rounded-[28px] border border-line bg-white p-6 shadow-card sm:p-7"><p className="flex items-center gap-2 text-sm font-semibold text-accent"><Settings2 size={16} />口语设置</p><h2 className="mt-2 text-xl font-extrabold">让练习更适合你</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><SettingSelect label="英语水平" value={settings.level} onChange={(value) => update("level", value as SpeakingSettings["level"])} options={[["beginner", "初级"], ["intermediate", "中级"], ["advanced", "高级"]]} /><SettingSelect label="偏好口音" value={settings.accent} onChange={(value) => update("accent", value as SpeakingSettings["accent"])} options={[["us", "美式英语"], ["uk", "英式英语"]]} /><SettingSelect label="AI 回复速度" value={settings.responseSpeed} onChange={(value) => update("responseSpeed", value as SpeakingSettings["responseSpeed"])} options={[["slow", "慢速"], ["normal", "正常"]]} /><SettingSelect label="每日练习目标" value={String(settings.dailyGoalMinutes)} onChange={(value) => update("dailyGoalMinutes", Number(value) as SpeakingSettings["dailyGoalMinutes"])} options={[["5", "5 分钟"], ["10", "10 分钟"], ["15", "15 分钟"], ["20", "20 分钟"]]} /></div><div className="mt-5 space-y-3"><ToggleRow label="默认显示中文翻译" checked={settings.showTranslation} onChange={(value) => update("showTranslation", value)} /><ToggleRow label="自动朗读 AI 回复" checked={settings.autoRead} onChange={(value) => update("autoRead", value)} /><ToggleRow label="默认显示每轮纠正" checked={settings.showFeedback} onChange={(value) => update("showFeedback", value)} /></div></section>;
}

function SettingSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-muted">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#8D8BEF]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-canvas px-3 py-3 text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#5E5CE6]" /></label>;
}

