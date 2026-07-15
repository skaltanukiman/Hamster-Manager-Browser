import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { HamsterSelectorInput } from "@/components/hamster-selector-input";
import { RecordCreateForms } from "@/components/record-create-forms";
import { RecordTimeline } from "@/components/record-timeline";
import { StatusMessage } from "@/components/status-message";
import { canEditHouseholdSharedData } from "@/lib/authorization";
import { todayInputJst } from "@/lib/date";
import { getRecordsPageData } from "@/lib/record-queries";
import {
  normalizeRecordDateFilter,
  normalizeRecordKeyword,
  normalizeRecordPage,
  normalizeRecordTypeFilter,
  type RecordTypeFilter
} from "@/lib/records";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type Filters = {
  hamsterId: string;
  type: RecordTypeFilter;
  from: string;
  to: string;
  keyword: string;
  favoriteOnly: boolean;
  page: number;
};

function recordsHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.hamsterId) params.set("hamsterId", filters.hamsterId);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.favoriteOnly) params.set("favorite", "1");
  if (filters.page > 1) params.set("page", String(filters.page));
  return `/records${params.size ? `?${params.toString()}` : ""}`;
}

const typeTabs: Array<{ value: RecordTypeFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "health", label: "健康・体調" },
  { value: "medical", label: "通院" },
  { value: "memory", label: "思い出" }
];

export default async function RecordsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedHamsterId = getParam(params.hamsterId) ?? "";
  const filters: Filters = {
    hamsterId: requestedHamsterId,
    type: normalizeRecordTypeFilter(getParam(params.type)),
    from: normalizeRecordDateFilter(getParam(params.from)),
    to: normalizeRecordDateFilter(getParam(params.to)),
    keyword: normalizeRecordKeyword(getParam(params.keyword)),
    favoriteOnly: getParam(params.favorite) === "1",
    page: normalizeRecordPage(getParam(params.page))
  };
  const data = await getRecordsPageData({
    selectedHamsterId: filters.hamsterId,
    recordType: filters.type,
    from: filters.from,
    to: filters.to,
    keyword: filters.keyword,
    favoriteOnly: filters.favoriteOnly,
    page: filters.page
  });
  const selectedHamsterId = data.selectedHamster?.id ?? "";
  const currentFilters = { ...filters, hamsterId: selectedHamsterId, page: data.pagination.currentPage };
  const canEdit = canEditHouseholdSharedData(data.context.membership.role);
  const today = todayInputJst();
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-moss">健康と大切な時間をひとつの年表に</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">記録</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">体調・通院・思い出を種類別に登録し、ハムスターごとの共通タイムラインで振り返れます。</p>
      </header>

      <StatusMessage status={getParam(params.status)} errorId={getParam(params.errorId)} />

      {data.hamsters.length === 0 ? (
        <EmptyState title="ハムスターが登録されていません" href="/hamsters" actionLabel="ハムスターを登録" />
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <form method="get" className="grid gap-4">
              <input type="hidden" name="type" value={filters.type} />
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
                <label className="grid gap-1 text-sm font-medium text-slate-700">対象ハムスター<HamsterSelectorInput mode={data.selectorMode} name="hamsterId" selectedId={selectedHamsterId} options={data.hamsters} /></label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">開始日<input type="date" name="from" defaultValue={filters.from} max={today} /></label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">終了日<input type="date" name="to" defaultValue={filters.to} max={today} /></label>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <label className="grid gap-1 text-sm font-medium text-slate-700">キーワード<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /><input name="keyword" defaultValue={filters.keyword} maxLength={100} className="pl-9" placeholder="症状、診断、薬、タイトル、タグなど" /></div></label>
                <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" name="favorite" value="1" defaultChecked={filters.favoriteOnly} />お気に入りの思い出のみ</label>
                <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90"><Filter className="h-4 w-4" aria-hidden />絞り込む</button>
              </div>
              {invalidRange ? <p className="text-sm text-red-600">開始日は終了日以前の日付を指定してください。</p> : null}
              <div><Link href={recordsHref({ ...currentFilters, from: "", to: "", keyword: "", favoriteOnly: false, page: 1 })} className="text-sm font-semibold text-moss hover:underline">絞り込みをクリア</Link></div>
            </form>
          </section>

          {canEdit && data.selectedHamster ? <RecordCreateForms hamsterId={selectedHamsterId} hamsterIsActive={data.selectedHamster.isActive} today={today} /> : !canEdit ? <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">閲覧者は記録の検索・閲覧のみ利用できます。</p> : null}

          <section className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-xl font-bold text-ink">共通タイムライン</h2><p className="mt-1 text-sm text-slate-500">{data.pagination.totalCount}件の記録</p></div>
              <nav className="flex flex-wrap gap-2" aria-label="記録種類の切り替え">{typeTabs.map((tab) => <Link key={tab.value} href={recordsHref({ ...currentFilters, type: tab.value, page: 1 })} scroll={false} aria-current={filters.type === tab.value ? "page" : undefined} className={`rounded-full border px-3 py-2 text-sm font-semibold ${filters.type === tab.value ? "border-moss bg-moss text-white" : "border-slate-200 bg-white text-slate-700 hover:border-moss hover:text-moss"}`}>{tab.label}</Link>)}</nav>
            </div>
            <RecordTimeline records={data.records} hamsterId={selectedHamsterId} hamsterIsActive={data.selectedHamster?.isActive ?? false} canEdit={canEdit} today={today} />
            {data.pagination.totalPages > 1 ? <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="記録ページ移動"><Link aria-label="最初のページ" href={recordsHref({ ...currentFilters, page: 1 })} scroll={false} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white"><ChevronsLeft className="h-4 w-4" /></Link><Link aria-label="前のページ" href={recordsHref({ ...currentFilters, page: Math.max(data.pagination.currentPage - 1, 1) })} scroll={false} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white"><ChevronLeft className="h-4 w-4" /></Link><span className="px-2 text-sm font-semibold text-slate-700">{data.pagination.currentPage} / {data.pagination.totalPages}</span><Link aria-label="次のページ" href={recordsHref({ ...currentFilters, page: Math.min(data.pagination.currentPage + 1, data.pagination.totalPages) })} scroll={false} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white"><ChevronRight className="h-4 w-4" /></Link><Link aria-label="最後のページ" href={recordsHref({ ...currentFilters, page: data.pagination.totalPages })} scroll={false} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white"><ChevronsRight className="h-4 w-4" /></Link></nav> : null}
          </section>
        </>
      )}
    </main>
  );
}
