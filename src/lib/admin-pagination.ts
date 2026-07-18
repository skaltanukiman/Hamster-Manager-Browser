export const ADMIN_LIST_PAGE_SIZE = 20;

export type AdminPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

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
