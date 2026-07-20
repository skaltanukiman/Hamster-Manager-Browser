"use client";

import { Check, Copy, Link as LinkIcon, Plus } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createHouseholdInvitation, type CreateHouseholdInvitationState } from "@/app/actions/members";
import { buildInvitationUrl } from "@/lib/invitations";

const INITIAL_STATE: CreateHouseholdInvitationState = {
  inviteToken: null,
  errorCode: null,
  errorMessage: null,
  retryAfterSeconds: null
};

type Toast = {
  id: number;
  message: string;
  variant: "success" | "error";
  visible: boolean;
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
  const [toast, setToast] = useState<Toast | null>(null);
  const [manualCopySucceeded, setManualCopySucceeded] = useState(false);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRemovalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnimationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const inviteUrl = state.inviteToken ? buildInvitationUrl(invitationOrigin, state.inviteToken) : "";
  const activeLimitReached = activeInvitationCount >= maxActiveInvitations;
  const activeLimitMessageId = "active-invitation-limit-message";

  const clearToastTimers = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    if (toastRemovalTimerRef.current) {
      clearTimeout(toastRemovalTimerRef.current);
    }
    if (toastAnimationFrameRef.current) {
      cancelAnimationFrame(toastAnimationFrameRef.current);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: Toast["variant"], duration: number) => {
      if (!isMountedRef.current) {
        return;
      }

      clearToastTimers();
      const id = ++toastIdRef.current;
      setToast({ id, message, variant, visible: false });

      toastAnimationFrameRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setToast((currentToast) =>
            currentToast?.id === id ? { ...currentToast, visible: true } : currentToast
          );
        }
      });

      toastTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        setToast((currentToast) =>
          currentToast?.id === id ? { ...currentToast, visible: false } : currentToast
        );
        toastRemovalTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setToast((currentToast) => (currentToast?.id === id ? null : currentToast));
          }
        }, 200);
      }, duration);
    },
    [clearToastTimers]
  );

  const copyInvitationUrl = useCallback(async (url: string, isAutomatic: boolean) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(url);
      if (!isMountedRef.current) {
        return;
      }

      if (isAutomatic) {
        showToast("招待リンクをコピーしました", "success", 2500);
        return;
      }

      if (manualCopyTimerRef.current) {
        clearTimeout(manualCopyTimerRef.current);
      }
      setManualCopySucceeded(true);
      manualCopyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setManualCopySucceeded(false);
        }
      }, 2000);
    } catch {
      if (isMountedRef.current) {
        showToast("コピーできませんでした。もう一度お試しください", "error", 4000);
      }
    }
  }, [showToast]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearToastTimers();
      if (manualCopyTimerRef.current) {
        clearTimeout(manualCopyTimerRef.current);
      }
    };
  }, [clearToastTimers]);

  useEffect(() => {
    if (!inviteUrl) {
      return;
    }

    void copyInvitationUrl(inviteUrl, true);
  }, [copyInvitationUrl, inviteUrl]);

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
                {manualCopySucceeded ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {manualCopySucceeded ? "コピー済み" : "コピー"}
              </button>
            </span>
            <span className="text-xs font-normal text-slate-500">このリンクは作成直後のこの画面でのみ確認できます。</span>
          </label>
        ) : (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            招待リンクを作成すると、ここに共有用URLが表示されます。
          </p>
        )}
      </div>
      {toast ? (
        <div
          role={toast.variant === "error" ? "alert" : "status"}
          aria-live={toast.variant === "error" ? "assertive" : "polite"}
          className={`pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-lg transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:bottom-5 sm:left-auto sm:right-5 sm:w-auto sm:min-w-[20rem] sm:translate-x-0 ${
            toast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          } ${
            toast.variant === "success"
              ? "border-emerald-200 bg-white text-slate-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.variant === "success" ? (
            <Check className="h-5 w-5 shrink-0 text-moss" aria-hidden />
          ) : null}
          <span>{toast.message}</span>
        </div>
      ) : null}
    </section>
  );
}
