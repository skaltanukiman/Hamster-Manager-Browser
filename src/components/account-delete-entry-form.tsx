import { Trash2 } from "lucide-react";

export function AccountDeleteEntryForm() {
  return (
    <section className="rounded-md border border-red-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-red-800">危険な操作</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            アカウントと関連する個人情報を完全に削除します。
          </p>
        </div>
        <form action="/settings/account/delete" method="get" className="shrink-0">
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            アカウントを削除
          </button>
        </form>
      </div>
    </section>
  );
}
