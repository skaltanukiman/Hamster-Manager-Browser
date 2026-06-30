const messages: Record<string, string> = {
  created: "登録しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
  saved: "保存しました。",
  invalid: "入力内容を確認してください。",
  duplicate: "同じ日付の記録が既にあります。",
  hamsterDuplicate: "同じ名前のハムスターが既に登録されています。",
  hamsterNameTooLong: "名前は15文字以内で入力してください。",
  hamsterMemoTooLong: "メモは2000文字以内で入力してください。",
  dashboardLimitExceeded: "表示数を超えてハムスターを選択しています。",
  dashboardSelectionRequired: "表示対象のハムスター数を表示ボード数に合わせてください。",
  future: "未来日には記録できません。",
  locked: "管理外のハムスターは編集できません。管理中に戻してから操作してください。"
};

export function StatusMessage({ status }: { status?: string }) {
  if (!status || !messages[status]) {
    return null;
  }

  const isError =
    status === "invalid" ||
    status === "duplicate" ||
    status === "hamsterDuplicate" ||
    status === "hamsterNameTooLong" ||
    status === "hamsterMemoTooLong" ||
    status === "dashboardLimitExceeded" ||
    status === "dashboardSelectionRequired" ||
    status === "future" ||
    status === "locked";

  return (
    <p
      className={`rounded-md border px-4 py-3 text-sm ${
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {messages[status]}
    </p>
  );
}
