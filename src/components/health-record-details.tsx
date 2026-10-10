import type { getRecordsPageData } from "@/lib/record-queries";
import { HEALTH_AMOUNT_LABELS, HEALTH_EXCRETION_LABELS, HEALTH_OVERALL_LABELS, HEALTH_SYMPTOM_LABELS } from "@/lib/records";

type HealthDetail = NonNullable<Awaited<ReturnType<typeof getRecordsPageData>>["records"][number]["healthDetail"]>;
type DisplayDetail = Pick<HealthDetail, "appetite" | "activityLevel" | "stoolCondition" | "urineCondition" | "symptoms">;

const statusStyles = {
  GOOD: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CONCERN: "bg-amber-50 text-amber-800 ring-amber-200",
  WARNING: "bg-red-50 text-red-800 ring-red-200"
};

export function HealthStatusBadge({ condition }: { condition: HealthDetail["overallCondition"] }) {
  return <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset " + statusStyles[condition]}>{HEALTH_OVERALL_LABELS[condition]}</span>;
}

export function HealthRecordDetails({ detail, memo }: { detail: DisplayDetail | null; memo?: string | null }) {
  const fields = detail ? [
    ["食欲", HEALTH_AMOUNT_LABELS[detail.appetite]],
    ["活動量", HEALTH_AMOUNT_LABELS[detail.activityLevel]],
    ["便", HEALTH_EXCRETION_LABELS[detail.stoolCondition]],
    ["尿", HEALTH_EXCRETION_LABELS[detail.urineCondition]]
  ] : [];
  return (
    <div className="mt-4 grid min-w-0 gap-4 text-sm leading-6 text-slate-700 [container-type:inline-size]">
      {detail ? (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink">体調の詳細</h4>
          <dl className="grid min-w-0 gap-2 [@container(min-width:14rem)]:grid-cols-2 [@container(min-width:32rem)]:grid-cols-4">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-md bg-slate-50 px-3 py-2">
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {detail && detail.symptoms.length > 0 ? (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-ink">気になる症状（{detail.symptoms.length}件）</h4>
          <ul className="flex min-w-0 flex-wrap gap-1.5">
            {detail.symptoms.map((symptom) => <li key={symptom} className="max-w-full rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 [overflow-wrap:anywhere]">{HEALTH_SYMPTOM_LABELS[symptom]}</li>)}
          </ul>
        </section>
      ) : null}
      {typeof memo === "string" && memo.trim().length > 0 ? (
        <section className="min-w-0 border-t border-slate-100 pt-3">
          <h4 className="mb-1 text-sm font-semibold text-ink">メモ</h4>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{memo}</p>
        </section>
      ) : null}
    </div>
  );
}
