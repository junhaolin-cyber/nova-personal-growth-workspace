"use client";

import type { FirstBatchMigrationController, FirstBatchMigrationResult, FirstBatchModule } from "./types";

const moduleLabels: Record<FirstBatchModule, string> = {
  "movies-tv": "电影电视",
  food: "美食探索",
  news: "新闻资讯",
  "trend-life": "潮流生活",
};

function MigrationResultSummary({ result, compact = false }: { result: FirstBatchMigrationResult; compact?: boolean }) {
  const hasFailure = result.failedCount > 0;
  return (
    <div className={`rounded-2xl border p-4 ${hasFailure ? "border-[#F0D7C5] bg-[#FFF8F2]" : "border-[#CDE7D5] bg-[#F3FBF5]"}`}>
      <p className={`font-bold ${hasFailure ? "text-[#B26F3C]" : "text-[#397A52]"}`}>
        {hasFailure ? (result.successCount > 0 || result.skippedCount > 0 ? "部分迁移完成" : "迁移失败") : "首批数据迁移完成"}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/70 px-2 py-2"><p className="text-muted">成功</p><p className="mt-1 text-base font-extrabold text-[#397A52]">{result.successCount}</p></div>
        <div className="rounded-xl bg-white/70 px-2 py-2"><p className="text-muted">跳过</p><p className="mt-1 text-base font-extrabold text-muted">{result.skippedCount}</p></div>
        <div className="rounded-xl bg-white/70 px-2 py-2"><p className="text-muted">失败</p><p className="mt-1 text-base font-extrabold text-[#B26F3C]">{result.failedCount}</p></div>
      </div>
      {!compact ? (
        <div className="mt-3 space-y-1 text-xs leading-5 text-muted">
          {result.moduleResults.filter((module) => module.totalCount > 0).map((module) => (
            <p key={module.module}>
              {moduleLabels[module.module]}：成功 {module.successCount}，跳过 {module.skippedCount}，失败 {module.failedCount}
            </p>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted">本地数据和本地备份均已保留。</p>
    </div>
  );
}

export function FirstBatchMigrationPrompt({ controller }: { controller: FirstBatchMigrationController }) {
  if (controller.status === "completed" && controller.result) {
    return <div className="fixed bottom-6 right-6 z-[60] w-[min(22rem,calc(100vw-3rem))] text-sm shadow-xl"><MigrationResultSummary result={controller.result} /></div>;
  }
  if (!controller.preview) return null;

  const { preview } = controller;
  const actionLabel = controller.status === "migrating" ? "正在迁移" : controller.status === "partial" ? "重试失败记录" : controller.status === "failed" ? "重试迁移" : "确认并迁移";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/20 px-5 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="首批数据迁移">
      <div className="max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-bold text-accent">NOVA 数据迁移</p>
        <h2 className="mt-2 text-2xl font-extrabold">发现本地资料</h2>
        <p className="mt-3 text-sm leading-6 text-muted">首次登录后，可以将第一批收藏和状态备份到云端。请先确认迁移预览，确认后才会上传。</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(Object.entries(preview.counts) as Array<[FirstBatchModule, number]>).filter(([, count]) => count > 0).map(([module, count]) => (
            <div key={module} className="rounded-2xl bg-canvas p-4">
              <p className="text-xs text-muted">{moduleLabels[module]}</p>
              <p className="mt-2 text-2xl font-extrabold">{count}<span className="ml-1 text-sm font-semibold text-muted">条</span></p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#E5E1FA] bg-[#F8F7FF] p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-ink">共 {preview.total} 条待迁移记录</p>
          <p className="mt-1">本地 Local Storage 不会被清空，云端已有同一条记录时不会覆盖。</p>
          <p className="mt-1">迁移前会先保留一份本地备份。</p>
        </div>

        {controller.result ? <div className="mt-4"><MigrationResultSummary result={controller.result} /></div> : null}
        {controller.error ? <p role="alert" className="mt-4 rounded-xl bg-[#FFF8F2] px-4 py-3 text-sm leading-6 text-[#B26F3C]">{controller.error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={controller.dismiss} disabled={controller.status === "migrating"} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted disabled:opacity-60">暂不迁移</button>
          <button type="button" onClick={() => void controller.confirm()} disabled={controller.status === "migrating"} className="rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
