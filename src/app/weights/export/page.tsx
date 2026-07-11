import Link from "next/link";
import { ArrowLeft, Download, Search } from "lucide-react";

import { HamsterSelectorInput } from "@/components/hamster-selector-input";
import { StatusMessage } from "@/components/status-message";
import { normalizeYearMonth } from "@/lib/date";
import { getHamsterOptions, getHamsterSelectorMode } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WeightExportPage({
  searchParams
}: {
  searchParams: Promise<{
    hamsterId?: string | string[];
    month?: string | string[];
    status?: string | string[];
    errorId?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const hamsters = await getHamsterOptions();
  const hamsterSelectorMode = await getHamsterSelectorMode();
  const selectedHamsterId = getParam(query.hamsterId) ?? "";
  const month = getParam(query.month) ?? "";
  const normalizedMonth = month ? normalizeYearMonth(month) : "";
  const params = new URLSearchParams();

  if (selectedHamsterId) {
    params.set("hamsterId", selectedHamsterId);
  }
  if (normalizedMonth) {
    params.set("month", normalizedMonth);
  }

  const downloadHref = `/export/weights${params.toString() ? `?${params}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">体重CSVエクスポート</h2>
          <p className="mt-1 text-sm text-slate-600">体重記録をCSVでダウンロードします。</p>
        </div>
        <Link
          href="/weights"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          体重管理へ戻る
        </Link>
      </div>

      <StatusMessage status={getParam(query.status)} errorId={getParam(query.errorId)} />

      <form method="get" className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          ハムスター
          <HamsterSelectorInput
            key={selectedHamsterId}
            mode={hamsterSelectorMode}
            name="hamsterId"
            selectedId={selectedHamsterId}
            options={hamsters}
            allOptionLabel="すべて"
            emptyMessage="条件に一致するハムスターはいません"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          年月
          <input type="month" name="month" defaultValue={normalizedMonth} />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-moss px-4 text-sm font-semibold text-moss hover:bg-moss hover:text-white"
        >
          <Search className="h-4 w-4" aria-hidden />
          絞り込み
        </button>
      </form>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Link
          href={downloadHref}
          className="inline-flex items-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90"
        >
          <Download className="h-4 w-4" aria-hidden />
          CSVをダウンロード
        </Link>
      </div>
    </div>
  );
}
