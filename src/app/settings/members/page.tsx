import { headers } from "next/headers";
import { LogOut, Users } from "lucide-react";
import Link from "next/link";

import { HouseholdInvitationForm } from "@/components/household-invitation-form";
import { HouseholdInvitationList } from "@/components/household-invitation-list";
import {
  canManageHouseholdInvitations,
  canManageHouseholdMemberRoles,
  canRemoveHouseholdMembers,
  HOUSEHOLD_ROLE_LABELS
} from "@/lib/authorization";
import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { formatDateJst } from "@/lib/date";
import { INVITATION_TTL_DAYS, MAX_ACTIVE_HOUSEHOLD_INVITATIONS } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { MemberRemoveForm } from "@/components/member-remove-form";
import { MemberRoleForm } from "@/components/member-role-form";
import { StatusMessage } from "@/components/status-message";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getInvitationOrigin() {
  const configuredOrigin = process.env.AUTH_URL;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // 不正なAUTH_URLはリクエストヘッダーから組み立てるフォールバックへ回す。
    }
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") === "https" ? "https" : "http";
  return host ? `${protocol}://${host}` : "http://localhost:3001";
}

async function getMembersPageData() {
  const context = await getRequiredHouseholdContext();
  const now = new Date();
  const [members, invitations, hamsterCount] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId: context.household.id },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.householdInvitation.findMany({
      where: {
        householdId: context.household.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.hamster.count({ where: { householdId: context.household.id } })
  ]);

  return { context, members, invitations, hamsterCount, now };
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[]; errorId?: string | string[] }>;
}) {
  const params = await searchParams;
  const invitationOrigin = await getInvitationOrigin();
  const { context, members, invitations, hamsterCount, now } = await getMembersPageData();
  const canManageInvitations = canManageHouseholdInvitations(context.membership.role);
  const canManageMemberRoles = canManageHouseholdMemberRoles(context.membership.role);
  const canRemoveMembers = canRemoveHouseholdMembers(context.membership.role);
  const hasMemberActions = canManageMemberRoles || canRemoveMembers;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">共有</h2>
        <p className="mt-1 text-sm text-slate-600">{context.household.name} のメンバーを管理します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} errorId={getParam(params.errorId)} />

      {canManageInvitations ? (
        <HouseholdInvitationForm
          invitationOrigin={invitationOrigin}
          ttlDays={INVITATION_TTL_DAYS}
          activeInvitationCount={invitations.length}
          maxActiveInvitations={MAX_ACTIVE_HOUSEHOLD_INVITATIONS}
        />
      ) : (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-ink">招待リンク</h3>
            <p className="mt-1 text-sm text-slate-600">リンクは作成から {INVITATION_TTL_DAYS} 日間だけ有効です。</p>
          </div>
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            招待リンクを作成できるのはオーナーまたは管理者です。
          </p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-moss" aria-hidden />
          <h3 className="text-base font-bold text-ink">メンバー一覧</h3>
        </div>

        <div className="hidden overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>権限</th>
                <th>参加日</th>
                {hasMemberActions ? <th>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const memberDisplayName = member.user.name || member.user.email || "未設定";
                const manageableMemberRole = member.role === "OWNER" ? null : member.role;
                const canUpdateThisMemberRole =
                  canManageMemberRoles && member.userId !== context.user.id && manageableMemberRole !== null;
                const canRemoveThisMember =
                  canRemoveMembers &&
                  member.userId !== context.user.id &&
                  (context.membership.role === "OWNER" || member.role === "MEMBER" || member.role === "VIEWER");

                return (
                  <tr key={member.id}>
                    <td className="font-semibold text-ink">{member.user.name || "未設定"}</td>
                    <td>{member.user.email || "未設定"}</td>
                    <td>{HOUSEHOLD_ROLE_LABELS[member.role]}</td>
                    <td>{formatDateJst(member.createdAt)}</td>
                    {hasMemberActions ? (
                      <td>
                        {canUpdateThisMemberRole || canRemoveThisMember ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {canUpdateThisMemberRole ? (
                              manageableMemberRole ? (
                                <MemberRoleForm
                                  memberId={member.id}
                                  memberName={memberDisplayName}
                                  currentRole={manageableMemberRole}
                                />
                              ) : null
                            ) : null}
                            {canRemoveThisMember ? (
                              <MemberRemoveForm memberId={member.id} memberName={memberDisplayName} />
                            ) : null}
                          </div>
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

        <div className="grid gap-3 lg:hidden">
          {members.map((member) => {
            const memberDisplayName = member.user.name || member.user.email || "未設定";
            const manageableMemberRole = member.role === "OWNER" ? null : member.role;
            const canUpdateThisMemberRole =
              canManageMemberRoles && member.userId !== context.user.id && manageableMemberRole !== null;
            const canRemoveThisMember =
              canRemoveMembers &&
              member.userId !== context.user.id &&
              (context.membership.role === "OWNER" || member.role === "MEMBER" || member.role === "VIEWER");

            return (
              <article key={member.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-bold text-ink">{member.user.name || "未設定"}</h4>
                    <p className="mt-1 break-words text-slate-600">{member.user.email || "未設定"}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-straw/40 px-2 py-1 text-xs font-semibold text-slate-700">
                    {HOUSEHOLD_ROLE_LABELS[member.role]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">参加日: {formatDateJst(member.createdAt)}</p>
                  {canUpdateThisMemberRole || canRemoveThisMember ? (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      {canUpdateThisMemberRole ? (
                        manageableMemberRole ? (
                          <MemberRoleForm memberId={member.id} memberName={memberDisplayName} currentRole={manageableMemberRole} />
                        ) : null
                      ) : null}
                      {canRemoveThisMember ? <MemberRemoveForm memberId={member.id} memberName={memberDisplayName} /> : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-ink">Householdからの退出</h3>
            <p className="mt-1 text-sm text-slate-600">現在参加しているHouseholdから、自分で退出する手続きです。</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">現在のHousehold</dt>
            <dd className="mt-1 break-words font-bold text-ink">{context.household.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">現在の権限</dt>
            <dd className="mt-1 font-bold text-ink">{HOUSEHOLD_ROLE_LABELS[context.membership.role]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">メンバー数</dt>
            <dd className="mt-1 font-bold text-ink">{members.length}人</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">登録ハムスター数</dt>
            <dd className="mt-1 font-bold text-ink">{hamsterCount}匹</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-1 text-sm leading-6 text-slate-600">
          <p>退出後は、このHouseholdのハムスターや記録を閲覧・編集できなくなります。</p>
          <p>退出しても、Household内のハムスターや共有記録自体は削除されません。</p>
        </div>

        <div className="mt-5 flex justify-end">
          <Link
            href="/settings/members/leave"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 sm:w-auto"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            退出手続きへ
          </Link>
        </div>
      </section>

      <HouseholdInvitationList invitations={invitations} canManage={canManageInvitations} now={now} />
    </div>
  );
}
