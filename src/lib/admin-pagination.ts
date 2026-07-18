export const ADMIN_LIST_PAGE_SIZE = 20;

export type AdminPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

export type AdminPaginationItem = number | "ellipsis";

export function getAdminPaginationItems(
  currentPage: number,
  totalPages: number
): AdminPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

export function normalizeAdminPage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d+$/.test(rawValue)) return 1;

  const page = Number(rawValue);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function createAdminPagination(requestedPage: number, totalCount: number): AdminPagination {
  const totalPages = Math.max(Math.ceil(totalCount / ADMIN_LIST_PAGE_SIZE), 1);

  return {
    currentPage: Math.min(Math.max(requestedPage, 1), totalPages),
    totalPages,
    totalCount,
    pageSize: ADMIN_LIST_PAGE_SIZE
  };
}

export function buildAdminListHref(pathname: "/admin/users" | "/admin/households", page: number) {
  return `${pathname}?page=${page}`;
}
