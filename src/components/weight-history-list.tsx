"use client";

import { Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { deleteWeightRecords, updateWeightRecord } from "@/app/actions/weights";

type WeightHistoryRecord = {
  id: string;
  recordDate: string;
  weightG: number;
};

type WeightHistoryListProps = {
  records: WeightHistoryRecord[];
  selectedHamsterId: string;
  filterMode: string;
  selectedMonth: string;
  sortTarget: string;
  sortDirection: string;
  currentPage: number;
  includeInactive: boolean;
  today: string;
  isLocked: boolean;
};

export function WeightHistoryList({
  records,
  selectedHamsterId,
  filterMode,
  selectedMonth,
  sortTarget,
  sortDirection,
  currentPage,
  includeInactive,
  today,
  isLocked
}: WeightHistoryListProps) {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const selectedDeleteIdSet = new Set(selectedDeleteIds);

  function handleDeleteModeStart() {
    setIsDeleteMode(true);
    setSelectedDeleteIds([]);
  }

  function handleDeleteModeCancel() {
    setIsDeleteMode(false);
    setSelectedDeleteIds([]);
  }

  function handleDeleteTargetToggle(recordId: string) {
    setSelectedDeleteIds((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId]
    );
  }

  function handleBulkDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (selectedDeleteIds.length === 0) {
      event.preventDefault();
      return;
    }

    if (!window.confirm(`${selectedDeleteIds.length}件の体重履歴を削除します。本当に削除してもよろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {isLocked ? (
          <p className="text-sm text-slate-600">管理外のハムスターのため、体重履歴は削除できません。</p>
        ) : isDeleteMode ? (
          <>
            <p className="text-sm text-slate-600">{selectedDeleteIds.length} 件選択中</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDeleteModeCancel}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <form action={deleteWeightRecords} onSubmit={handleBulkDeleteSubmit}>
                <input type="hidden" name="hamsterId" value={selectedHamsterId} />
                <input type="hidden" name="filter" value={filterMode} />
                {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
                <input type="hidden" name="sort" value={sortTarget} />
                <input type="hidden" name="direction" value={sortDirection} />
                <input type="hidden" name="page" value={currentPage} />
                {includeInactive ? <input type="hidden" name="includeInactive" value="1" /> : null}
                {selectedDeleteIds.map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <button
                  type="submit"
                  disabled={selectedDeleteIds.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  削除
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">削除する場合は削除モードに切り替えて選択します。</p>
            <button
              type="button"
              onClick={handleDeleteModeStart}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              削除
            </button>
          </>
        )}
      </div>

      <div className="grid gap-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            {isDeleteMode ? (
              <label className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedDeleteIdSet.has(record.id)}
                  onChange={() => handleDeleteTargetToggle(record.id)}
                />
                削除対象
              </label>
            ) : null}

            <form action={updateWeightRecord} className="grid gap-3 md:grid-cols-[180px_160px_auto]">
              <input type="hidden" name="id" value={record.id} />
              <input type="hidden" name="hamsterId" value={selectedHamsterId} />
              <input type="hidden" name="filter" value={filterMode} />
              {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}
              <input type="hidden" name="sort" value={sortTarget} />
              <input type="hidden" name="direction" value={sortDirection} />
              <input type="hidden" name="page" value={currentPage} />
              {includeInactive ? <input type="hidden" name="includeInactive" value="1" /> : null}
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                日付
                <input type="date" name="recordDate" defaultValue={record.recordDate} max={today} disabled={isLocked} />
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
          </article>
        ))}
      </div>
    </div>
  );
}
