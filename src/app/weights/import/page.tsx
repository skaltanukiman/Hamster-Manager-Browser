import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { WeightCsvImportForm } from "@/components/weight-csv-import-form";

export const dynamic = "force-dynamic";

export default function WeightCsvImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">体重CSVインポート</h2>
          <p className="mt-1 text-sm text-slate-600">GAS版から出力した体重管理CSVを取り込みます。</p>
        </div>
        <Link
          href="/weights"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          体重管理へ戻る
        </Link>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <h3 className="text-base font-bold text-ink">取り込み対象CSV</h3>
        <p className="mt-2">ヘッダー行あり、UTF-8、カンマ区切りのCSVに対応しています。</p>
        <p className="mt-1">
          必須列は <span className="font-semibold text-ink">date</span>、<span className="font-semibold text-ink">hamster</span>、
          <span className="font-semibold text-ink">weight</span> です。
        </p>
        <p className="mt-1">同じハムスター・同じ測定日の記録が既にある場合は、二重登録せずスキップします。</p>
      </section>

      <WeightCsvImportForm />
    </div>
  );
}
