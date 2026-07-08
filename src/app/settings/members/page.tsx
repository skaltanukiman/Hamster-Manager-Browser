import { headers } from "next/headers";
import { Link as LinkIcon, Plus, Users } from "lucide-react";

import { createHouseholdInvitation } from "@/app/actions/members";
import { getRequiredHouseholdContext, hasHouseholdRole } from "@/lib/auth-context";
import { formatDateJp } from "@/lib/date";
import { INVITATION_TTL_DAYS } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { MemberRemoveForm } from "@/components/member-remove-form";
import { StatusMessage } from "@/components/status-message";

export const dynamic = "force-dynamic";

const roleLabels = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー"
} as const;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getInviteUrl(token: string | undefined) {
  if (!token) {
    return "";
  }

  const configuredOrigin = process.env.AUTH_URL?.replace(/\/$/, "");
  if (configuredOrigin) {
    return `${configuredOrigin}/invitations/accept?token=${encodeURIComponent(token)}`;
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const path = `/invitations/accept?token=${encodeURIComponent(token)}`;

  return host ? `${protocol}://${host}${path}` : path;
}

async function getMembersPageData() {
  const context = await getRequiredHouseholdContext();
  const members = await prisma.householdMember.findMany({
    where: { householdId: context.household.id },
    include: {
      user: true
    },
    orderBy: { createdAt: "asc" }
  });

  return { context, members };
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[]; inviteToken?: string | string[] }>;
}) {
  const params = await searchParams;
  const inviteUrl = await getInviteUrl(getParam(params.inviteToken));
  const { context, members } = await getMembersPageData();
  const canManageInvitations = hasHouseholdRole(context.membership.role, ["OWNER", "ADMIN"]);
  const canRemoveMembers = hasHouseholdRole(context.membership.role, ["OWNER"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">共有</h2>
        <p className="mt-1 text-sm text-slate-600">{context.household.name} のメンバーを管理します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-ink">招待リンク</h3>
            <p className="mt-1 text-sm text-slate-600">リンクは作成から {INVITATION_TTL_DAYS} 日間だけ有効です。</p>
          </div>
          {canManageInvitations ? (
            <form action={createHouseholdInvitation}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90"
              >
                <Plus className="h-4 w-4" aria-hidden />
                招待リンクを作成
              </button>
            </form>
          ) : null}
        </div>

        {canManageInvitations ? (
          inviteUrl ? (
            <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
              招待相手に共有するリンク
              <span className="relative block">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input readOnly value={inviteUrl} className="pl-9" />
              </span>
            </label>
          ) : (
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              招待リンクを作成すると、ここに共有用URLが表示されます。
            </p>
          )
        ) : (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            招待リンクを作成できるのはオーナーまたは管理者です。
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-moss" aria-hidden />
          <h3 className="text-base font-bold text-ink">メンバー一覧</h3>
        </div>

        <div className="hidden overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>権限</th>
                <th>参加日</th>
                {canRemoveMembers ? <th>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const memberDisplayName = member.user.name || member.user.email || "未設定";
                const canRemoveThisMember = canRemoveMembers && member.userId !== context.user.id;

                return (
                  <tr key={member.id}>
                    <td className="font-semibold text-ink">{member.user.name || "未設定"}</td>
                    <td>{member.user.email || "未設定"}</td>
                    <td>{roleLabels[member.role]}</td>
                    <td>{formatDateJp(member.createdAt)}</td>
                    {canRemoveMembers ? (
                      <td>
                        {canRemoveThisMember ? (
                          <MemberRemoveForm memberId={member.id} memberName={memberDisplayName} />
                        ) : (
                          <span className="text-sm text-slate-400">解除不可</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {members.map((member) => {
            const memberDisplayName = member.user.name || member.user.email || "未設定";
            const canRemoveThisMember = canRemoveMembers && member.userId !== context.user.id;

            return (
              <article key={member.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-bold text-ink">{member.user.name || "未設定"}</h4>
                    <p className="mt-1 break-words text-slate-600">{member.user.email || "未設定"}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-straw/40 px-2 py-1 text-xs font-semibold text-slate-700">
                    {roleLabels[member.role]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">参加日: {formatDateJp(member.createdAt)}</p>
                  {canRemoveThisMember ? <MemberRemoveForm memberId={member.id} memberName={memberDisplayName} /> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
