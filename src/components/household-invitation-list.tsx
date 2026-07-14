import { InvitationRevokeForm } from "@/components/invitation-revoke-form";
import {
  getHouseholdInvitationStatus,
  type HouseholdInvitationStatus
} from "@/lib/invitations";

type HouseholdInvitationListItem = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdBy: { name: string | null; email: string | null } | null;
};

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

function formatDateTimeJp(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function InvitationStatusBadge({ status }: { status: HouseholdInvitationStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function creatorName(invitation: HouseholdInvitationListItem) {
  return invitation.createdBy?.name || invitation.createdBy?.email || "不明（既存データ）";
}

export function HouseholdInvitationList({
  invitations,
  canManage,
  now
}: {
  invitations: HouseholdInvitationListItem[];
  canManage: boolean;
  now: Date;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-ink">作成済みの招待リンク</h3>
        <p className="mt-1 text-sm text-slate-600">過去のリンク自体は再表示されません。有効なリンクだけ無効化できます。</p>
      </div>

      {invitations.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          作成済みの招待リンクはありません。
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>作成日時</th>
                  <th>有効期限</th>
                  <th>状態</th>
                  <th>作成者</th>
                  {canManage ? <th>操作</th> : null}
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => {
                  const status = getHouseholdInvitationStatus(invitation, now);
                  return (
                    <tr key={invitation.id}>
                      <td>{formatDateTimeJp(invitation.createdAt)}</td>
                      <td>{formatDateTimeJp(invitation.expiresAt)}</td>
                      <td><InvitationStatusBadge status={status} /></td>
                      <td>{creatorName(invitation)}</td>
                      {canManage ? (
                        <td>{status === "active" ? <InvitationRevokeForm invitationId={invitation.id} /> : "-"}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {invitations.map((invitation) => {
              const status = getHouseholdInvitationStatus(invitation, now);
              return (
                <article key={invitation.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{creatorName(invitation)}</p>
                      <p className="mt-1 text-xs text-slate-500">作成: {formatDateTimeJp(invitation.createdAt)}</p>
                    </div>
                    <InvitationStatusBadge status={status} />
                  </div>
                  <p className="mt-3 text-xs text-slate-600">有効期限: {formatDateTimeJp(invitation.expiresAt)}</p>
                  {canManage && status === "active" ? (
                    <div className="mt-3"><InvitationRevokeForm invitationId={invitation.id} /></div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
