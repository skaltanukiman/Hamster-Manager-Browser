import { Archive, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { createHamster, deleteHamster, updateHamster, updateHamsterActiveStatus } from "@/app/actions/hamsters";
import { StatusMessage } from "@/components/status-message";
import { toDateInputValue, todayInputJst } from "@/lib/date";
import { getHamsterManagementData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HamstersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const hamsters = await getHamsterManagementData();
  // 誕生日とお迎え日は過去から今日までの日付だけを扱うため、入力欄側でも未来日を選ばせない。
  const today = todayInputJst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">ハムスター管理</h2>
        <p className="mt-1 text-sm text-slate-600">名前、メモ、誕生日、お迎え日を管理します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-ink">新規登録</h3>
        <form action={createHamster} className="mt-4 grid gap-4 lg:grid-cols-[minmax(150px,200px)_160px_160px_1fr_auto]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            名前
            <input name="name" required maxLength={15} placeholder="例: きなこ" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            誕生日
            <input type="date" name="birthDate" max={today} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            お迎え日
            <input type="date" name="adoptionDate" max={today} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            メモ
            <input name="memo" maxLength={2000} placeholder="性格、注意点など" />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            登録
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold text-ink">一覧</h3>
        {hamsters.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            登録済みハムスターはありません。
          </div>
        ) : (
          <div className="grid gap-3">
            {hamsters.map((hamster) => {
              const isLocked = !hamster.isActive;

              return (
                <article key={hamster.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        hamster.isActive ? "bg-straw/40 text-slate-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {hamster.isActive ? "管理中" : "管理外"}
                    </span>
                    {isLocked ? <span className="text-xs text-slate-500">記録とプロフィール編集をロック中</span> : null}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <form action={updateHamster} className="grid gap-3 lg:grid-cols-[minmax(140px,180px)_160px_160px_1fr_auto]">
                      <input type="hidden" name="id" value={hamster.id} />
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        名前
                        <input name="name" required maxLength={15} defaultValue={hamster.name} disabled={isLocked} />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        誕生日
                        <input
                          type="date"
                          name="birthDate"
                          max={today}
                          defaultValue={hamster.birthDate ? toDateInputValue(hamster.birthDate) : ""}
                          disabled={isLocked}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        お迎え日
                        <input
                          type="date"
                          name="adoptionDate"
                          max={today}
                          defaultValue={hamster.adoptionDate ? toDateInputValue(hamster.adoptionDate) : ""}
                          disabled={isLocked}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        メモ
                        <input name="memo" maxLength={2000} defaultValue={hamster.memo ?? ""} disabled={isLocked} />
                      </label>
                      <button
                        type="submit"
                        disabled={isLocked}
                        className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-moss px-4 text-sm font-semibold text-moss hover:bg-moss hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <Save className="h-4 w-4" aria-hidden />
                        保存
                      </button>
                    </form>
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={updateHamsterActiveStatus} className="flex items-end">
                        <input type="hidden" name="id" value={hamster.id} />
                        <input type="hidden" name="isActive" value={isLocked ? "true" : "false"} />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {isLocked ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
                          {isLocked ? "管理中に戻す" : "管理外にする"}
                        </button>
                      </form>
                      <form action={deleteHamster} className="flex items-end">
                        <input type="hidden" name="id" value={hamster.id} />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          削除
                        </button>
                      </form>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    掃除記録 {hamster._count.cleaningRecords}件 / 体重記録 {hamster._count.weightRecords}件
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
