import Link from "next/link";
import Form from "next/form";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldCheck, Users } from "lucide-react";
import type { AppRole } from "@prisma/client";

import { updateUserAppRole } from "@/app/actions/admin";
import { AdminInvitationHouseholdCombobox } from "@/components/admin-invitation-household-combobox";
import { InvitationStatusBadge } from "@/components/invitation-status-badge";
import { StatusMessage } from "@/components/status-message";
import {
  ADMIN_INVITATION_SEARCH_MAX_LENGTH,
  buildAdminInvitationHref,
  findMatchingAdminInvitationHouseholdIds,
  getActiveInvitationCount,
  getAdminInvitationPage,
  parseAdminInvitationQuery,
  type AdminInvitationQuery
} from "@/lib/admin-invitations";
import { HOUSEHOLD_ROLE_LABELS } from "@/lib/authorization";
import { getRequiredAppAdminUser } from "@/lib/auth-context";
import { formatDateJst, formatDateTimeJst } from "@/lib/date";
import { getHouseholdInvitationStatus, getInvitationCreatorDisplayName } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const appRoleLabels = {
  USER: "一般ユーザー",
  ADMIN: "管理者",
  SUPER_ADMIN: "スーパー管理者"
} as const;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getAdminPageData(invitationQuery: AdminInvitationQuery) {
  const now = new Date();
  const [users, households, activeInvitationCount] = await Promise.all([
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
    getActiveInvitationCount(now)
  ]);
  const matchingHouseholdIds = findMatchingAdminInvitationHouseholdIds(
    invitationQuery.search,
    households
  );
  const invitationPage = await getAdminInvitationPage(invitationQuery, now, matchingHouseholdIds);

  return {
    users,
    households,
    invitationPage,
    activeInvitationCount,
    hasAnyInvitations: households.some((household) => household._count.invitations > 0),
    now
  };
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
  searchParams: Promise<{
    status?: string | string[];
    errorId?: string | string[];
    inviteStatus?: string | string[];
    inviteSearch?: string | string[];
    inviteSort?: string | string[];
    invitePage?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const currentUser = await getRequiredAppAdminUser();
  const canEditAppRoles = currentUser.appRole === "SUPER_ADMIN";
  const invitationQuery = parseAdminInvitationQuery(params);
  const { users, households, invitationPage, activeInvitationCount, hasAnyInvitations, now } =
    await getAdminPageData(invitationQuery);
  const { invitations, pagination } = invitationPage;
  const firstVisibleNumber =
    pagination.totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const lastVisibleNumber = (pagination.currentPage - 1) * pagination.pageSize + invitations.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">管理</h2>
        <p className="mt-1 text-sm text-slate-600">ユーザー、共有、招待状況、アプリ全体権限を確認します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} errorId={getParam(params.errorId)} />

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
                  <td>{formatDateJst(user.createdAt)}</td>
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
                <span className="text-xs text-slate-500">作成日: {formatDateJst(household.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {household.members.map((member) => (
                  <span key={member.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {member.user.name || member.user.email || "未設定"} / {HOUSEHOLD_ROLE_LABELS[member.role]}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold text-ink">招待一覧</h3>
        <Form
          action="/admin"
          scroll={false}
          className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(130px,0.7fr)_minmax(220px,1.4fr)_minmax(220px,1fr)_auto] lg:items-end"
        >
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            状態
            <select name="inviteStatus" defaultValue={invitationQuery.status}>
              <option value="all">すべて</option>
              <option value="active">有効</option>
              <option value="accepted">使用済み</option>
              <option value="expired">期限切れ</option>
              <option value="revoked">無効化済み</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            共有名
            <AdminInvitationHouseholdCombobox
              key={invitationQuery.search}
              name="inviteSearch"
              defaultValue={invitationQuery.search}
              maxLength={ADMIN_INVITATION_SEARCH_MAX_LENGTH}
              options={households.map((household) => ({ id: household.id, name: household.name }))}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            並び順
            <select name="inviteSort" defaultValue={invitationQuery.sort}>
              <option value="created-desc">作成日時：新しい順</option>
              <option value="created-asc">作成日時：古い順</option>
              <option value="expires-asc">有効期限：近い順</option>
              <option value="expires-desc">有効期限：遠い順</option>
            </select>
          </label>
          <input type="hidden" name="invitePage" value="1" />
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss-dark"
            >
              絞り込む
            </button>
            <Link
              href="/admin"
              scroll={false}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              条件をクリア
            </Link>
          </div>
        </Form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {pagination.totalCount === 0 ? (
            <span>条件に一致する招待はありません。</span>
          ) : (
            <span>
              全{pagination.totalCount}件中 {firstVisibleNumber}～{lastVisibleNumber}件を表示しています。
            </span>
          )}
          <span>
            {pagination.currentPage} / {pagination.totalPages} ページ
          </span>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>共有</th>
                <th>状態</th>
                <th>作成者</th>
                <th>作成日時</th>
                <th>有効期限</th>
                <th>使用日時</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length > 0 ? (
                invitations.map((invitation) => {
                  const status = getHouseholdInvitationStatus(invitation, now);
                  return (
                    <tr key={invitation.id}>
                      <td className="font-semibold text-ink">{invitation.household.name}</td>
                      <td>
                        <InvitationStatusBadge status={status} />
                      </td>
                      <td>{getInvitationCreatorDisplayName(invitation)}</td>
                      <td>{formatDateTimeJst(invitation.createdAt)}</td>
                      <td>{formatDateTimeJst(invitation.expiresAt)}</td>
                      <td>{invitation.acceptedAt ? formatDateTimeJst(invitation.acceptedAt) : "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>{hasAnyInvitations ? "条件に一致する招待はありません。" : "招待リンクはまだありません。"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination.totalCount > 0 ? (
          <nav
            className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-end"
            aria-label="招待一覧のページ移動"
          >
            {pagination.currentPage > 1 ? (
              <Link
                href={buildAdminInvitationHref(invitationQuery, 1)}
                scroll={false}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                <ChevronsLeft className="h-4 w-4" aria-hidden />
                最初へ
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
              >
                <ChevronsLeft className="h-4 w-4" aria-hidden />
                最初へ
              </button>
            )}
            {pagination.currentPage > 1 ? (
              <Link
                href={buildAdminInvitationHref(invitationQuery, pagination.currentPage - 1)}
                scroll={false}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                前へ
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                前へ
              </button>
            )}
            <span className="order-first col-span-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 sm:order-none sm:col-span-1 sm:w-auto">
              {pagination.currentPage} / {pagination.totalPages} ページ
            </span>
            {pagination.currentPage < pagination.totalPages ? (
              <Link
                href={buildAdminInvitationHref(invitationQuery, pagination.currentPage + 1)}
                scroll={false}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                次へ
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
              >
                次へ
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
            {pagination.currentPage < pagination.totalPages ? (
              <Link
                href={buildAdminInvitationHref(invitationQuery, pagination.totalPages)}
                scroll={false}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                最後へ
                <ChevronsRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
              >
                最後へ
                <ChevronsRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
