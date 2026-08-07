"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Command, Languages, LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Settings2, Sparkles, UserRound, X } from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { TodayPlan } from "@/features/today/TodayPlan";
import { EnglishLearning } from "@/features/english/EnglishLearning";
import { Speaking } from "@/features/speaking/Speaking";
import { FinanceLearning } from "@/features/finance/FinanceLearning";
import { Bookkeeping } from "@/features/bookkeeping/Bookkeeping";
import { FoodDiscovery } from "@/features/food/FoodDiscovery";
import { ExerciseTracker } from "@/features/exercise/ExerciseTracker";
import { NewsPage } from "@/features/news/NewsPage";
import { TrendLife } from "@/features/trend-life/TrendLife";
import { MoviesTv } from "@/features/movies-tv/MoviesTv";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { useAuthAccount } from "@/features/auth/useAuthAccount";
import { useSyncStatus } from "@/features/sync/useSyncStatus";
import { useFirstBatchSync } from "@/features/sync/useFirstBatchSync";
import { FirstBatchMigrationPrompt } from "@/features/migration/firstBatch/FirstBatchMigrationPrompt";
import { useFirstBatchMigration } from "@/features/migration/firstBatch/useFirstBatchMigration";
import { activeIconShapes, modules } from "@/lib/modules";

const activeModuleStyles: Record<string, string> = {
  today: "bg-[#E7E9FF] text-[#5452C7]",
  english: "bg-[#DDEFE4] text-[#43845D]",
  speaking: "bg-[#F7E5D5] text-[#B26F3C]",
  finance: "bg-[#E9E5FA] text-[#7D68B7]",
  ledger: "bg-[#DCEEF1] text-[#3D8290]",
  food: "bg-[#F8E7D4] text-[#C07C3F]",
  exercise: "bg-[#E0F0E2] text-[#4F9060]",
  news: "bg-[#E5EBF4] text-[#55739B]",
  "trend-life": "bg-[#F1E8F6] text-[#8A5BA6]",
  "trend-sports": "bg-[#F0E7F6] text-[#8A5BA6]",
  "movies-tv": "bg-[#E4EDF5] text-[#557B9C]",
};

