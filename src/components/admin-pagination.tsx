import { PaginationLayout } from "@/components/pagination";
import { buildAdminListHref, type AdminPagination as AdminPaginationData } from "@/lib/admin-pagination";

export function AdminPagination({
  pathname,
  pagination,
  visibleCount
}: {
  pathname: "/admin/users" | "/admin/households";
  pagination: AdminPaginationData;
  visibleCount: number;
}) {
  return (
    <PaginationLayout
      ariaLabel="管理一覧のページ移動"
      pagination={pagination}
      visibleCount={visibleCount}
      buildHref={(page) => buildAdminListHref(pathname, page)}
    />
  );
}
