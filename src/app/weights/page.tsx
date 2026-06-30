import { Plus, Save, Trash2 } from "lucide-react";

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

function normalizeFilterMode(value: string | undefined) {
  return value === "month" ? "month" : "all";
}

function getRecordYearMonth(recordDate: Date) {
  return toDateInputValue(recordDate).slice(0, 7);
}

function formatYearMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

export default async function WeightsPage({
  searchParams
}: {
  searchParams: Promise<{ hamsterId?: string | string[]; status?: string | string[]; filter?: string | string[]; month?: string | string[] }>;
}) {
  const params = await searchParams;
  const { hamsters, selectedHamster, records, chartRecords } = await getWeightPageData(getParam(params.hamsterId));
  const filterMode = normalizeFilterMode(getParam(params.filter));
  const requestedMonth = getParam(params.month);
  const monthOptions = Array.from(new Set(records.map((record) => getRecordYearMonth(record.recordDate))));
  const selectedMonth =
    filterMode === "month" && requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)
      ? requestedMonth
      : monthOptions[0] ?? "";
  const monthSelectOptions =
    selectedMonth && !monthOptions.includes(selectedMonth) ? [selectedMonth, ...monthOptions] : monthOptions;
  const filteredRecords =
    filterMode === "month" && selectedMonth
      ? records.filter((record) => getRecordYearMonth(record.recordDate) === selectedMonth)
      : records;
  const filteredChartRecords =
    filterMode === "month" && selectedMonth
      ? chartRecords.filter((record) => getRecordYearMonth(record.recordDate) === selectedMonth)
      : chartRecords;

  const chartData = filteredChartRecords.map((record) => ({
    date: toDateInputValue(record.recordDate),
    weightG: record.weightG
  }));
  const today = todayInputJst();
  const isLocked = selectedHamster ? !selectedHamster.isActive : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">体重管理</h2>
        <p className="mt-1 text-sm text-slate-600">日付ごとの体重を登録し、推移を確認します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      {hamsters.length === 0 || !selectedHamster ? (
        <EmptyState title="先にハムスターを登録してください。" href="/hamsters" actionLabel="登録する" />
      ) : (
        <>
          <form method="get" className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="filter" value={filterMode} />
            {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
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
            {records.length > 0 ? (
              <form
                method="get"
                className={`grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm ${
                  filterMode === "month" ? "sm:grid-cols-[160px_180px]" : "sm:grid-cols-[160px]"
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
              </form>
            ) : null}
            {records.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                体重記録がまだありません。
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                選択した月の体重記録はありません。
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRecords.map((record) => (
                  <article key={record.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <form action={updateWeightRecord} className="grid gap-3 md:grid-cols-[180px_160px_auto]">
                        <input type="hidden" name="id" value={record.id} />
                        <input type="hidden" name="hamsterId" value={selectedHamster.id} />
                        <input type="hidden" name="filter" value={filterMode} />
                        {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
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
          </section>
        </>
      )}
    </div>
  );
}
