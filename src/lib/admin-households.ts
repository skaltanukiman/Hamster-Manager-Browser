import type { Prisma } from "@prisma/client";

import { ADMIN_LIST_PAGE_SIZE, createAdminPagination } from "@/lib/admin-pagination";
import { prisma } from "@/lib/prisma";

const adminHouseholdSelect = {
  id: true,
  name: true,
  createdAt: true,
  members: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
    select: {
      id: true,
      role: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  },
  _count: {
    select: {
      hamsters: true,
      invitations: true,
      members: true
    }
  }
} satisfies Prisma.HouseholdSelect;

export type AdminHouseholdListItem = Prisma.HouseholdGetPayload<{ select: typeof adminHouseholdSelect }>;

type AdminHouseholdReader = {
  count: () => Promise<number>;
  findMany: (args: {
    orderBy: Prisma.HouseholdOrderByWithRelationInput[];
    skip: number;
    take: number;
    select: typeof adminHouseholdSelect;
  }) => Promise<AdminHouseholdListItem[]>;
};

const adminHouseholdReader: AdminHouseholdReader = {
  count: () => prisma.household.count(),
  findMany: (args) => prisma.household.findMany(args)
};

export async function getAdminHouseholdPage(
  requestedPage: number,
  reader: AdminHouseholdReader = adminHouseholdReader
) {
  const totalCount = await reader.count();
  const pagination = createAdminPagination(requestedPage, totalCount);
  const households = await reader.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (pagination.currentPage - 1) * ADMIN_LIST_PAGE_SIZE,
    take: ADMIN_LIST_PAGE_SIZE,
    select: adminHouseholdSelect
  });

  return { households, pagination };
}

export function getAdminHouseholdPreview() {
  return prisma.household.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
    select: adminHouseholdSelect
  });
}
