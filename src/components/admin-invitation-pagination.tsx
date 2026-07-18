import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { buildAdminInvitationHref, type AdminInvitationQuery } from "@/lib/admin-invitations";

export function AdminInvitationPagination({
  query,
  pagination
}: {
  query: AdminInvitationQuery;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}) {
  if (pagination.totalCount === 0) return null;

  return (
    <nav
      className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-end"
      aria-label="招待一覧のページ移動"
    >
      {pagination.currentPage > 1 ? (
        <Link
          href={buildAdminInvitationHref(query, 1)}
          scroll={false}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
          最初へ
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
          最初へ
        </button>
      )}
      {pagination.currentPage > 1 ? (
        <Link
          href={buildAdminInvitationHref(query, pagination.currentPage - 1)}
          scroll={false}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          前へ
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          前へ
        </button>
      )}
      <span className="order-first col-span-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 sm:order-none sm:col-span-1 sm:w-auto">
        {pagination.currentPage} / {pagination.totalPages} ページ
      </span>
      {pagination.currentPage < pagination.totalPages ? (
        <Link
          href={buildAdminInvitationHref(query, pagination.currentPage + 1)}
          scroll={false}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          次へ
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
        >
          次へ
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      )}
      {pagination.currentPage < pagination.totalPages ? (
        <Link
          href={buildAdminInvitationHref(query, pagination.totalPages)}
          scroll={false}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          最後へ
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed sm:w-auto"
        >
          最後へ
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </nav>
  );
}
