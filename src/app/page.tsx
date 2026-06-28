import Link from "next/link";
import { CalendarDays, ClipboardCheck, Plus, Scale, Settings } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { daysSinceDate, formatDateJp } from "@/lib/date";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { hamsters, boardCount, totalHamsters } = await getDashboardData();
  // 表示数制限で非表示になったハムスターがいる場合だけ、設定画面への誘導文を出す。
  const hiddenHamsterCount = Math.max(totalHamsters - hamsters.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">ダッシュボード</h2>
          <p className="mt-1 text-sm text-slate-600">
            登録済みハムスターの最新状態を最大 {boardCount} 件表示します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md border border-moss px-4 py-2 text-sm font-semibold text-moss hover:bg-moss hover:text-white"
          >
            <Settings className="h-4 w-4" aria-hidden />
            表示設定
          </Link>
          <Link
            href="/hamsters"
            className="inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            ハムスター登録
          </Link>
        </div>
      </div>

      {hamsters.length === 0 ? (
        <EmptyState title="ハムスターがまだ登録されていません。" href="/hamsters" actionLabel="登録する" />
      ) : (
        <>
          {hiddenHamsterCount > 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              {totalHamsters} 件中 {hamsters.length} 件を表示しています。表示対象は設定画面で変更できます。
            </p>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hamsters.map((hamster) => {
              const latestWeight = hamster.weightRecords[0];
              const latestCleaning = hamster.cleaningRecords[0];
              const cleaningDays = latestCleaning ? daysSinceDate(latestCleaning.recordDate) : null;

              return (
                <article key={hamster.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-ink">{hamster.name}</h3>
                      {hamster.memo ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{hamster.memo}</p> : null}
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-md bg-straw/40 px-2 py-1 text-xs font-semibold text-slate-700">
                      管理中
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3">
                    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-3">
                      <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Scale className="h-4 w-4 text-persimmon" aria-hidden />
                        最新体重
                      </dt>
                      <dd className="text-sm font-bold text-ink">
                        {latestWeight ? `${latestWeight.weightG.toFixed(1)}g` : "未記録"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-3">
                      <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <CalendarDays className="h-4 w-4 text-moss" aria-hidden />
                        最終掃除日
                      </dt>
                      <dd className="text-sm font-bold text-ink">{formatDateJp(latestCleaning?.recordDate)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-3">
                      <dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <ClipboardCheck className="h-4 w-4 text-moss" aria-hidden />
                        経過日数
                      </dt>
                      <dd className="text-sm font-bold text-ink">
                        {cleaningDays == null ? "未記録" : `${cleaningDays}日`}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
