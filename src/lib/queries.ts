import type { Prisma } from "@prisma/client";

import { monthDateRange, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";

const cleaningDoneWhere: Prisma.CleaningRecordWhereInput = {
  OR: [
    { toiletCleaned: true },
    { bathCleaned: true },
    { flooringPartCleaned: true },
    { flooringAllCleaned: true },
    { houseCleaned: true }
  ]
};

export async function getDashboardData() {
  return prisma.hamster.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      weightRecords: {
        orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
        take: 1
      },
      cleaningRecords: {
        where: cleaningDoneWhere,
        orderBy: [{ recordDate: "desc" }, { updatedAt: "desc" }],
        take: 1
      }
    }
  });
}

export async function getHamsterManagementData() {
  return prisma.hamster.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          cleaningRecords: true,
          weightRecords: true
        }
      }
    }
  });
}

export async function getHamsterOptions() {
  return prisma.hamster.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function getCleaningPageData(selectedHamsterId: string | undefined, yearMonth: string) {
  const hamsters = await getHamsterOptions();
  const selectedHamster = hamsters.find((hamster) => hamster.id === selectedHamsterId) ?? hamsters[0] ?? null;

  if (!selectedHamster) {
    return { hamsters, selectedHamster, recordsByDate: new Map() };
  }

  const { start, end } = monthDateRange(yearMonth);
  const records = await prisma.cleaningRecord.findMany({
    where: {
      hamsterId: selectedHamster.id,
      recordDate: {
        gte: start,
        lt: end
      }
    },
    orderBy: { recordDate: "asc" }
  });

  return {
    hamsters,
    selectedHamster,
    recordsByDate: new Map(records.map((record) => [toDateInputValue(record.recordDate), record]))
  };
}

export async function getWeightPageData(selectedHamsterId: string | undefined) {
  const hamsters = await getHamsterOptions();
  const selectedHamster = hamsters.find((hamster) => hamster.id === selectedHamsterId) ?? hamsters[0] ?? null;

  if (!selectedHamster) {
    return { hamsters, selectedHamster, records: [], chartRecords: [] };
  }

  const records = await prisma.weightRecord.findMany({
    where: { hamsterId: selectedHamster.id },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }]
  });

  return {
    hamsters,
    selectedHamster,
    records,
    chartRecords: [...records].reverse()
  };
}

