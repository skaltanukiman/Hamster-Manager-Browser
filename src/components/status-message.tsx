"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const messages: Record<string, string> = {
  created: "登録しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
  saved: "保存しました。",
  unchanged: "変更はありません。",
  invalid: "入力内容を確認してください。",
  duplicate: "同じ日付の記録が既に存在します。",
  hamsterDuplicate: "同じ名前のハムスターが既に登録されています。",
  hamsterNameTooLong: "名前は15文字以内で入力してください。",
  hamsterMemoTooLong: "メモは2000文字以内で入力してください。",
  dashboardLimitExceeded: "表示数を超えてハムスターを選択しています。",
  dashboardSelectionRequired: "表示対象のハムスター数を表示ボード数に合わせてください。",
  future: "未来日には記録できません。",
  locked: "管理外のハムスターは編集できません。管理中に戻してから操作してください。",
  invitationCreated: "招待リンクを作成しました。",
  joined: "家族共有に参加しました。",
  forbidden: "この操作を実行する権限がありません。",
  invitationExpired: "招待リンクの有効期限が切れています。",
  invitationUsed: "この招待リンクは既に使用されています。"
};

const errorStatuses = new Set([
  "invalid",
  "duplicate",
  "hamsterDuplicate",
  "hamsterNameTooLong",
  "hamsterMemoTooLong",
  "dashboardLimitExceeded",
  "dashboardSelectionRequired",
  "future",
  "locked",
  "forbidden",
  "invitationExpired",
  "invitationUsed"
]);

const AUTO_DISMISS_MS = 3500;
const LEAVE_ANIMATION_MS = 450;

function AnimatedStatusMessage({ status, message }: { status: string; message: string }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const isError = errorStatuses.has(status);
  const isInfo = status === "unchanged";
  const colorClass = isError
    ? "border-red-200 bg-red-50 text-red-700"
    : isInfo
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  useEffect(() => {
    if (isError) {
      return;
    }

    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, AUTO_DISMISS_MS);
    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, AUTO_DISMISS_MS + LEAVE_ANIMATION_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, [isError]);

  function handleClose() {
    setIsLeaving(true);
    window.setTimeout(() => {
      setIsVisible(false);
    }, LEAVE_ANIMATION_MS);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 overflow-hidden rounded-md border px-4 py-3 text-sm transition-all duration-500 ease-out ${
        isLeaving ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"
      } ${colorClass}`}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {isError ? (
        <button
          type="button"
          onClick={handleClose}
          aria-label="メッセージを閉じる"
          className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current opacity-75 hover:bg-white/60 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function StatusMessage({ status }: { status?: string }) {
  if (!status || !messages[status]) {
    return null;
  }

  return <AnimatedStatusMessage key={status} status={status} message={messages[status]} />;
}
