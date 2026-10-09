import { Banknote, CalendarClock, Pill, TestTubeDiagonal } from "lucide-react";

import type { getRecordsPageData } from "@/lib/record-queries";

type MedicalDetail = NonNullable<Awaited<ReturnType<typeof getRecordsPageData>>["records"][number]["medicalDetail"]>;
type MedicalDisplayDetail = {
  [Key in "hospitalName" | "reason" | "diagnosis" | "examination" | "treatment" | "medication" | "medicationInstructions" | "nextVisitDate"]?: MedicalDetail[Key] | null;
} & { consultationFee?: string | number | null };
type DisplayField = [label: string, value: string | null | undefined];

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function MedicalFields({ fields, columns = false }: { fields: DisplayField[]; columns?: boolean }) {
  const entered = fields.filter((field): field is [string, string] => hasText(field[1]));
  return (
    <dl className={columns && entered.length > 1
      ? "grid min-w-0 gap-3 [@container(min-width:32rem)]:grid-cols-2"
      : "grid min-w-0 gap-3"}>
      {entered.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium leading-5 text-slate-500">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
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
  // 通常はタイトルに病院名があるが、異なるタイトルの保存済み記録も表示を補完する。
  const hospital = hasText(detail.hospitalName) && !title.includes(detail.hospitalName.trim()) ? detail.hospitalName : null;
  const hasOverview = hasText(detail.reason) || hasText(detail.diagnosis);
  const hasTreatment = hasText(detail.examination) || hasText(detail.treatment);
  const hasMedication = hasText(detail.medication) || hasText(detail.medicationInstructions);
  const nextVisitDate = hasText(detail.nextVisitDate) ? detail.nextVisitDate.trim() : null;
  // Queryが返す数値文字列と旧データの数値を扱い、空文字を0円へ変換しない。
  const feeValue = detail.consultationFee;
  const fee = typeof feeValue === "number" || hasText(feeValue) ? Number(feeValue) : null;
  const formattedFee = fee !== null && Number.isFinite(fee) ? fee.toLocaleString("ja-JP") + "円" : null;

  if (!hospital && !hasOverview && !hasTreatment && !hasMedication && !hasText(memo) && !nextVisitDate && !formattedFee) return null;

  return (
    <div className="mt-4 grid min-w-0 gap-4 text-sm leading-6 text-slate-700 [container-type:inline-size]">
      {hospital ? <MedicalFields fields={[["動物病院名", hospital]]} /> : null}
      {hasOverview ? (
        <div className="rounded-md bg-sky-50/60 px-3 py-3 sm:px-4">
          <MedicalFields fields={[["通院理由・症状", detail.reason], ["診断内容", detail.diagnosis]]} />
        </div>
      ) : null}
      {hasTreatment ? (
        <section className="min-w-0 border-t border-slate-100 pt-3">
          <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800">
            <TestTubeDiagonal className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />検査・治療
          </h4>
          <MedicalFields columns fields={[["検査内容", detail.examination], ["処置・治療内容", detail.treatment]]} />
        </section>
      ) : null}
      {hasMedication ? (
        <section className="min-w-0 border-t border-slate-100 pt-3">
          <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800">
            <Pill className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />お薬・投薬
          </h4>
          <MedicalFields columns fields={[["処方薬", detail.medication], ["投薬方法", detail.medicationInstructions]]} />
        </section>
      ) : null}
      {hasText(memo) ? (
        <div className="min-w-0 border-t border-slate-100 pt-3">
          <MedicalFields fields={[["メモ", memo]]} />
        </div>
      ) : null}
      {nextVisitDate || formattedFee ? (
        <dl className="grid gap-2 rounded-md bg-slate-50 px-3 py-3 text-xs sm:px-4">
          {nextVisitDate ? (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt className="inline-flex items-center gap-1.5 text-slate-500"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden />次回通院予定</dt>
              <dd className="ml-auto text-right text-sm font-semibold tabular-nums text-sky-800 [overflow-wrap:anywhere]">{nextVisitDate.replaceAll("-", "/")}</dd>
            </div>
          ) : null}
          {formattedFee ? (
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt className="inline-flex items-center gap-1.5 text-slate-500"><Banknote className="h-4 w-4 shrink-0" aria-hidden />診察費</dt>
              <dd className="ml-auto text-right text-sm font-semibold tabular-nums">{formattedFee}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
