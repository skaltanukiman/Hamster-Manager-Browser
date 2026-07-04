import { Save } from "lucide-react";

import { saveCleaningMonth } from "@/app/actions/cleaning";
import { AutoSubmitInput } from "@/components/auto-submit-input";
import { EmptyState } from "@/components/empty-state";
import { HamsterCombobox } from "@/components/hamster-combobox";
import { StatusMessage } from "@/components/status-message";
import { currentMonthInputJst, getDaysInMonth, isFutureDateInput, normalizeYearMonth } from "@/lib/date";
import { getCleaningPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CleaningPage({
  searchParams
}: {
  searchParams: Promise<{
    hamsterId?: string | string[];
    month?: string | string[];
    status?: string | string[];
    includeInactive?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const yearMonth = normalizeYearMonth(getParam(params.month));
  const includeInactive = getParam(params.includeInactive) === "1";
  const { hamsters, selectedHamster, recordsByDate } = await getCleaningPageData(
    getParam(params.hamsterId),
    yearMonth,
    includeInactive
  );
  const selectableHamsters = includeInactive ? hamsters : hamsters.filter((hamster) => hamster.isActive);
  const hasSelectableHamsters = selectableHamsters.length > 0;
  const days = getDaysInMonth(yearMonth);
  const currentMonth = currentMonthInputJst();
  const isLocked = selectedHamster ? !selectedHamster.isActive : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">衛生管理</h2>
        <p className="mt-1 text-sm text-slate-600">月ごとの掃除記録を表形式で入力します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      {hamsters.length === 0 ? (
        <EmptyState title="先にハムスターを登録してください。" href="/hamsters" actionLabel="登録する" />
      ) : (
        <>
          <form
            method="get"
            className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_auto]"
          >
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              ハムスター
              <HamsterCombobox
                key={`${selectedHamster?.id ?? "none"}-${includeInactive ? "all" : "active"}`}
                name="hamsterId"
                selectedId={selectedHamster?.id ?? ""}
                options={selectableHamsters}
                disabled={!hasSelectableHamsters}
                emptyMessage="条件に一致するハムスターはいません"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              年月
              <AutoSubmitInput type="month" name="month" defaultValue={yearMonth} max={currentMonth} />
            </label>
            <label className="inline-flex h-10 items-center gap-2 self-end text-sm font-medium text-slate-700 md:justify-end">
              <AutoSubmitInput type="checkbox" name="includeInactive" value="1" defaultChecked={includeInactive} />
              管理外も含む
            </label>
          </form>

          {!selectedHamster ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {hasSelectableHamsters
                ? "ハムスター名を入力するか候補から選択すると、掃除記録の入力表を表示します。"
                : "管理中のハムスターがいません。管理外も含む場合はチェックを入れてください。"}
            </p>
          ) : (
            <div className="content-reveal space-y-4">
              {isLocked ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  このハムスターは管理外のため、掃除記録の編集・保存はできません。
                </p>
              ) : null}

              <form action={saveCleaningMonth} className="space-y-4">
                <input type="hidden" name="hamsterId" value={selectedHamster.id} />
                <input type="hidden" name="yearMonth" value={yearMonth} />
                {includeInactive ? <input type="hidden" name="includeInactive" value="1" /> : null}

                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-24">日付</th>
                        <th className="w-24">曜日</th>
                        <th className="checkbox-cell">トイレ掃除</th>
                        <th className="checkbox-cell">砂場掃除</th>
                        <th className="checkbox-cell">床材一部交換</th>
                        <th className="checkbox-cell">床材全交換</th>
                        <th className="checkbox-cell">ハウス掃除</th>
                        <th className="min-w-64">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => {
                        const record = recordsByDate.get(day.date);
                        // 未来日は入力欄を無効化し、サーバー側の未来日拒否と画面表示を揃える。
                        const isFuture = isFutureDateInput(day.date);
                        const isDisabled = isFuture || isLocked;

                        return (
                          <tr key={day.date} className={isDisabled ? "bg-slate-50 text-slate-400" : undefined}>
                            <td className="font-semibold text-slate-700">{day.day}</td>
                            <td className="text-slate-500">{day.weekday}</td>
                            <td className="checkbox-cell">
                              <input
                                aria-label={`${day.date} トイレ掃除`}
                                type="checkbox"
                                name={`toilet_${day.date}`}
                                defaultChecked={record?.toiletCleaned ?? false}
                                disabled={isDisabled}
                              />
                            </td>
                            <td className="checkbox-cell">
                              <input
                                aria-label={`${day.date} 砂場掃除`}
                                type="checkbox"
                                name={`bath_${day.date}`}
                                defaultChecked={record?.bathCleaned ?? false}
                                disabled={isDisabled}
                              />
                            </td>
                            <td className="checkbox-cell">
                              <input
                                aria-label={`${day.date} 床材一部交換`}
                                type="checkbox"
                                name={`flooring_part_${day.date}`}
                                defaultChecked={record?.flooringPartCleaned ?? false}
                                disabled={isDisabled}
                              />
                            </td>
                            <td className="checkbox-cell">
                              <input
                                aria-label={`${day.date} 床材全交換`}
                                type="checkbox"
                                name={`flooring_all_${day.date}`}
                                defaultChecked={record?.flooringAllCleaned ?? false}
                                disabled={isDisabled}
                              />
                            </td>
                            <td className="checkbox-cell">
                              <input
                                aria-label={`${day.date} ハウス掃除`}
                                type="checkbox"
                                name={`house_${day.date}`}
                                defaultChecked={record?.houseCleaned ?? false}
                                disabled={isDisabled}
                              />
                            </td>
                            <td>
                              <input
                                name={`memo_${day.date}`}
                                defaultValue={record?.memo ?? ""}
                                placeholder={isLocked ? "管理外のため入力できません" : isFuture ? "未来日は入力できません" : "メモ"}
                                disabled={isDisabled}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLocked}
                    className="inline-flex items-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Save className="h-4 w-4" aria-hidden />
                    保存
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
