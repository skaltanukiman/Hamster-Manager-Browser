"use client";

import { Copy, Link as LinkIcon, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { createHouseholdInvitation, type CreateHouseholdInvitationState } from "@/app/actions/members";
import { buildInvitationUrl } from "@/lib/invitations";

const INITIAL_STATE: CreateHouseholdInvitationState = {
  inviteToken: null,
  errorCode: null,
  errorMessage: null,
  retryAfterSeconds: null
};

function CreateInvitationButton({
  activeLimitReached,
  activeLimitMessageId
}: {
  activeLimitReached: boolean;
  activeLimitMessageId: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || activeLimitReached}
      aria-describedby={activeLimitReached ? activeLimitMessageId : undefined}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90 disabled:opacity-60 ${
        activeLimitReached ? "disabled:cursor-not-allowed" : "disabled:cursor-wait"
      }`}
    >
      <Plus className="h-4 w-4" aria-hidden />
      {pending ? "作成中..." : "招待リンクを作成"}
    </button>
  );
}

export function HouseholdInvitationForm({
  invitationOrigin,
  ttlDays,
  activeInvitationCount,
  maxActiveInvitations
}: {
  invitationOrigin: string;
  ttlDays: number;
  activeInvitationCount: number;
  maxActiveInvitations: number;
}) {
  const [state, formAction] = useActionState(createHouseholdInvitation, INITIAL_STATE);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const inviteUrl = state.inviteToken ? buildInvitationUrl(invitationOrigin, state.inviteToken) : "";
  const activeLimitReached = activeInvitationCount >= maxActiveInvitations;
  const activeLimitMessageId = "active-invitation-limit-message";

  async function copyInvitationUrl(url: string, isAutomatic: boolean) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(url);
      setCopyFeedback(isAutomatic ? "招待リンクを作成し、クリップボードにコピーしました" : "コピーしました");
    } catch {
      setCopyFeedback(
        isAutomatic
          ? "招待リンクを作成しました。コピーボタンからコピーしてください"
          : "コピーに失敗しました。もう一度お試しください"
      );
    }
  }

  useEffect(() => {
    if (!inviteUrl) {
      return;
    }

    setCopyFeedback(null);
    void copyInvitationUrl(inviteUrl, true);
  }, [inviteUrl]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink">招待リンク</h3>
          <p className="mt-1 text-sm text-slate-600">リンクは作成から {ttlDays} 日間だけ有効です。</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            有効なリンク {activeInvitationCount} / {maxActiveInvitations}件
          </p>
          {activeLimitReached ? (
            <p id={activeLimitMessageId} className="mt-2 text-sm text-amber-700">
              不要な招待リンクを無効化すると、新しいリンクを作成できます。
            </p>
          ) : null}
        </div>
        <form action={formAction}>
          <CreateInvitationButton
            activeLimitReached={activeLimitReached}
            activeLimitMessageId={activeLimitMessageId}
          />
        </form>
      </div>

      <div>
        {state.errorMessage ? (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{state.errorMessage}</p>
            {state.retryAfterSeconds ? (
              <p className="mt-1 text-xs">再度作成できるまで、あと約 {state.retryAfterSeconds} 秒です。</p>
            ) : null}
          </div>
        ) : inviteUrl ? (
          <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
            招待相手に共有するリンク
            <span className="flex flex-col gap-2 sm:flex-row">
              <span className="relative block min-w-0 flex-1">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input readOnly value={inviteUrl} className="w-full pl-9" aria-label="招待リンク" />
              </span>
              <button
                type="button"
                onClick={() => void copyInvitationUrl(inviteUrl, false)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" aria-hidden />
                コピー
              </button>
            </span>
            <span className="text-xs font-normal text-slate-500">このリンクは作成直後のこの画面でのみ確認できます。</span>
          </label>
        ) : (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            招待リンクを作成すると、ここに共有用URLが表示されます。
          </p>
        )}
        {copyFeedback ? (
          <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">
            {copyFeedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}
