"use client";

import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import type { HouseholdRole } from "@prisma/client";

import { updateHouseholdMemberRole } from "@/app/actions/members";

type ManageableMemberRole = Extract<HouseholdRole, "ADMIN" | "MEMBER">;

const roleLabels: Record<ManageableMemberRole, string> = {
  ADMIN: "管理者",
  MEMBER: "メンバー"
};

type MemberRoleFormProps = {
  memberId: string;
  memberName: string;
  currentRole: ManageableMemberRole;
};

export function MemberRoleForm({ memberId, memberName, currentRole }: MemberRoleFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`${memberName} さんの権限を変更します。よろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={updateHouseholdMemberRole} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <select name="role" defaultValue={currentRole} aria-label={`${memberName} さんの権限`} className="h-9 min-w-32 py-1.5 text-sm">
        {Object.entries(roleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        権限更新
      </button>
    </form>
  );
}
