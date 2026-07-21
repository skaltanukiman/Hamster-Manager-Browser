import type { HouseholdActivityCategory } from "@prisma/client";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { HOUSEHOLD_ACTIVITY_PAGE_SIZE } from "@/lib/household-activity";
import { prisma } from "@/lib/prisma";

const activitySelect = {
  id: true,
  actorNameSnapshot: true,
  eventType: true,
  category: true,
  targetNameSnapshot: true,
  details: true,
  createdAt: true
} as const;

export async function getCurrentHouseholdActivityPreview(limit = 5) {
  const context = await getRequiredHouseholdContext();
  const activities = await prisma.householdActivity.findMany({
    where: { householdId: context.household.id },
    select: activitySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.min(Math.max(limit, 1), 5)
  });
  return { context, activities };
}

export async function getCurrentHouseholdActivityPage(input: {
  category: HouseholdActivityCategory | null;
  page: number;
}) {
  const context = await getRequiredHouseholdContext();
  const where = {
    householdId: context.household.id,
    ...(input.category ? { category: input.category } : {})
  };
  const totalCount = await prisma.householdActivity.count({ where });
  const totalPages = Math.max(Math.ceil(totalCount / HOUSEHOLD_ACTIVITY_PAGE_SIZE), 1);
  const currentPage = Math.min(Math.max(input.page, 1), totalPages);
  const activities = await prisma.householdActivity.findMany({
    where,
    select: activitySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * HOUSEHOLD_ACTIVITY_PAGE_SIZE,
    take: HOUSEHOLD_ACTIVITY_PAGE_SIZE
  });

  return {
    context,
    activities,
    pagination: { currentPage, totalPages, totalCount, pageSize: HOUSEHOLD_ACTIVITY_PAGE_SIZE }
  };
}