export function AppShell({ activeModule }: { activeModule?: string }) {
  const pathname = usePathname();
  const [locale, setLocale] = React.useState<"zh" | "en">("zh");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const auth = useAuthAccount();
  const firstBatchSync = useFirstBatchSync(auth.account, pathname);
  const sync = useSyncStatus(auth.account, firstBatchSync.runSyncCycle);
  const firstBatchMigration = useFirstBatchMigration(auth.account);
  const active = activeModule ?? (pathname === "/" ? "dashboard" : pathname.slice(1));
  const isZh = locale === "zh";
  const accountName = auth.account?.profile?.display_name || (auth.account?.user.user_metadata.display_name as string | undefined) || auth.account?.user.email?.split("@")[0] || "NOVA 用户";
  const accountInitial = accountName.charAt(0).toUpperCase() || "N";

  React.useEffect(() => {
    setLocale(auth.account?.profile?.language === "en-US" ? "en" : "zh");
  }, [auth.account?.profile?.language]);

  React.useEffect(() => {
    setMobileNavOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const updateNetworkState = () => setIsOnline(navigator.onLine);
    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  React.useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] border-r border-[#C9CCDE] bg-[#DCDDED] px-5 py-6 lg:flex lg:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-[12px] bg-ink text-white shadow-sm"><Sparkles size={18} strokeWidth={2.3} /></span>
          <span className="font-sans text-[17px] font-extrabold tracking-[-0.02em]">NOVA</span>
        </Link>
        <NavigationList active={active} isZh={isZh} />
        <div className="mt-auto space-y-1">
          <NavItem href="/settings" active={active === "settings"} icon={<Settings2 size={18} strokeWidth={1.8} />} label={isZh ? "设置" : "Settings"} />
          <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-5">
            <div className="grid size-9 place-items-center rounded-full bg-[#F0E8DD] text-sm font-bold text-[#8A6C49]">{accountInitial}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{accountName}</p><p className="text-xs text-muted">{isZh ? "个人空间" : "Personal space"}</p></div>
            <ChevronDown size={15} className="text-muted" />
          </div>
        </div>
      </aside>

      {mobileNavOpen ? <MobileNavigation active={active} isZh={isZh} onClose={() => setMobileNavOpen(false)} /> : null}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-10 flex h-auto min-h-[76px] items-center justify-between border-b border-line/80 bg-canvas/90 px-5 py-3 backdrop-blur-xl sm:px-8 lg:h-[76px] lg:px-12 lg:py-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-expanded={mobileNavOpen} aria-label="打开导航菜单" className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-white lg:hidden"><Menu size={18} /></button>
            <div className="text-sm text-muted">{active === "dashboard" ? (isZh ? "工作台 / 总览" : "Workspace / Overview") : `${isZh ? "工作台 / " : "Workspace / "}${isZh ? modules.find((item) => item.slug === active)?.label ?? "页面" : modules.find((item) => item.slug === active)?.labelEn ?? "Page"}`}</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative sm:hidden">
              <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-haspopup="menu" aria-label="打开更多操作" className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted"><MoreHorizontal size={18} /></button>
              {moreOpen ? <div role="menu" className="absolute right-0 top-12 z-40 w-40 rounded-2xl border border-line bg-white p-2 shadow-xl">
                <button type="button" role="menuitem" onClick={() => { setLocale(isZh ? "en" : "zh"); setMoreOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"><Languages size={16} />{isZh ? "切换为 English" : "切换为中文"}</button>
                <button type="button" role="menuitem" onClick={() => setMoreOpen(false)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"><Search size={16} />{isZh ? "搜索" : "Search"}</button>
                <button type="button" role="menuitem" onClick={() => setMoreOpen(false)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"><Bell size={16} />{isZh ? "提醒" : "Notifications"}</button>
              </div> : null}
            </div>
            <button onClick={() => setLocale(isZh ? "en" : "zh")} className="hidden items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted transition hover:border-accent hover:text-accent sm:flex" aria-label="切换语言"><Languages size={14} /><span>{isZh ? "中 / EN" : "EN / 中"}</span></button>
            <button className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs text-muted sm:flex"><Search size={14} /><span>{isZh ? "搜索" : "Search"}</span><kbd className="ml-3 rounded-md bg-canvas px-1.5 py-0.5 font-sans text-[10px]">⌘K</kbd></button>
            <button className="hidden size-10 place-items-center rounded-xl border border-line bg-white text-muted sm:grid" aria-label={isZh ? "提醒" : "Notifications"}><Bell size={17} /></button>
            <UserMenu {...auth} sync={sync} />
            <button className="hidden size-10 place-items-center rounded-xl bg-ink text-white shadow-sm sm:grid" aria-label={isZh ? "新增" : "Add"}><Plus size={18} /></button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-76px)] overflow-y-visible overscroll-y-auto px-5 py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-8 lg:h-[calc(100vh-76px)] lg:min-h-[620px] lg:overflow-y-auto lg:px-12 lg:py-10">
          {active === "dashboard" ? <Dashboard locale={locale} /> : active === "today" ? <TodayPlan locale={locale} /> : active === "english" ? <EnglishLearning /> : active === "speaking" ? <Speaking /> : active === "finance" ? <FinanceLearning /> : active === "ledger" ? <Bookkeeping /> : active === "food" ? <FoodDiscovery /> : active === "exercise" ? <ExerciseTracker /> : active === "news" ? <NewsPage /> : active === "trend-life" ? <TrendLife /> : active === "movies-tv" ? <MoviesTv /> : <ModulePlaceholder slug={active} locale={locale} />}
        </main>
      </div>
      {!isOnline ? <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#F0D2BB] bg-[#FFF8F2] px-4 py-2 text-center text-xs font-semibold text-[#9C5D32] shadow-lg">当前离线，已保存到本地，联网后自动同步</div> : null}
      <FirstBatchMigrationPrompt controller={firstBatchMigration} />
    </div>
  );
}

function NavigationList({ active, isZh, onNavigate }: { active: string; isZh: boolean; onNavigate?: () => void }) {
  return <nav className="space-y-1">
    <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2A7AF]">{isZh ? "工作台" : "Workspace"}</p>
    <NavItem href="/" active={active === "dashboard"} icon={<LayoutDashboard size={18} strokeWidth={1.8} />} label={isZh ? "总览" : "Overview"} onNavigate={onNavigate} />
    {modules.slice(0, 4).map((item) => <NavItem key={item.slug} href={`/${item.slug}`} active={active === item.slug} icon={<item.icon size={18} strokeWidth={1.8} />} label={isZh ? item.label : item.labelEn} iconColor={item.iconColor} activeTone={activeModuleStyles[item.slug]} activeIconShape={activeIconShapes[item.slug]} onNavigate={onNavigate} />)}
    <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A2A7AF]">{isZh ? "生活记录" : "Life log"}</p>
    {modules.slice(4).map((item) => <NavItem key={item.slug} href={`/${item.slug}`} active={active === item.slug} icon={<item.icon size={18} strokeWidth={1.8} />} label={isZh ? item.label : item.labelEn} iconColor={item.iconColor} activeTone={activeModuleStyles[item.slug]} activeIconShape={activeIconShapes[item.slug]} onNavigate={onNavigate} />)}
  </nav>;
}

function MobileNavigation({ active, isZh, onClose }: { active: string; isZh: boolean; onClose: () => void }) {
  return <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="移动端导航">
    <button type="button" className="absolute inset-0 bg-ink/20" onClick={onClose} aria-label="关闭导航遮罩" />
    <aside className="relative flex h-full w-[min(21rem,86vw)] flex-col border-r border-[#C9CCDE] bg-[#DCDDED] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] shadow-2xl">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-3 px-2"><span className="grid size-9 place-items-center rounded-[12px] bg-ink text-white shadow-sm"><Sparkles size={18} strokeWidth={2.3} /></span><span className="text-[17px] font-extrabold">NOVA</span></Link>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl bg-white/70 text-muted" aria-label="关闭导航"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto"><NavigationList active={active} isZh={isZh} onNavigate={onClose} /></div>
      <Link href="/settings" onClick={onClose} className="mt-5 flex items-center gap-3 border-t border-line px-3 pt-5 text-sm font-semibold text-muted"><Settings2 size={18} />{isZh ? "设置" : "Settings"}</Link>
    </aside>
  </div>;
}

function NavItem({ href, active, icon, label, iconColor, activeTone, activeIconShape, onNavigate }: { href: string; active: boolean; icon: React.ReactNode; label: string; iconColor?: string; activeTone?: string; activeIconShape?: string; onNavigate?: () => void }) {
  return <Link href={href} onClick={onNavigate} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${active ? `${activeTone ?? "bg-[#F0F0FF] text-accent"} font-semibold shadow-sm` : "font-medium text-muted hover:bg-white/60 hover:text-ink"}`}><span className={`grid size-7 place-items-center transition-transform duration-200 ${active ? `bg-white/70 shadow-sm ${activeIconShape ?? "rounded-lg"} scale-105` : ""} ${iconColor ?? "text-[#6D7283] group-hover:text-ink"}`}>{icon}</span>{label}</Link>;
}

function ModulePlaceholder({ slug, locale }: { slug: string; locale: "zh" | "en" }) {
  const item = modules.find((module) => module.slug === slug);
  const isZh = locale === "zh";
  return <div className="mx-auto max-w-[900px] py-16"><div className={`mb-6 grid size-14 place-items-center rounded-2xl ${item?.tone ?? "bg-[#E7E9FF] text-accent"}`}>{item ? <item.icon size={25} /> : <UserRound size={25} />}</div><h1 className="text-4xl font-extrabold">{isZh ? item?.label ?? "页面" : item?.labelEn ?? "Page"}</h1><p className="mt-3 max-w-lg text-base leading-7 text-muted">{isZh ? item?.description ?? "这个模块将在后续阶段逐步完善。" : item?.descriptionEn ?? "This module will be expanded in a future phase."}</p><div className="mt-10 rounded-3xl border border-dashed border-[#CDD2D8] bg-white/50 p-10 text-center"><Command className="mx-auto mb-4 text-[#B9BEC6]" size={28} /><p className="font-semibold">{isZh ? "基础入口已就绪" : "Module entry is ready"}</p><p className="mt-2 text-sm text-muted">{isZh ? "下一阶段将在这里接入真实的数据结构与交互。" : "Real data structures and interactions will be added here next."}</p></div></div>;
}
