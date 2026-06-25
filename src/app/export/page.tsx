import Link from "next/link";
import { Download, Search } from "lucide-react";

import { StatusMessage } from "@/components/status-message";
import { normalizeYearMonth } from "@/lib/date";
import { getHamsterOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExportPage({
  searchParams
}: {
  searchParams: { hamsterId?: string | string[]; month?: string | string[]; status?: string | string[] };
}) {
  const hamsters = await getHamsterOptions();
  const selectedHamsterId = getParam(searchParams.hamsterId) ?? "";
  const month = getParam(searchParams.month) ?? "";
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
      <div>
        <h2 className="text-xl font-bold text-ink">CSV出力</h2>
        <p className="mt-1 text-sm text-slate-600">体重記録をCSVでダウンロードします。</p>
      </div>

      <StatusMessage status={getParam(searchParams.status)} />

      <form method="get" className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          ハムスター
          <select name="hamsterId" defaultValue={selectedHamsterId}>
            <option value="">すべて</option>
            {hamsters.map((hamster) => (
              <option key={hamster.id} value={hamster.id}>
                {hamster.name}
              </option>
            ))}
          </select>
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

