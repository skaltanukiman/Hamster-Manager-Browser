"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { HamsterSelectorInput } from "@/components/hamster-selector-input";
import type { HamsterComboboxOption } from "@/components/hamster-combobox";
import type { HamsterSelectorMode } from "@/lib/dashboard-settings";
import {
  DEFAULT_WEIGHT_CSV_DATA_COLUMNS,
  DEFAULT_WEIGHT_CSV_TIME_ZONE,
  WEIGHT_CSV_DATA_COLUMNS,
  WEIGHT_CSV_RECORD_ID_COLUMN,
  WEIGHT_CSV_REQUIRED_COLUMNS,
  WEIGHT_CSV_TIME_ZONES,
  type WeightCsvDataColumn
} from "@/lib/weight-csv-export";

type WeightCsvExportFormProps = {
  hamsters: HamsterComboboxOption[];
  hamsterSelectorMode: HamsterSelectorMode;
  selectedHamsterId: string;
  selectedMonth: string;
};

export function WeightCsvExportForm({
  hamsters,
  hamsterSelectorMode,
  selectedHamsterId,
  selectedMonth
}: WeightCsvExportFormProps) {
  const [selectedColumns, setSelectedColumns] = useState<WeightCsvDataColumn[]>([
    ...DEFAULT_WEIGHT_CSV_DATA_COLUMNS
  ]);
  const canDownload = selectedColumns.length > 0;

  function toggleColumn(column: WeightCsvDataColumn) {
    setSelectedColumns((current) =>
      current.includes(column) ? current.filter((value) => value !== column) : [...current, column]
    );
  }

  return (
    <form method="get" action="/export/weights" className="space-y-6">
      <section
        className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="export-target-heading"
      >
        <h3 id="export-target-heading" className="text-base font-bold text-ink">
          出力対象
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            ハムスター
            <HamsterSelectorInput
              mode={hamsterSelectorMode}
              name="hamsterId"
              selectedId={selectedHamsterId}
              options={hamsters}
              allOptionLabel="すべて"
              autoSubmit={false}
              emptyMessage="条件に一致するハムスターはいません"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            年月
            <input type="month" name="month" defaultValue={selectedMonth} />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">指定しない場合は、全ハムスター・全期間を出力します。</p>
      </section>

      <section
        className="rounded-md border border-slate-200 bg-slate-50 p-5 shadow-sm"
        aria-labelledby="export-settings-heading"
      >
        <h3 id="export-settings-heading" className="text-base font-bold text-ink">
          出力設定
        </h3>

        <div className="mt-4 space-y-5">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">連携用の必須列</legend>
            <p className="mt-1 text-xs text-slate-500">システム連携用のため、すべてのCSVへ必ず出力します。</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...WEIGHT_CSV_REQUIRED_COLUMNS, WEIGHT_CSV_RECORD_ID_COLUMN].map((column) => (
                <label
                  key={column.key}
                  className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-white p-3"
                >
                  <input type="checkbox" checked disabled className="mt-0.5 shrink-0" />
                  <span className="min-w-0 text-sm text-slate-700">
                    <span className="block font-semibold">{column.label}</span>
                    <code className="break-all text-xs text-slate-500">{column.key}</code>
                    <span className="ml-2 inline-flex rounded bg-moss/10 px-1.5 py-0.5 text-xs font-semibold text-moss">
                      必須
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">出力するデータ列</legend>
            <p className="mt-1 text-xs text-slate-500">1つ以上選択してください。列順は表示順で固定されます。</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WEIGHT_CSV_DATA_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-white p-3"
                >
                  <input
                    type="checkbox"
                    name="columns"
                    value={column.key}
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0 text-sm text-slate-700">
                    <span className="block font-semibold">{column.label}</span>
                    <code className="break-all text-xs text-slate-500">{column.key}</code>
                  </span>
                </label>
              ))}
            </div>
            <input type="hidden" name="columns" value="" disabled={canDownload} />
            {!canDownload ? (
              <p id="column-selection-error" className="mt-2 text-sm font-semibold text-red-700" role="alert">
                出力するデータ列を1つ以上選択してください。
              </p>
            ) : null}
          </fieldset>

          <label className="grid max-w-md gap-1 text-sm font-semibold text-slate-700">
            タイムゾーン
            <select name="timezone" defaultValue={DEFAULT_WEIGHT_CSV_TIME_ZONE}>
              {WEIGHT_CSV_TIME_ZONES.map((timeZone) => (
                <option key={timeZone.value} value={timeZone.value}>
                  {timeZone.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-slate-500">
              登録日時・更新日時だけに適用します。測定日は変換しません。
            </span>
          </label>
        </div>
      </section>

      <section
        className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="csv-download-heading"
      >
        <h3 id="csv-download-heading" className="text-base font-bold text-ink">
          CSVダウンロード
        </h3>
        <button
          type="submit"
          disabled={!canDownload}
          aria-describedby={!canDownload ? "column-selection-error" : undefined}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden />
          CSVをダウンロード
        </button>
      </section>
    </form>
  );
}
