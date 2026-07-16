import type { Prisma } from "@prisma/client";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { normalizeHamsterSelectorMode } from "@/lib/dashboard-settings";
import { parseDateInput, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  buildRecordKeywordWhere,
  collectRecordTagSuggestions,
  filterToRecordType,
  RECORD_PAGE_SIZE,
  type RecordTypeFilter
} from "@/lib/records";

export type RecordPageFilters = {
  selectedHamsterId?: string;
  recordType: RecordTypeFilter;
  from: string;
  to: string;
  keyword: string;
  favoriteOnly: boolean;
  page: number;
};

export async function getRecordsPageData(filters: RecordPageFilters) {
  const context = await getRequiredHouseholdContext();
  const [hamsters, setting] = await Promise.all([
    prisma.hamster.findMany({
      where: { householdId: context.household.id },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, isActive: true }
    }),
    prisma.appSetting.findUnique({
      where: { userId_householdId: { userId: context.user.id, householdId: context.household.id } },
      select: { hamsterSelectorMode: true }
    })
  ]);
  const selectedHamster =
    hamsters.find((hamster) => hamster.id === filters.selectedHamsterId) ?? hamsters.find((hamster) => hamster.isActive) ?? hamsters[0] ?? null;

  if (!selectedHamster) {
    return {
      context,
      hamsters,
      selectedHamster: null,
      selectorMode: normalizeHamsterSelectorMode(setting?.hamsterSelectorMode),
      tagSuggestions: [],
      records: [],
      pagination: { currentPage: 1, totalPages: 1, totalCount: 0, pageSize: RECORD_PAGE_SIZE }
    };
  }

  const recordType = filterToRecordType(filters.recordType);
  const keywordWhere = buildRecordKeywordWhere(filters.keyword);
  const where: Prisma.HamsterRecordWhereInput = {
    hamsterId: selectedHamster.id,
    ...(recordType ? { recordType } : {}),
    ...(filters.from || filters.to
      ? {
          recordDate: {
            ...(filters.from ? { gte: parseDateInput(filters.from) } : {}),
            ...(filters.to ? { lte: parseDateInput(filters.to) } : {})
          }
        }
      : {}),
    ...(keywordWhere ?? {}),
    ...(filters.favoriteOnly ? { recordType: "MEMORY", memoryDetail: { is: { isFavorite: true } } } : {})
  };

  const [totalCount, tagRows] = await Promise.all([
    prisma.hamsterRecord.count({ where }),
    prisma.memoryRecordDetail.findMany({
      where: {
        hamsterRecord: {
          hamsterId: selectedHamster.id,
          hamster: { householdId: context.household.id }
        }
      },
      select: { tags: true }
    })
  ]);
  const totalPages = Math.max(Math.ceil(totalCount / RECORD_PAGE_SIZE), 1);
  const currentPage = Math.min(Math.max(filters.page, 1), totalPages);
  const rows = await prisma.hamsterRecord.findMany({
    where,
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * RECORD_PAGE_SIZE,
    take: RECORD_PAGE_SIZE,
    include: {
      createdBy: { select: { name: true, email: true } },
      healthDetail: true,
      medicalDetail: true,
      memoryDetail: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }
    }
  });

  return {
    context,
    hamsters,
    selectedHamster,
    selectorMode: normalizeHamsterSelectorMode(setting?.hamsterSelectorMode),
    tagSuggestions: collectRecordTagSuggestions(tagRows),
    records: rows.map((record) => ({
      id: record.id,
      recordType: record.recordType,
      recordDate: toDateInputValue(record.recordDate),
      title: record.title,
      memo: record.memo,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      createdByLabel: record.createdBy?.name || record.createdBy?.email || "退会済みユーザー",
      healthDetail: record.healthDetail,
      medicalDetail: record.medicalDetail
        ? {
            ...record.medicalDetail,
            nextVisitDate: record.medicalDetail.nextVisitDate
              ? toDateInputValue(record.medicalDetail.nextVisitDate)
              : null,
            consultationFee: record.medicalDetail.consultationFee?.toString() ?? null
          }
        : null,
      memoryDetail: record.memoryDetail
        ? {
            tags: record.memoryDetail.tags,
            isFavorite: record.memoryDetail.isFavorite,
            imageFileName: record.memoryDetail.images[0]?.fileName ?? null
          }
        : null
    })),
    pagination: { currentPage, totalPages, totalCount, pageSize: RECORD_PAGE_SIZE }
  };
}
