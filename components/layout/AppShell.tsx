"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Command, Languages, LayoutDashboard, Menu, Plus, Search, Settings2, Sparkles, UserRound } from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { modules } from "@/lib/modules";

export function AppShell({ activeModule }: { activeModule?: string }) {
  const pathname = usePathname();
  const [locale, setLocale] = React.useState<"zh" | "en">("zh");
  const active = activeModule ?? (pathname === "/" ? "dashboard" : pathname.slice(1));
  const isZh = locale === "zh";
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] border-r border-[#C9CCDE] bg-[#DCDDED] px-5 py-6 lg:flex lg:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-[12px] bg-ink text-white shadow-sm"><Sparkles size={18} strokeWidth={2.3} /></span>
          <span className="font-sans text-[17px] font-extrabold tracking-[-0.02em]">NOVA</span>
        </Link>
        <nav className="space-y-1">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2A7AF]">{isZh ? "工作台" : "Workspace"}</p>
          <NavItem href="/" active={active === "dashboard"} icon={<LayoutDashboard size={18} strokeWidth={1.8} />} label={isZh ? "总览" : "Overview"} />
          {modules.slice(0, 4).map((item) => <NavItem key={item.slug} href={`/${item.slug}`} active={active === item.slug} icon={<item.icon size={18} strokeWidth={1.8} />} label={isZh ? item.label : item.labelEn} />)}
          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2A7AF]">{isZh ? "生活记录" : "Life log"}</p>
          {modules.slice(4).map((item) => <NavItem key={item.slug} href={`/${item.slug}`} active={active === item.slug} icon={<item.icon size={18} strokeWidth={1.8} />} label={isZh ? item.label : item.labelEn} />)}
        </nav>
        <div className="mt-auto space-y-1">
          <NavItem href="/settings" active={active === "settings"} icon={<Settings2 size={18} strokeWidth={1.8} />} label={isZh ? "设置" : "Settings"} />
          <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-5">
            <div className="grid size-9 place-items-center rounded-full bg-[#F0E8DD] text-sm font-bold text-[#8A6C49]">A</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Alex Chen</p><p className="text-xs text-muted">{isZh ? "个人空间" : "Personal space"}</p></div>
            <ChevronDown size={15} className="text-muted" />
          </div>
        </div>
      </aside>
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-line/80 bg-canvas/90 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
          <div className="flex items-center gap-3"><button className="grid size-10 place-items-center rounded-xl border border-line bg-white lg:hidden"><Menu size={18} /></button><div className="text-sm text-muted">{active === "dashboard" ? (isZh ? "工作台 / 总览" : "Workspace / Overview") : `${isZh ? "工作台 / " : "Workspace / "}${isZh ? modules.find((item) => item.slug === active)?.label ?? "页面" : modules.find((item) => item.slug === active)?.labelEn ?? "Page"}`}</div></div>
          <div className="flex items-center gap-2 sm:gap-3"><button onClick={() => setLocale(isZh ? "en" : "zh")} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted transition hover:border-accent hover:text-accent" aria-label="切换语言"><Languages size={14} /><span>{isZh ? "中 / EN" : "EN / 中"}</span></button><button className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs text-muted sm:flex"><Search size={14} /><span>{isZh ? "搜索" : "Search"}</span><kbd className="ml-3 rounded-md bg-canvas px-1.5 py-0.5 font-sans text-[10px]">⌘ K</kbd></button><button className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted" aria-label={isZh ? "提醒" : "Notifications"}><Bell size={17} /></button><button className="grid size-10 place-items-center rounded-xl bg-ink text-white shadow-sm" aria-label={isZh ? "新增" : "Add"}><Plus size={18} /></button></div>
        </header>
        <main className="px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{active === "dashboard" ? <Dashboard locale={locale} /> : <ModulePlaceholder slug={active} locale={locale} />}</main>
      </div>
    </div>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return <Link href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? "bg-[#F0F0FF] text-accent" : "text-muted hover:bg-white/60 hover:text-ink"}`}><span className={`grid size-7 place-items-center rounded-lg ${active ? "bg-[#E5E5FC] text-accent" : "text-[#6D7283] group-hover:text-ink"}`}>{icon}</span>{label}</Link>;
}

function ModulePlaceholder({ slug, locale }: { slug: string; locale: "zh" | "en" }) {
  const item = modules.find((module) => module.slug === slug);
  const isZh = locale === "zh";
  return <div className="mx-auto max-w-[900px] py-16"><div className={`mb-6 grid size-14 place-items-center rounded-2xl ${item?.tone ?? "bg-[#E7E9FF] text-accent"}`}>{item ? <item.icon size={25} /> : <UserRound size={25} />}</div><h1 className="text-4xl font-extrabold">{isZh ? item?.label ?? "页面" : item?.labelEn ?? "Page"}</h1><p className="mt-3 max-w-lg text-base leading-7 text-muted">{isZh ? item?.description ?? "这个模块将在后续阶段逐步完善。" : item?.descriptionEn ?? "This module will be expanded in a future phase."}</p><div className="mt-10 rounded-3xl border border-dashed border-[#CDD2D8] bg-white/50 p-10 text-center"><Command className="mx-auto mb-4 text-[#B9BEC6]" size={28} /><p className="font-semibold">{isZh ? "基础入口已就绪" : "Module entry is ready"}</p><p className="mt-2 text-sm text-muted">{isZh ? "下一阶段将在这里接入真实的数据结构与交互。" : "Real data structures and interactions will be added here next."}</p></div></div>;
}
