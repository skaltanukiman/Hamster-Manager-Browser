import { PaginationLayout } from "@/components/pagination";
import { buildAdminInvitationHref, type AdminInvitationQuery } from "@/lib/admin-invitations";

export function AdminInvitationPagination({
  query,
  pagination,
  visibleCount
}: {
  query: AdminInvitationQuery;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };
  visibleCount: number;
}) {
  return (
    <PaginationLayout
      ariaLabel="招待一覧のページ移動"
      pagination={pagination}
      visibleCount={visibleCount}
      buildHref={(page) => buildAdminInvitationHref(query, page)}
      scroll={false}
      emptyMessage="条件に一致する招待はありません。"
    />
  );
}
