"use client";

import { Save } from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { saveDashboardSettings } from "@/app/actions/settings";
import { MAX_DASHBOARD_BOARD_COUNT, MIN_DASHBOARD_BOARD_COUNT } from "@/lib/dashboard-settings";

type HamsterOption = {
  id: string;
  name: string;
  memo: string | null;
  isActive: boolean;
};

type DashboardSettingsFormProps = {
  boardCount: number;
  hamsters: HamsterOption[];
  selectedHamsterIds: string[];
};

function clampBoardCount(value: number) {
  return Math.min(MAX_DASHBOARD_BOARD_COUNT, Math.max(MIN_DASHBOARD_BOARD_COUNT, Math.trunc(value)));
}

export function DashboardSettingsForm({ boardCount, hamsters, selectedHamsterIds }: DashboardSettingsFormProps) {
  const [limit, setLimit] = useState(boardCount);
  const [selectedIds, setSelectedIds] = useState(selectedHamsterIds);
  const hamsterIds = useMemo(() => hamsters.map((hamster) => hamster.id), [hamsters]);
  const needsSelection = hamsters.length > limit;
  // 登録数が表示数以下なら個別選択は不要なので、全ハムスターを送信対象として扱う。
  const effectiveSelectedIds = needsSelection ? selectedIds : hamsterIds;
  const selectedIdSet = new Set(effectiveSelectedIds);
  const targetCount = Math.min(limit, hamsters.length);
  const canSave = effectiveSelectedIds.length === targetCount;

  function handleLimitChange(event: ChangeEvent<HTMLInputElement>) {
    const nextLimit = clampBoardCount(event.currentTarget.valueAsNumber || MIN_DASHBOARD_BOARD_COUNT);
    const nextNeedsSelection = hamsters.length > nextLimit;
    const nextSelectedIds = selectedIds.filter((id) => hamsterIds.includes(id));

    // 表示数を減らした場合は、保存可能な件数に収まるよう現在の選択を先頭から残す。
    setLimit(nextLimit);
    setSelectedIds(
      nextNeedsSelection
        ? (nextSelectedIds.length > 0 ? nextSelectedIds : hamsterIds).slice(0, nextLimit)
        : hamsterIds
    );
  }

  function handleToggle(hamsterId: string) {
    if (!needsSelection) {
      return;
    }

    setSelectedIds((current) => {
      if (current.includes(hamsterId)) {
        return current.filter((id) => id !== hamsterId);
      }

      if (current.length >= limit) {
        return current;
      }

      return [...current, hamsterId];
    });
  }

  return (
    <form action={saveDashboardSettings} className="space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          表示ボード数
          <input
            type="number"
            name="dashboardBoardCount"
            min={MIN_DASHBOARD_BOARD_COUNT}
            max={MAX_DASHBOARD_BOARD_COUNT}
            value={limit}
            onChange={handleLimitChange}
            required
          />
          <span className="text-xs font-normal text-slate-500">
            設定できる範囲: {MIN_DASHBOARD_BOARD_COUNT}〜{MAX_DASHBOARD_BOARD_COUNT} 件
          </span>
        </label>
        <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
          現在の表示対象: {effectiveSelectedIds.length} / {targetCount} 件
          <span className="block pt-1">表示ボード数の上限は {MAX_DASHBOARD_BOARD_COUNT} 件です。</span>
          {needsSelection ? (
            <span className="block pt-1">表示するハムスターを {targetCount} 件選択します。</span>
          ) : (
            <span className="block pt-1">登録数が表示数以下のため、全ハムスターを表示します。</span>
          )}
          {!canSave ? <span className="block pt-1 text-red-600">表示対象を {targetCount} 件選択してください。</span> : null}
        </div>
      </div>

      {/* disabled の checkbox は送信されないため、保存対象IDは hidden input に正規化して渡す。 */}
      {effectiveSelectedIds.map((id) => (
        <input key={id} type="hidden" name="hamsterIds" value={id} />
      ))}

      <section className="space-y-3">
        <h3 className="text-base font-bold text-ink">ダッシュボードに表示するハムスター</h3>
        {hamsters.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            ハムスターがまだ登録されていません。
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {hamsters.map((hamster) => {
              const checked = selectedIdSet.has(hamster.id);
              // 上限に達した後は未選択の行だけを無効化し、選択済みの解除はできるようにする。
              const disabled = !checked && needsSelection && effectiveSelectedIds.length >= limit;

              return (
                <label
                  key={hamster.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm ${
                    disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!needsSelection || disabled}
                    onChange={() => handleToggle(hamster.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {hamster.name}
                      {hamster.isActive ? null : (
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          管理外
                        </span>
                      )}
                    </span>
                    {hamster.memo ? <span className="mt-1 block truncate text-slate-500">{hamster.memo}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex items-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save className="h-4 w-4" aria-hidden />
          保存
        </button>
      </div>
    </form>
  );
}
