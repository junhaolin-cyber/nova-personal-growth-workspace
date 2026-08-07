"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CircleAlert, CircleCheck, Cloud, CloudOff, Loader2, LogOut, Monitor, RefreshCw, Save, Settings2, Smartphone, UserRound, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AuthAccount, DeviceRecord, UserProfile } from "../types";
import type { SyncStatusController } from "@/features/sync/types";

type UserMenuProps = {
  account: AuthAccount | null;
  devices: DeviceRecord[];
  isLoading: boolean;
  error: string | null;
  loadDevices: () => Promise<void>;
  updateProfile: (updates: Pick<UserProfile, "display_name" | "language" | "timezone">) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  sync: SyncStatusController;
};

type Panel = "profile" | "devices" | "sync" | null;

export function UserMenu({ account, devices, isLoading, error, loadDevices, updateProfile, signOut, sync }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<Panel>(null);
  const [busy, setBusy] = React.useState(false);
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ display_name: "", language: "zh-CN", timezone: "Asia/Shanghai" });
  const userMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  const closePanel = React.useCallback(() => {
    setPanel(null);
    window.setTimeout(() => userMenuButtonRef.current?.focus(), 0);
  }, []);

  if (isLoading) return <div className="hidden h-10 w-28 animate-pulse rounded-xl bg-white/70 sm:block" aria-label="正在读取账号" />;
  if (!account) return <Link href="/auth?mode=login" className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white">登录账号</Link>;

  const displayName = account.profile?.display_name || (account.user.user_metadata.display_name as string | undefined) || account.user.email?.split("@")[0] || "NOVA 用户";
  const email = account.user.email ?? "未提供邮箱";
  const initial = displayName.trim().charAt(0).toUpperCase() || "N";

  const openPanel = async (nextPanel: Exclude<Panel, null>) => {
    setPanelError(null);
    setOpen(false);
    setPanel(nextPanel);
    if (nextPanel === "profile") setDraft({ display_name: account.profile?.display_name ?? displayName, language: account.profile?.language ?? "zh-CN", timezone: account.profile?.timezone ?? "Asia/Shanghai" });
    if (nextPanel === "devices") await loadDevices();
  };

  const handleSaveProfile = async () => {
    if (busy) return;
    setBusy(true);
    setPanelError(null);
    const result = await updateProfile(draft);
    setPanelError(result.error);
    setBusy(false);
    if (!result.error) setPanel(null);
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    const result = await signOut();
    if (result.error) {
      setPanelError(result.error);
      setBusy(false);
      return;
    }
    router.replace("/auth?mode=login");
    router.refresh();
  };

  return <div className="relative">
    <button ref={userMenuButtonRef} type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-line bg-white px-2 py-1.5 text-left transition hover:border-accent sm:px-2.5" aria-expanded={open} aria-label="打开用户菜单"><span className="grid size-8 place-items-center rounded-full bg-[#F0E8DD] text-xs font-bold text-[#8A6C49]">{initial}</span><span className="hidden max-w-[120px] sm:block"><span className="block truncate text-xs font-bold">{displayName}</span><span className="block max-w-[120px] truncate text-[10px] text-muted">{email}</span></span><ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} /></button>
    {open ? <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-xl"><div className="border-b border-line px-3 pb-3 pt-2"><p className="truncate text-sm font-bold">{displayName}</p><p className="mt-1 truncate text-xs text-muted">{email}</p></div><div className="py-2"><MenuButton icon={<UserRound size={16} />} label="我的资料" onClick={() => void openPanel("profile")} /><MenuButton icon={<Monitor size={16} />} label="我的设备" onClick={() => void openPanel("devices")} /><MenuButton icon={<Cloud size={16} />} label="同步状态" onClick={() => void openPanel("sync")} /><Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"><Settings2 size={16} />设置</Link></div><div className="border-t border-line pt-2"><button type="button" onClick={() => void handleSignOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#B26F3C] hover:bg-[#FFF8F2]"><LogOut size={16} />退出登录</button></div>{error ? <p className="px-3 pb-1 pt-2 text-xs text-[#B26F3C]">{error}</p> : null}</div> : null}
    {panel ? <PanelDialog panel={panel} displayName={displayName} email={email} draft={draft} devices={devices} currentDeviceId={account.currentDeviceId} busy={busy} error={panelError} sync={sync} onClose={closePanel} onDraftChange={setDraft} onSave={() => void handleSaveProfile()} /> : null}
  </div>;
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">{icon}{label}</button>;
}

function PanelDialog({ panel, displayName, email, draft, devices, currentDeviceId, busy, error, sync, onClose, onDraftChange, onSave }: { panel: Exclude<Panel, null>; displayName: string; email: string; draft: { display_name: string; language: string; timezone: string }; devices: DeviceRecord[]; currentDeviceId: string | null; busy: boolean; error: string | null; sync: SyncStatusController; onClose: () => void; onDraftChange: React.Dispatch<React.SetStateAction<{ display_name: string; language: string; timezone: string }>>; onSave: () => void }) {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const title = panel === "profile" ? "我的资料" : panel === "devices" ? "我的设备" : "同步状态";
  React.useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-white p-6 shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-accent">账号中心</p><h2 className="mt-2 text-2xl font-extrabold">{title}</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label="关闭"><X size={18} /></button></div>{panel === "profile" ? <ProfilePanel displayName={displayName} email={email} draft={draft} busy={busy} error={error} onDraftChange={onDraftChange} onSave={onSave} /> : panel === "devices" ? <DevicesPanel devices={devices} currentDeviceId={currentDeviceId} error={error} /> : <SyncPanel sync={sync} />}</div></div>;
}

function ProfilePanel({ displayName, email, draft, busy, error, onDraftChange, onSave }: { displayName: string; email: string; draft: { display_name: string; language: string; timezone: string }; busy: boolean; error: string | null; onDraftChange: React.Dispatch<React.SetStateAction<{ display_name: string; language: string; timezone: string }>>; onSave: () => void }) {
  return <div className="mt-7"><div className="flex items-center gap-4 rounded-2xl bg-canvas p-4"><span className="grid size-14 place-items-center rounded-full bg-[#F0E8DD] text-lg font-bold text-[#8A6C49]">{displayName.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-bold">{displayName}</p><p className="mt-1 truncate text-sm text-muted">{email}</p></div></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-muted">用户昵称<input value={draft.display_name} onChange={(event) => onDraftChange((current) => ({ ...current, display_name: event.target.value }))} className="form-input mt-2" maxLength={40} /></label><label className="block text-sm font-semibold text-muted">语言<select value={draft.language} onChange={(event) => onDraftChange((current) => ({ ...current, language: event.target.value }))} className="form-input mt-2"><option value="zh-CN">简体中文</option><option value="en-US">English</option></select></label><label className="block text-sm font-semibold text-muted">时区<select value={draft.timezone} onChange={(event) => onDraftChange((current) => ({ ...current, timezone: event.target.value }))} className="form-input mt-2"><option value="Asia/Shanghai">中国标准时间（Asia/Shanghai）</option><option value="UTC">协调世界时（UTC）</option><option value="America/Los_Angeles">太平洋时间（America/Los_Angeles）</option></select></label></div>{error ? <InlineError message={error} /> : null}<button type="button" onClick={onSave} disabled={busy} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={15} />{busy ? "保存中…" : "保存资料"}</button></div>;
}

function DevicesPanel({ devices, currentDeviceId, error }: { devices: DeviceRecord[]; currentDeviceId: string | null; error: string | null }) {
  return <div className="mt-7">{error ? <InlineError message={error} /> : null}{devices.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-canvas p-6 text-center text-sm text-muted">暂时没有已登记的设备。</div> : <div className="space-y-3">{devices.map((device) => <div key={device.id} className="flex items-start gap-3 rounded-2xl border border-line p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#E7E9FF] text-accent">{device.device_type === "mobile" ? <Smartphone size={17} /> : <Monitor size={17} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{device.device_name}</p>{device.id === currentDeviceId ? <span className="rounded-lg bg-[#E7E9FF] px-2 py-1 text-[11px] font-bold text-accent">当前设备</span> : null}</div><p className="mt-1 text-xs text-muted">{device.platform} · {device.device_type === "mobile" ? "手机 / 平板" : "电脑"}</p><p className="mt-2 text-xs text-muted">最后活跃：{formatDateTime(device.last_seen_at)}</p></div></div>)}</div>}</div>;
}

function SyncPanel({ sync }: { sync: SyncStatusController }) {
  const status = getSyncStatusMeta(sync.status);
  const StatusIcon = status.icon;
  const cloudText = sync.cloud === "connected" ? "云端连接正常" : sync.cloud === "unavailable" ? "云端连接暂时不可用" : "正在检查云端连接";
  return <div className="mt-7"><div className={`rounded-2xl border p-5 ${status.panelTone}`}><div className="flex items-start gap-3"><StatusIcon className={`mt-0.5 ${status.iconTone}`} size={19} /><div className="min-w-0"><p className="font-bold">同步状态：{status.label}</p><p className="mt-2 text-sm leading-6 text-muted">{cloudText} · 网络{sync.online ? "在线" : "离线"} · 待处理队列 {sync.queueSize} 条</p>{sync.lastError ? <p className="mt-2 text-sm leading-6 text-[#B26F3C]">{sync.lastError}</p> : null}{sync.lastSyncedAt ? <p className="mt-2 text-xs text-muted">最近同步：{formatDateTime(sync.lastSyncedAt)}</p> : null}</div></div></div><div className="mt-4 rounded-2xl bg-canvas p-4 text-sm leading-6 text-muted"><p className="flex items-center gap-2 font-semibold text-ink"><Check size={15} className="text-[#43845D]" />本地优先，联网后自动同步第一批资料</p><p className="mt-2">当前仅同步电影电视、美食探索、新闻收藏和潮流生活的收藏与状态；其它模块暂不参与同步。</p><button type="button" onClick={() => void sync.retry()} disabled={sync.status === "syncing"} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={14} className={sync.status === "syncing" ? "animate-spin" : ""} />{sync.status === "syncing" ? "同步中…" : "立即同步"}</button></div></div>;
}

function getSyncStatusMeta(status: SyncStatusController["status"]): { label: string; icon: LucideIcon; iconTone: string; panelTone: string } {
  if (status === "syncing") return { label: "同步中", icon: Loader2, iconTone: "text-accent animate-spin", panelTone: "border-[#E5E1FA] bg-[#F8F7FF]" };
  if (status === "pending") return { label: "等待同步", icon: Cloud, iconTone: "text-accent", panelTone: "border-[#E5E1FA] bg-[#F8F7FF]" };
  if (status === "offline") return { label: "离线", icon: WifiOff, iconTone: "text-[#B26F3C]", panelTone: "border-[#F0D2BB] bg-[#FFF8F2]" };
  if (status === "failed") return { label: "同步失败", icon: CloudOff, iconTone: "text-[#B26F3C]", panelTone: "border-[#F0D2BB] bg-[#FFF8F2]" };
  return { label: "已同步", icon: CircleCheck, iconTone: "text-[#43845D]", panelTone: "border-[#CDE7D5] bg-[#F3FBF5]" };
}

function InlineError({ message }: { message: string }) {
  return <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#B26F3C]"><CircleAlert size={14} className="mt-0.5 shrink-0" />{message}</p>;
}

function formatDateTime(value: string | null): string {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
