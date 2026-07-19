import type { HouseholdRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type HouseholdDeletePreview = {
  householdId: string;
  householdName: string;
  currentRole: HouseholdRole;
  memberCount: number;
  ownerCount: number;
  joinedHouseholdCount: number;
  hamsterCount: number;
  weightRecordCount: number;
  cleaningRecordCount: number;
  healthRecordCount: number;
  medicalVisitCount: number;
  memoryRecordCount: number;
  imageCount: number;
  savedMemoryTagCount: number;
};

export async function getHouseholdDeletePreview(
  householdId: string,
  actorUserId: string
): Promise<HouseholdDeletePreview | null> {
  const [
    household,
    ownerCount,
    joinedHouseholdCount,
    weightRecordCount,
    cleaningRecordCount,
    recordCounts,
    memoryImageCount,
    profileImageCount,
    savedMemoryTagCount
  ] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true, hamsters: true } },
        members: {
          where: { userId: actorUserId },
          select: { role: true },
          take: 1
        }
      }
    }),
    prisma.householdMember.count({ where: { householdId, role: "OWNER" } }),
    prisma.householdMember.count({ where: { userId: actorUserId } }),
    prisma.weightRecord.count({ where: { hamster: { householdId } } }),
    prisma.cleaningRecord.count({ where: { hamster: { householdId } } }),
    prisma.hamsterRecord.groupBy({
      by: ["recordType"],
      where: { hamster: { householdId } },
      _count: { _all: true }
    }),
    prisma.memoryRecordImage.count({
      where: { memoryRecord: { hamsterRecord: { hamster: { householdId } } } }
    }),
    prisma.hamster.count({ where: { householdId, profileImageFileName: { not: null } } }),
    prisma.savedMemoryTag.count({ where: { householdId } })
  ]);

  const currentRole = household?.members[0]?.role;
  if (!household || !currentRole) return null;
  const countByType = new Map(recordCounts.map((row) => [row.recordType, row._count._all]));

  return {
    householdId: household.id,
    householdName: household.name,
    currentRole,
    memberCount: household._count.members,
    ownerCount,
    joinedHouseholdCount,
    hamsterCount: household._count.hamsters,
    weightRecordCount,
    cleaningRecordCount,
    healthRecordCount: countByType.get("HEALTH") ?? 0,
    medicalVisitCount: countByType.get("MEDICAL") ?? 0,
    memoryRecordCount: countByType.get("MEMORY") ?? 0,
    imageCount: memoryImageCount + profileImageCount,
    savedMemoryTagCount
  };
}
