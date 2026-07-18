import type { AppRole, Prisma } from "@prisma/client";

import { ADMIN_LIST_PAGE_SIZE, createAdminPagination } from "@/lib/admin-pagination";
import { prisma } from "@/lib/prisma";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  USER: "一般ユーザー",
  ADMIN: "管理者",
  SUPER_ADMIN: "スーパー管理者"
};

export const ADMIN_ROLE_RETURN_PATHS = ["/admin", "/admin/users"] as const;
export type AdminRoleReturnPath = (typeof ADMIN_ROLE_RETURN_PATHS)[number];

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  appRole: true,
  createdAt: true,
  _count: {
    select: {
      memberships: true,
      sessions: true
    }
  }
} satisfies Prisma.UserSelect;

export type AdminUserListItem = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

type AdminUserReader = {
  count: () => Promise<number>;
  findMany: (args: {
    orderBy: Prisma.UserOrderByWithRelationInput[];
    skip: number;
    take: number;
    select: typeof adminUserSelect;
  }) => Promise<AdminUserListItem[]>;
};

const adminUserReader: AdminUserReader = {
  count: () => prisma.user.count(),
  findMany: (args) => prisma.user.findMany(args)
};

export function normalizeAdminRoleReturnPath(value: FormDataEntryValue | null): AdminRoleReturnPath {
  return typeof value === "string" && ADMIN_ROLE_RETURN_PATHS.includes(value as AdminRoleReturnPath)
    ? (value as AdminRoleReturnPath)
    : "/admin/users";
}

export function buildAdminRoleStatusHref(pathname: AdminRoleReturnPath, status: string) {
  return `${pathname}?status=${encodeURIComponent(status)}`;
}

export async function getAdminUserPage(requestedPage: number, reader: AdminUserReader = adminUserReader) {
  const totalCount = await reader.count();
  const pagination = createAdminPagination(requestedPage, totalCount);
  const users = await reader.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagination.currentPage - 1) * ADMIN_LIST_PAGE_SIZE,
    take: ADMIN_LIST_PAGE_SIZE,
    select: adminUserSelect
  });

  return { users, pagination };
}

export function getAdminUserPreview() {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
    select: adminUserSelect
  });
}
