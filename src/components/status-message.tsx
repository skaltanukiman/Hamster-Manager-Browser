const messages: Record<string, string> = {
  created: "登録しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
  saved: "保存しました。",
  invalid: "入力内容を確認してください。",
  duplicate: "同じ名前または同じ日付の記録が既にあります。",
  hamsterDuplicate: "同じ名前のハムスターが既に登録されています。",
  future: "未来日には記録できません。"
};

export function StatusMessage({ status }: { status?: string }) {
  if (!status || !messages[status]) {
    return null;
  }

  const isError = status === "invalid" || status === "duplicate" || status === "hamsterDuplicate" || status === "future";

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
