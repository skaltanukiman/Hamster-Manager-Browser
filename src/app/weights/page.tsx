import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Save, Trash2, Upload } from "lucide-react";

import { createWeightRecord, deleteWeightRecord, updateWeightRecord } from "@/app/actions/weights";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EmptyState } from "@/components/empty-state";
import { StatusMessage } from "@/components/status-message";
import { WeightChart } from "@/components/weight-chart";
import { toDateInputValue, todayInputJst } from "@/lib/date";
import { getWeightPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type FilterMode = "all" | "month";
type WeightSortTarget = "registered" | "date" | "weight";
type SortDirection = "asc" | "desc";

function normalizeFilterMode(value: string | undefined): FilterMode {
  return value === "month" ? "month" : "all";
}

function normalizeWeightSortTarget(value: string | undefined): WeightSortTarget {
  return value === "registered" || value === "weight" ? value : "date";
}

function normalizeSortDirection(value: string | undefined): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function normalizePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function isYearMonthInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function formatYearMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function buildWeightsHref({
  hamsterId,
  filterMode,
  month,
  page,
  sortTarget,
  sortDirection
}: {
  hamsterId: string;
  filterMode: FilterMode;
  month: string;
  page: number;
  sortTarget: WeightSortTarget;
  sortDirection: SortDirection;
}) {
  const params = new URLSearchParams({ hamsterId });

  if (filterMode === "month") {
    params.set("filter", "month");
    if (month) {
      params.set("month", month);
    }
  }

  if (sortTarget !== "date") {
    params.set("sort", sortTarget);
  }

  if (sortDirection !== "desc") {
    params.set("direction", sortDirection);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  return `/weights?${params.toString()}`;
}

export default async function WeightsPage({
  searchParams
}: {
  searchParams: Promise<{
    hamsterId?: string | string[];
    status?: string | string[];
    filter?: string | string[];
    month?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const filterMode = normalizeFilterMode(getParam(params.filter));
  const requestedMonth = getParam(params.month);
  const requestedPage = normalizePage(getParam(params.page));
  const sortTarget = normalizeWeightSortTarget(getParam(params.sort));
  const sortDirection = normalizeSortDirection(getParam(params.direction));
  const { hamsters, selectedHamster, records, chartRecords, monthOptions, selectedMonth, pagination } =
    await getWeightPageData({
      selectedHamsterId: getParam(params.hamsterId),
      filterMode,
      month: isYearMonthInput(requestedMonth) ? requestedMonth : undefined,
      page: requestedPage,
      sortTarget,
      sortDirection
    });
  const monthSelectOptions =
    selectedMonth && !monthOptions.includes(selectedMonth) ? [selectedMonth, ...monthOptions] : monthOptions;

  const chartData = chartRecords.map((record) => ({
    date: toDateInputValue(record.recordDate),
    weightG: record.weightG
  }));
  const today = todayInputJst();
  const isLocked = selectedHamster ? !selectedHamster.isActive : false;
  const hasWeightRecords = monthOptions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">体重管理</h2>
          <p className="mt-1 text-sm text-slate-600">日付ごとの体重を登録し、推移を確認します。</p>
        </div>
        <Link
          href="/weights/import"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-moss bg-white px-4 text-sm font-semibold text-moss hover:bg-moss hover:text-white"
        >
          <Upload className="h-4 w-4" aria-hidden />
          CSVインポート
        </Link>
      </div>

      <StatusMessage status={getParam(params.status)} />

      {hamsters.length === 0 || !selectedHamster ? (
        <EmptyState title="先にハムスターを登録してください。" href="/hamsters" actionLabel="登録する" />
      ) : (
        <>
          <form method="get" className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="filter" value={filterMode} />
            {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
            <input type="hidden" name="sort" value={sortTarget} />
            <input type="hidden" name="direction" value={sortDirection} />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              ハムスター
              <AutoSubmitSelect key={selectedHamster.id} name="hamsterId" defaultValue={selectedHamster.id}>
                {hamsters.map((hamster) => (
                  <option key={hamster.id} value={hamster.id}>
                    {hamster.name}
                    {hamster.isActive ? "" : "（管理外）"}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          </form>

          {isLocked ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              このハムスターは管理外のため、体重記録の登録・編集・削除はできません。
            </p>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <form action={createWeightRecord} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <input type="hidden" name="hamsterId" value={selectedHamster.id} />
              <input type="hidden" name="filter" value={filterMode} />
              {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
              <input type="hidden" name="sort" value={sortTarget} />
              <input type="hidden" name="direction" value={sortDirection} />
              <h3 className="text-base font-bold text-ink">体重登録</h3>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  日付
                  <input type="date" name="recordDate" defaultValue={today} max={today} required disabled={isLocked} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  体重(g)
                  <input type="number" name="weightG" min="1" max="500" step="0.1" required placeholder="38.5" disabled={isLocked} />
                </label>
                <button
                  type="submit"
                  disabled={isLocked}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  登録
                </button>
              </div>
            </form>

            <section>
              <h3 className="mb-3 text-base font-bold text-ink">{selectedHamster.name} の体重推移</h3>
              <WeightChart data={chartData} />
            </section>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-ink">体重履歴</h3>
            {hasWeightRecords ? (
              <form
                method="get"
                className={`grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm ${
                  filterMode === "month"
                    ? "sm:grid-cols-[160px_180px_160px_160px]"
                    : "sm:grid-cols-[160px_160px_160px]"
                }`}
              >
                <input type="hidden" name="hamsterId" value={selectedHamster.id} />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  表示
                  <AutoSubmitSelect name="filter" defaultValue={filterMode}>
                    <option value="all">全件</option>
                    <option value="month">月ごと</option>
                  </AutoSubmitSelect>
                </label>
                {filterMode === "month" ? (
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    対象月
                    <AutoSubmitSelect name="month" defaultValue={selectedMonth} disabled={monthSelectOptions.length === 0}>
                      {monthSelectOptions.map((yearMonth) => (
                        <option key={yearMonth} value={yearMonth}>
                          {formatYearMonthLabel(yearMonth)}
                          {monthOptions.includes(yearMonth) ? "" : "（記録なし）"}
                        </option>
                      ))}
                    </AutoSubmitSelect>
                  </label>
                ) : null}
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  並び対象
                  <AutoSubmitSelect name="sort" defaultValue={sortTarget}>
                    <option value="registered">登録順</option>
                    <option value="date">日付</option>
                    <option value="weight">体重</option>
                  </AutoSubmitSelect>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  並び順
                  <AutoSubmitSelect name="direction" defaultValue={sortDirection}>
                    <option value="asc">昇順</option>
                    <option value="desc">降順</option>
                  </AutoSubmitSelect>
                </label>
              </form>
            ) : null}
            {hasWeightRecords ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span>
                  {pagination.totalCount} 件中{" "}
                  {pagination.totalCount === 0
                    ? "0"
                    : `${(pagination.currentPage - 1) * pagination.pageSize + 1} - ${
                        (pagination.currentPage - 1) * pagination.pageSize + records.length
                      }`}{" "}
                  件を表示しています。
                </span>
                <span>
                  {pagination.currentPage} / {pagination.totalPages} ページ
                </span>
              </div>
            ) : null}
            {!hasWeightRecords ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                体重記録がまだありません。
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                選択した月の体重記録はありません。
              </div>
            ) : (
              <div className="grid gap-3">
                {records.map((record) => (
                  <article key={record.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <form action={updateWeightRecord} className="grid gap-3 md:grid-cols-[180px_160px_auto]">
                        <input type="hidden" name="id" value={record.id} />
                        <input type="hidden" name="hamsterId" value={selectedHamster.id} />
                        <input type="hidden" name="filter" value={filterMode} />
                        {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
                        <input type="hidden" name="sort" value={sortTarget} />
                        <input type="hidden" name="direction" value={sortDirection} />
                        <input type="hidden" name="page" value={pagination.currentPage} />
                        <label className="grid gap-1 text-sm font-medium text-slate-700">
                          日付
                          <input
                            type="date"
                            name="recordDate"
                            defaultValue={toDateInputValue(record.recordDate)}
                            max={today}
                            disabled={isLocked}
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-slate-700">
                          体重(g)
                          <input
                            type="number"
                            name="weightG"
                            min="1"
                            max="500"
                            step="0.1"
                            defaultValue={record.weightG}
                            disabled={isLocked}
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={isLocked}
                          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-moss px-4 text-sm font-semibold text-moss hover:bg-moss hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <Save className="h-4 w-4" aria-hidden />
                          保存
                        </button>
                      </form>
                      <form action={deleteWeightRecord} className="flex items-end">
                        <input type="hidden" name="id" value={record.id} />
                        <input type="hidden" name="hamsterId" value={selectedHamster.id} />
                        <input type="hidden" name="filter" value={filterMode} />
                        {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
                        <input type="hidden" name="sort" value={sortTarget} />
                        <input type="hidden" name="direction" value={sortDirection} />
                        <input type="hidden" name="page" value={pagination.currentPage} />
                        <button
                          type="submit"
                          disabled={isLocked}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          削除
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {hasWeightRecords && pagination.totalPages > 1 ? (
              <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="体重履歴のページ移動">
                {pagination.currentPage > 1 ? (
                  <Link
                    href={buildWeightsHref({
                      hamsterId: selectedHamster.id,
                      filterMode,
                      month: selectedMonth,
                      page: 1,
                      sortTarget,
                      sortDirection
                    })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronsLeft className="h-4 w-4" aria-hidden />
                    最初へ
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
                    <ChevronsLeft className="h-4 w-4" aria-hidden />
                    最初へ
                  </span>
                )}
                {pagination.currentPage > 1 ? (
                  <Link
                    href={buildWeightsHref({
                      hamsterId: selectedHamster.id,
                      filterMode,
                      month: selectedMonth,
                      page: pagination.currentPage - 1,
                      sortTarget,
                      sortDirection
                    })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    前へ
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    前へ
                  </span>
                )}
                {pagination.currentPage < pagination.totalPages ? (
                  <Link
                    href={buildWeightsHref({
                      hamsterId: selectedHamster.id,
                      filterMode,
                      month: selectedMonth,
                      page: pagination.currentPage + 1,
                      sortTarget,
                      sortDirection
                    })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
                    次へ
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
                {pagination.currentPage < pagination.totalPages ? (
                  <Link
                    href={buildWeightsHref({
                      hamsterId: selectedHamster.id,
                      filterMode,
                      month: selectedMonth,
                      page: pagination.totalPages,
                      sortTarget,
                      sortDirection
                    })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    最後へ
                    <ChevronsRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400">
                    最後へ
                    <ChevronsRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </nav>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
