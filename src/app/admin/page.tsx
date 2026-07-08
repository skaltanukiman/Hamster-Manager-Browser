import { ShieldCheck, Users } from "lucide-react";
import type { AppRole, HouseholdInvitation } from "@prisma/client";

import { updateUserAppRole } from "@/app/actions/admin";
import { StatusMessage } from "@/components/status-message";
import { getRequiredAppAdminUser } from "@/lib/auth-context";
import { formatDateJp } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const appRoleLabels = {
  USER: "一般ユーザー",
  ADMIN: "管理者",
  SUPER_ADMIN: "スーパー管理者"
} as const;

const householdRoleLabels = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー"
} as const;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function invitationStatus(invitation: Pick<HouseholdInvitation, "acceptedAt" | "expiresAt">, now: Date) {
  if (invitation.acceptedAt) {
    return "承認済み";
  }

  if (invitation.expiresAt.getTime() <= now.getTime()) {
    return "期限切れ";
  }

  return "有効";
}

async function getAdminPageData() {
  const now = new Date();
  const [users, households, invitations] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }],
      include: {
        _count: {
          select: {
            memberships: true,
            sessions: true
          }
        }
      }
    }),
    prisma.household.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
          include: { user: true }
        },
        _count: {
          select: {
            hamsters: true,
            invitations: true,
            members: true
          }
        }
      }
    }),
    prisma.householdInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        household: true
      }
    })
  ]);

  return { users, households, invitations, now };
}

function RoleSelect({
  userId,
  currentRole,
  canEdit
}: {
  userId: string;
  currentRole: AppRole;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return <span>{appRoleLabels[currentRole]}</span>;
  }

  return (
    <form action={updateUserAppRole} className="flex min-w-[15rem] items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select name="appRole" defaultValue={currentRole} className="h-9 min-w-0 py-1.5 text-sm">
        {Object.entries(appRoleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-moss px-3 text-sm font-semibold text-moss hover:bg-moss hover:text-white"
      >
        変更
      </button>
    </form>
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const currentUser = await getRequiredAppAdminUser();
  const canEditAppRoles = currentUser.appRole === "SUPER_ADMIN";
  const { users, households, invitations, now } = await getAdminPageData();
  const activeInvitationCount = invitations.filter((invitation) => !invitation.acceptedAt && invitation.expiresAt > now).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">管理</h2>
        <p className="mt-1 text-sm text-slate-600">ユーザー、共有、招待状況、アプリ全体権限を確認します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-bold text-ink">{users.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Shares</p>
          <p className="mt-2 text-2xl font-bold text-ink">{households.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Active invites</p>
          <p className="mt-2 text-2xl font-bold text-ink">{activeInvitationCount}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-moss" aria-hidden />
          <h3 className="text-base font-bold text-ink">ユーザー一覧</h3>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>アプリ全体権限</th>
                <th>所属共有数</th>
                <th>セッション数</th>
                <th>作成日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-ink">{user.name || "未設定"}</td>
                  <td>{user.email || "未設定"}</td>
                  <td>
                    <RoleSelect
                      userId={user.id}
                      currentRole={user.appRole}
                      canEdit={canEditAppRoles && user.id !== currentUser.id}
                    />
                  </td>
                  <td>{user._count.memberships}</td>
                  <td>{user._count.sessions}</td>
                  <td>{formatDateJp(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-moss" aria-hidden />
          <h3 className="text-base font-bold text-ink">共有一覧</h3>
        </div>
        <div className="grid gap-3">
          {households.map((household) => (
            <article key={household.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-ink">{household.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    メンバー {household._count.members} 人 / ハムスター {household._count.hamsters} 件 / 招待 {household._count.invitations} 件
                  </p>
                </div>
                <span className="text-xs text-slate-500">作成日: {formatDateJp(household.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {household.members.map((member) => (
                  <span key={member.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {member.user.name || member.user.email || "未設定"} / {householdRoleLabels[member.role]}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold text-ink">招待一覧</h3>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>共有</th>
                <th>状態</th>
                <th>作成日</th>
                <th>期限</th>
                <th>承認日</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="font-semibold text-ink">{invitation.household.name}</td>
                    <td>{invitationStatus(invitation, now)}</td>
                    <td>{formatDateJp(invitation.createdAt)}</td>
                    <td>{formatDateJp(invitation.expiresAt)}</td>
                    <td>{invitation.acceptedAt ? formatDateJp(invitation.acceptedAt) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>招待リンクはまだありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
