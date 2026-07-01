"use client";

import { Archive, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { deleteHamster, updateHamster, updateHamsterActiveStatus } from "@/app/actions/hamsters";

type HamsterListItem = {
  id: string;
  name: string;
  memo: string | null;
  birthDate: string;
  adoptionDate: string;
  isActive: boolean;
  cleaningRecordCount: number;
  weightRecordCount: number;
};

type SortTarget = "registered" | "name";
type SortDirection = "asc" | "desc";

type HamsterListProps = {
  hamsters: HamsterListItem[];
  today: string;
  initialSortTarget?: SortTarget;
  initialSortDirection?: SortDirection;
};

export function HamsterList({
  hamsters,
  today,
  initialSortTarget = "registered",
  initialSortDirection = "asc"
}: HamsterListProps) {
  const [sortTarget, setSortTarget] = useState<SortTarget>(initialSortTarget);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHamsters = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
    const searchedHamsters =
      normalizedSearchTerm.length > 0
        ? hamsters.filter((hamster) => hamster.name.toLocaleLowerCase().includes(normalizedSearchTerm))
        : hamsters;

    // 検索で絞り込んだ結果に対し、表示対象と並び順の組み合わせで表示順だけを変える。
    if (sortTarget === "registered") {
      return sortDirection === "asc" ? searchedHamsters : [...searchedHamsters].reverse();
    }

    return [...searchedHamsters].sort((a, b) => {
      const result = a.name.localeCompare(b.name, "ja");
      return sortDirection === "asc" ? result : -result;
    });
  }, [hamsters, searchTerm, sortDirection, sortTarget]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[160px_160px_1fr]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          表示
          <select value={sortTarget} onChange={(event) => setSortTarget(event.currentTarget.value as SortTarget)}>
            <option value="registered">登録順</option>
            <option value="name">名前</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          並び順
          <select value={sortDirection} onChange={(event) => setSortDirection(event.currentTarget.value as SortDirection)}>
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          検索ワード
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              className="pl-9"
              placeholder="ハムスター名で検索"
            />
          </span>
        </label>
      </div>

      <p className="text-xs text-slate-500">
        {hamsters.length} 件中 {filteredHamsters.length} 件を表示しています。
      </p>

      {filteredHamsters.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          条件に一致するハムスターはいません。
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredHamsters.map((hamster) => {
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
                      <input type="date" name="birthDate" max={today} defaultValue={hamster.birthDate} disabled={isLocked} />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      お迎え日
                      <input type="date" name="adoptionDate" max={today} defaultValue={hamster.adoptionDate} disabled={isLocked} />
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
                  掃除記録 {hamster.cleaningRecordCount}件 / 体重記録 {hamster.weightRecordCount}件
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
