import { CalendarClock } from "lucide-react";

import type { getRecordsPageData } from "@/lib/record-queries";

type MedicalDetail = NonNullable<Awaited<ReturnType<typeof getRecordsPageData>>["records"][number]["medicalDetail"]>;
type MedicalDisplayDetail = {
  [Key in "hospitalName" | "reason" | "diagnosis" | "examination" | "treatment" | "medication" | "medicationInstructions" | "nextVisitDate"]?: MedicalDetail[Key] | null;
} & { consultationFee?: string | number | null };

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function MedicalRecordDetails({
  detail,
  title,
  memo
}: {
  detail: MedicalDisplayDetail;
  title: string;
  memo: string | null | undefined;
}) {
  const fields = [
    // 通常はタイトルに病院名があるが、異なるタイトルの保存済み記録も表示を補完する。
    ["動物病院名", hasText(detail.hospitalName) && !title.includes(detail.hospitalName.trim()) ? detail.hospitalName : null],
    ["理由・症状", detail.reason],
    ["診断", detail.diagnosis],
    ["検査内容", detail.examination],
    ["処置・治療内容", detail.treatment],
    ["処方薬", detail.medication],
    ["投薬方法", detail.medicationInstructions],
    ["メモ", memo]
  ].filter((field): field is [string, string] => hasText(field[1]));
  const nextVisitDate = hasText(detail.nextVisitDate) ? detail.nextVisitDate.trim() : null;
  // Queryが返す数値文字列と旧データの数値を扱い、空文字を0円へ変換しない。
  const feeValue = detail.consultationFee;
  const fee = typeof feeValue === "number" || hasText(feeValue) ? Number(feeValue) : null;
  const formattedFee = fee !== null && Number.isFinite(fee) ? fee.toLocaleString("ja-JP") + "円" : null;

  if (!fields.length && !nextVisitDate && !formattedFee) return null;

  return (
    <div className="mt-4 grid min-w-0 gap-3 text-sm leading-6 text-slate-700">
      {fields.length ? (
        <dl className="grid min-w-0 gap-3">
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="font-semibold">{label}:</dt>
              <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {nextVisitDate ? (
        <p className="inline-flex w-fit max-w-full items-center gap-2 rounded-md bg-sky-50 px-3 py-2 font-semibold text-sky-800">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="[overflow-wrap:anywhere]">次回通院予定: {nextVisitDate.replaceAll("-", "/")}</span>
        </p>
      ) : null}
      {formattedFee ? <p><span className="font-semibold">診察費:</span> {formattedFee}</p> : null}
    </div>
  );
}
