"use client";

import type { HouseholdRole } from "@prisma/client";
import { ArrowRight, Home, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteCurrentUserAccount } from "@/app/actions/account";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  type AccountDeleteDisposition
} from "@/lib/account-delete-shared";
import { HOUSEHOLD_ROLE_LABELS } from "@/lib/authorization";

type AccountDeleteFormHousehold = {
  householdId: string;
  householdName: string;
  currentRole: HouseholdRole;
  memberCount: number;
  disposition: AccountDeleteDisposition;
  transferCandidates: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    role: HouseholdRole;
  }>;
};

const DISPOSITION_LABELS: Record<AccountDeleteDisposition, string> = {
  deleteHousehold: "このグループとすべてのデータが削除されます",
  leaveHousehold: "このグループから退出します",
  transferOwnership: "所有権の移譲が必要です",
  blocked: "グループの状態を確認できないため削除を続行できません"
};

function AccountDeleteSubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {pending ? "アカウントを削除中..." : "アカウントを完全に削除する"}
    </button>
  );
}

export function AccountDeleteForm({
  expectedStateToken,
  households,
  deletionBlocked
}: {
  expectedStateToken: string;
  households: AccountDeleteFormHousehold[];
  deletionBlocked: boolean;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const transferHouseholds = households.filter(
    (household) => household.disposition === "transferOwnership"
  );
  const allTransfersSelected = transferHouseholds.every(
    (household) => Boolean(transferTargets[household.householdId])
  );
  const canSubmit =
    !deletionBlocked && allTransfersSelected && confirmationText === ACCOUNT_DELETE_CONFIRMATION;

  return (
    <form action={deleteCurrentUserAccount} className="space-y-6">
      <input type="hidden" name="expectedStateToken" value={expectedStateToken} />

      <section className="space-y-4">
        <h2 className="text-base font-bold text-ink">共有グループごとの処理</h2>
        {households.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            現在所属している共有グループはありません。アカウントと認証情報だけが削除されます。
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {households.map((household) => {
              const isTransfer = household.disposition === "transferOwnership";
              const isDelete = household.disposition === "deleteHousehold";
              const selectedTarget = household.transferCandidates.find(
                (candidate) => candidate.userId === transferTargets[household.householdId]
              );

              return (
                <article
                  key={household.householdId}
                  className={`rounded-md border bg-white p-4 shadow-sm sm:p-5 ${
                    isDelete
                      ? "border-red-200"
                      : isTransfer
                        ? "border-amber-200"
                        : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Home className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold text-ink">{household.householdName}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {household.memberCount}人
                        </span>
                        <span>{HOUSEHOLD_ROLE_LABELS[household.currentRole]}</span>
                      </div>
                    </div>
                  </div>
                  <p
                    className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${
                      isDelete
                        ? "bg-red-50 text-red-800"
                        : isTransfer
                          ? "bg-amber-50 text-amber-900"
                          : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {DISPOSITION_LABELS[household.disposition]}
                  </p>

                  {isTransfer ? (
                    <div className="mt-4">
                      <label
                        htmlFor={`account-transfer-${household.householdId}`}
                        className="block text-sm font-semibold text-ink"
                      >
                        新しいオーナー
                      </label>
                      <select
                        id={`account-transfer-${household.householdId}`}
                        name={`transferToUserId:${household.householdId}`}
                        value={transferTargets[household.householdId] ?? ""}
                        onChange={(event) =>
                          setTransferTargets((current) => ({
                            ...current,
                            [household.householdId]: event.target.value
                          }))
                        }
                        required
                        className="mt-2 w-full"
                      >
                        <option value="">選択してください</option>
                        {household.transferCandidates.map((candidate) => (
                          <option key={candidate.userId} value={candidate.userId}>
                            {candidate.name || candidate.email || "名前未設定"} / 現在: {HOUSEHOLD_ROLE_LABELS[candidate.role]}
                          </option>
                        ))}
                      </select>
                      {selectedTarget ? (
                        <p className="mt-3 flex flex-wrap items-center gap-1 text-xs font-semibold text-amber-900">
                          {selectedTarget.name || selectedTarget.email || "名前未設定"}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                          オーナーへ移譲
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-950 sm:p-5">
        <h2 className="text-base font-bold">削除前に必ず確認してください</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>アカウント削除は取り消せません。</li>
          <li>自分だけで所有している共有グループと、その中のデータ・画像も削除されます。</li>
          <li>ほかのメンバーがいる共有グループと共有データは残ります。</li>
          <li>削除後はログアウトし、このアカウントではログインできなくなります。</li>
        </ul>

        <label className="mt-5 block font-semibold" htmlFor="account-delete-confirmation">
          確認のため「{ACCOUNT_DELETE_CONFIRMATION}」と入力してください
        </label>
        <input
          id="account-delete-confirmation"
          name="confirmationText"
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          autoComplete="off"
          required
          className="mt-2 w-full border-red-300 bg-white"
        />
        <p className="mt-2 text-xs text-red-800">空白を含めず、表示された文字列と完全一致する必要があります。</p>
      </section>

      <div className="flex justify-end">
        <AccountDeleteSubmitButton enabled={canSubmit} />
      </div>
    </form>
  );
}
