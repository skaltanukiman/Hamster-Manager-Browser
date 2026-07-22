"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { restoreUserAccess, suspendUserAccess } from "@/app/actions/admin";
import type { AdminRoleReturnPath } from "@/lib/admin-users";
import {
  USER_RESTORE_NOTE_MAX_LENGTH,
  USER_SUSPENSION_REASON_MAX_LENGTH,
  USER_SUSPENSION_REASON_MIN_LENGTH
} from "@/lib/user-access-constants";

type AccessMode = "suspend" | "restore" | null;

function SubmitButton({ mode }: { mode: Exclude<AccessMode, null> }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
        mode === "suspend" ? "bg-red-700 hover:bg-red-800" : "bg-moss hover:bg-moss/90"
      }`}
    >
      {pending ? "処理中..." : mode === "suspend" ? "利用停止を確定する" : "利用停止解除を確定する"}
    </button>
  );
}

export function AdminUserAccessControls({
  user,
  returnPath
}: {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    accessStatus: "ACTIVE" | "SUSPENDED";
  };
  returnPath: AdminRoleReturnPath;
}) {
  const [mode, setMode] = useState<AccessMode>(null);
  const [reason, setReason] = useState("");

  function close() {
    setMode(null);
    setReason("");
  }

  const isSuspended = user.accessStatus === "SUSPENDED";

  return (
    <>
      <button
        type="button"
        onClick={() => setMode(isSuspended ? "restore" : "suspend")}
        className={`inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-sm font-semibold sm:w-auto ${
          isSuspended
            ? "border-moss text-moss hover:bg-moss hover:text-white"
            : "border-red-300 text-red-700 hover:bg-red-50"
        }`}
      >
        {isSuspended ? "利用停止解除" : "利用停止"}
      </button>

      {mode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`user-access-title-${user.id}`}
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl sm:p-6"
          >
            <h3 id={`user-access-title-${user.id}`} className="text-lg font-bold text-ink">
              {mode === "suspend" ? "ユーザーを利用停止しますか？" : "ユーザーの利用停止を解除しますか？"}
            </h3>

            <dl className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-slate-500">対象ユーザー名</dt>
                <dd className="mt-1 break-words font-semibold text-ink [overflow-wrap:anywhere]">
                  {user.name || "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">メールアドレス</dt>
                <dd className="mt-1 break-words text-slate-700 [overflow-wrap:anywhere]">
                  {user.email || "未設定"}
                </dd>
              </div>
            </dl>

            {mode === "suspend" ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                <p className="font-semibold">アカウントや飼育データ、共有グループは削除されません。</p>
                <p>現在の全セッションが無効化され、解除されるまでアプリを利用できなくなります。</p>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                <p className="font-semibold">保存済みのアカウントや飼育データはそのまま利用できます。</p>
                <p>解除後は、同じGoogleアカウントで通常どおりログインできます。</p>
              </div>
            )}

            <form action={mode === "suspend" ? suspendUserAccess : restoreUserAccess} className="mt-5 grid gap-4">
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="returnTo" value={returnPath} />
              {mode === "suspend" ? (
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  利用停止理由（管理者向け・必須）
                  <textarea
                    name="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    minLength={USER_SUSPENSION_REASON_MIN_LENGTH}
                    maxLength={USER_SUSPENSION_REASON_MAX_LENGTH}
                    rows={5}
                    className="min-h-28 resize-y"
                    placeholder="利用停止の根拠を入力してください。ユーザー本人には表示されません。"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    前後の空白を除いて{USER_SUSPENSION_REASON_MIN_LENGTH}〜{USER_SUSPENSION_REASON_MAX_LENGTH}文字
                  </span>
                </label>
              ) : (
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  解除理由・備考（任意）
                  <textarea
                    name="note"
                    maxLength={USER_RESTORE_NOTE_MAX_LENGTH}
                    rows={4}
                    className="min-h-24 resize-y"
                    placeholder="必要に応じて解除の経緯を入力してください。"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    最大{USER_RESTORE_NOTE_MAX_LENGTH}文字
                  </span>
                </label>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <SubmitButton mode={mode} />
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
