"use client";

import { UserMinus } from "lucide-react";
import type { FormEvent } from "react";

import { removeHouseholdMember } from "@/app/actions/members";

type MemberRemoveFormProps = {
  memberId: string;
  memberName: string;
};

export function MemberRemoveForm({ memberId, memberName }: MemberRemoveFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`${memberName} さんの共有を解除します。よろしいですか？`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={removeHouseholdMember} onSubmit={handleSubmit} className="w-full sm:w-auto">
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-36"
      >
        <UserMinus className="h-4 w-4" aria-hidden />
        共有解除
      </button>
    </form>
  );
}
