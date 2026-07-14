"use client";

import { Ban } from "lucide-react";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { revokeHouseholdInvitation } from "@/app/actions/members";

function RevokeButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      <Ban className="h-4 w-4" aria-hidden />
      {pending ? "無効化中..." : "無効化"}
    </button>
  );
}

export function InvitationRevokeForm({ invitationId }: { invitationId: string }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("この招待リンクを無効化します。元に戻せません。よろしいですか？")) {
      event.preventDefault();
    }
  }

  return (
    <form action={revokeHouseholdInvitation} onSubmit={handleSubmit} className="w-full sm:w-auto">
      <input type="hidden" name="invitationId" value={invitationId} />
      <RevokeButton />
    </form>
  );
}
