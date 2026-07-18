import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { buildAdminListHref, type AdminPagination as AdminPaginationData } from "@/lib/admin-pagination";

const navigationItems = [
  { label: "最初へ", icon: ChevronsLeft, page: (pagination: AdminPaginationData) => 1 },
  { label: "前へ", icon: ChevronLeft, page: (pagination: AdminPaginationData) => pagination.currentPage - 1 },
  { label: "次へ", icon: ChevronRight, page: (pagination: AdminPaginationData) => pagination.currentPage + 1 },
  { label: "最後へ", icon: ChevronsRight, page: (pagination: AdminPaginationData) => pagination.totalPages }
] as const;

export function AdminPagination({
  pathname,
  pagination,
  visibleCount
}: {
  pathname: "/admin/users" | "/admin/households";
  pagination: AdminPaginationData;
  visibleCount: number;
}) {
  const firstVisibleNumber =
    pagination.totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const lastVisibleNumber = (pagination.currentPage - 1) * pagination.pageSize + visibleCount;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div>
        <p>
          全{pagination.totalCount}件中 {firstVisibleNumber}～{lastVisibleNumber}件を表示
        </p>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          {pagination.currentPage} / {pagination.totalPages} ページ
        </p>
      </div>
      <nav aria-label="管理一覧のページ移動" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {navigationItems.map((item) => {
          const isPrevious = item.label === "最初へ" || item.label === "前へ";
          const disabled = isPrevious
            ? pagination.currentPage <= 1
            : pagination.currentPage >= pagination.totalPages;
          const Icon = item.icon;
          const className = `inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-semibold ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`;

          return disabled ? (
            <span key={item.label} aria-disabled="true" className={className}>
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </span>
          ) : (
            <Link
              key={item.label}
              href={buildAdminListHref(pathname, item.page(pagination))}
              className={className}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
