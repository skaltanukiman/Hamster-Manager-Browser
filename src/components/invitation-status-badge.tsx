import type { HouseholdInvitationStatus } from "@/lib/invitations";

const statusLabels: Record<HouseholdInvitationStatus, string> = {
  active: "有効",
  accepted: "使用済み",
  expired: "期限切れ",
  revoked: "無効化済み"
};

const statusClasses: Record<HouseholdInvitationStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  accepted: "bg-slate-100 text-slate-700",
  expired: "bg-amber-50 text-amber-700",
  revoked: "bg-red-50 text-red-700"
};

export function InvitationStatusBadge({ status }: { status: HouseholdInvitationStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
