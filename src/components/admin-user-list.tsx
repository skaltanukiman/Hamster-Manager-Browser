import { updateUserAppRole } from "@/app/actions/admin";
import {
  APP_ROLE_LABELS,
  type AdminRoleReturnPath,
  type AdminUserListItem
} from "@/lib/admin-users";
import { formatDateJst } from "@/lib/date";

function AppRoleField({
  userId,
  currentRole,
  canEdit,
  returnPath
}: {
  userId: string;
  currentRole: AdminUserListItem["appRole"];
  canEdit: boolean;
  returnPath: AdminRoleReturnPath;
}) {
  if (!canEdit) {
    return <span>{APP_ROLE_LABELS[currentRole]}</span>;
  }

  return (
    <form
      action={updateUserAppRole}
      className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:flex lg:min-w-[15rem]"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value={returnPath} />
      <select name="appRole" defaultValue={currentRole} className="h-9 min-w-0 py-1.5 text-sm">
        {Object.entries(APP_ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-md border border-moss px-3 text-sm font-semibold text-moss hover:bg-moss hover:text-white sm:w-auto"
      >
        変更
      </button>
    </form>
  );
}

export function AdminUserList({
  users,
  canEditAppRoles = false,
  currentUserId,
  returnPath = "/admin/users"
}: {
  users: AdminUserListItem[];
  canEditAppRoles?: boolean;
  currentUserId?: string;
  returnPath?: AdminRoleReturnPath;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
        ユーザーはまだいません。
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm lg:block">
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
                <td className="max-w-48 break-words font-semibold text-ink [overflow-wrap:anywhere]">
                  {user.name || "未設定"}
                </td>
                <td className="max-w-56 break-words [overflow-wrap:anywhere]">{user.email || "未設定"}</td>
                <td>
                  <AppRoleField
                    userId={user.id}
                    currentRole={user.appRole}
                    canEdit={canEditAppRoles && user.id !== currentUserId}
                    returnPath={returnPath}
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
      <div className="grid gap-3 lg:hidden">
        {users.map((user) => (
          <article key={user.id} className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <dl className="grid min-w-0 gap-3 text-sm">
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">名前</dt>
                <dd className="mt-1 break-words font-semibold text-ink [overflow-wrap:anywhere]">
                  {user.name || "未設定"}
                </dd>
              </div>
              <div className="min-w-0 border-t border-slate-100 pt-3">
                <dt className="text-xs font-semibold text-slate-500">メールアドレス</dt>
                <dd className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">
                  {user.email || "未設定"}
                </dd>
              </div>
              <div className="min-w-0 border-t border-slate-100 pt-3">
                <dt className="text-xs font-semibold text-slate-500">アプリ全体権限</dt>
                <dd className="mt-2 min-w-0 text-slate-700">
                  <AppRoleField
                    userId={user.id}
                    currentRole={user.appRole}
                    canEdit={canEditAppRoles && user.id !== currentUserId}
                    returnPath={returnPath}
                  />
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">所属共有数</dt>
                  <dd className="mt-1 text-slate-700">{user._count.memberships}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">セッション数</dt>
                  <dd className="mt-1 text-slate-700">{user._count.sessions}</dd>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <dt className="text-xs font-semibold text-slate-500">作成日</dt>
                <dd className="mt-1 text-slate-700">{formatDateJst(user.createdAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
