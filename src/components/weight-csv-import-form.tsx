"use client";

import { Upload } from "lucide-react";
import { useActionState } from "react";

import { importWeightRecordsCsv, type WeightCsvImportState } from "@/app/actions/weights";

const INITIAL_IMPORT_STATE: WeightCsvImportState = {
  hasResult: false,
  successCount: 0,
  skippedCount: 0,
  errorCount: 0,
  errors: [],
  message: ""
};

export function WeightCsvImportForm() {
  const [state, formAction, isPending] = useActionState(importWeightRecordsCsv, INITIAL_IMPORT_STATE);
  const hasErrors = state.errorCount > 0;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-ink">CSVインポート</h3>
      <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          CSVファイル
          <input type="file" name="csvFile" accept=".csv,text/csv" required disabled={isPending} />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {isPending ? "インポート中..." : "インポート"}
        </button>
      </form>

      {state.hasResult ? (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            hasErrors ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-white/70 px-3 py-2">
              <dt className="text-xs">登録成功</dt>
              <dd className="text-lg font-bold">{state.successCount} 件</dd>
            </div>
            <div className="rounded-md bg-white/70 px-3 py-2">
              <dt className="text-xs">スキップ</dt>
              <dd className="text-lg font-bold">{state.skippedCount} 件</dd>
            </div>
            <div className="rounded-md bg-white/70 px-3 py-2">
              <dt className="text-xs">エラー</dt>
              <dd className="text-lg font-bold">{state.errorCount} 件</dd>
            </div>
          </dl>

          {state.errors.length > 0 ? (
            <div className="mt-3 max-h-56 overflow-y-auto rounded-md bg-white/70 p-3">
              <p className="font-semibold">エラー詳細</p>
              <ul className="mt-2 space-y-1">
                {state.errors.map((error, index) => (
                  <li key={`${error.lineNumber}-${index}`}>
                    {error.lineNumber > 0 ? `${error.lineNumber}行目: ` : ""}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
