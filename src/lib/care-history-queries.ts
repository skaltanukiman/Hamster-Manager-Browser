import type { Prisma } from "@prisma/client";

import { buildCareHistoryDays, getCareHistoryRange, type CareHistoryPeriod } from "@/lib/care-history";
import { PUBLIC_DEMO_SLUG } from "@/lib/public-demo";

type CareReader = Pick<Prisma.TransactionClient, "hamster" | "feedingRecord" | "waterReplacementRecord">;
type CareScope = { householdId: string; userId: string } | { householdId: string; publicDemo: true };

function scopedHamsterWhere(scope: CareScope): Prisma.HamsterWhereInput {
  return {
    householdId: scope.householdId,
    household: "userId" in scope
      ? { isDemo: false, members: { some: { userId: scope.userId } } }
      : { isDemo: true, demoSlug: PUBLIC_DEMO_SLUG }
  };
}

/** 閲覧者・管理外も許可するが、現在の所属または固定デモ条件を各DB検索に含める。 */
export async function getCareHistory(
  reader: CareReader,
  scope: CareScope,
  hamsterId: string,
  period: CareHistoryPeriod,
  now = new Date()
) {
  const hamsterWhere = { id: hamsterId, ...scopedHamsterWhere(scope) };
  const hamster = await reader.hamster.findFirst({
    where: hamsterWhere,
    select: { household: { select: { careDayStartMinutes: true } } }
  });
  if (!hamster?.household) return null;
  const careDayStartMinutes = hamster.household.careDayStartMinutes;
  const { dates, start, end } = getCareHistoryRange(now, careDayStartMinutes, period);
  const where = { hamsterId, hamster: hamsterWhere, recordDate: { gte: start, lte: end } };
  const [food, water] = await Promise.all([
    reader.feedingRecord.findMany({ where, select: { recordDate: true, fedAt: true }, orderBy: { recordDate: "desc" }, take: period }),
    reader.waterReplacementRecord.findMany({ where, select: { recordDate: true, replacedAt: true }, orderBy: { recordDate: "desc" }, take: period })
  ]);
  return { days: buildCareHistoryDays(dates, food, water), careDayStartMinutes };
}
