"use client";

import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";

import { updateHouseholdMemberRole } from "@/app/actions/members";
import type { ManageableHouseholdRole } from "@/lib/authorization";

const roleLabels: Record<ManageableHouseholdRole, string> = {
  VIEWER: "閲覧者",
  MEMBER: "メンバー",
  ADMIN: "管理者",
};

type MemberRoleFormProps = {
  memberId: string;
  memberName: string;
  currentRole: ManageableHouseholdRole;
};

export function MemberRoleForm({ memberId, memberName, currentRole }: MemberRoleFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`${memberName} さんの権限を変更します。よろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={updateHouseholdMemberRole} onSubmit={handleSubmit} className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
      <input type="hidden" name="memberId" value={memberId} />
      <select
        name="role"
        defaultValue={currentRole}
        aria-label={`${memberName} さんの権限`}
        className="h-9 w-full min-w-0 py-1.5 text-center text-sm [text-align-last:center] sm:w-36 sm:shrink-0 sm:text-left sm:[text-align-last:left]"
      >
        {Object.entries(roleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-36"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        権限更新
      </button>
    </form>
  );
}
