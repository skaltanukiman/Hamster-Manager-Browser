import { getCareDayRecordDate } from "@/lib/care-day";
import { formatDateJst, parseDateInput, toDateInputValue } from "@/lib/date";

export const CARE_HISTORY_PERIODS = [7, 14, 30] as const;
export type CareHistoryPeriod = (typeof CARE_HISTORY_PERIODS)[number];
export type CareHistoryDay = { recordDate: string; fedAt: string | null; replacedAt: string | null };
export type CareHistoryData = { days: CareHistoryDay[]; careDayStartMinutes: number };

export function isCareHistoryPeriod(value: unknown): value is CareHistoryPeriod {
  return CARE_HISTORY_PERIODS.some((period) => period === value);
}

/** 日付専用のrecordDateで期間を作る。timestampのJST暦日とは混同しない。 */
export function getCareHistoryRange(now: Date, careDayStartMinutes: number, period: CareHistoryPeriod) {
  const today = getCareDayRecordDate(now, careDayStartMinutes);
  const dates = Array.from({ length: period }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - index);
    return toDateInputValue(date);
  });
  return { dates, start: parseDateInput(dates[dates.length - 1]), end: today };
}

/** 保存済みのお世話日を維持し、記録のない日も両項目nullとして埋める。 */
export function buildCareHistoryDays(
  dates: string[],
  feedings: { recordDate: Date; fedAt: Date }[],
  replacements: { recordDate: Date; replacedAt: Date }[]
): CareHistoryDay[] {
  const food = new Map(feedings.map((row) => [toDateInputValue(row.recordDate), row.fedAt.toISOString()]));
  const water = new Map(replacements.map((row) => [toDateInputValue(row.recordDate), row.replacedAt.toISOString()]));
  return dates.map((recordDate) => ({ recordDate, fedAt: food.get(recordDate) ?? null, replacedAt: water.get(recordDate) ?? null }));
}

export function formatCareDate(recordDate: string, referenceDate: string) {
  const [year, month, day] = recordDate.split("-");
  const short = `${Number(month)}/${Number(day)}`;
  return year === referenceDate.slice(0, 4) ? short : `${year}/${short}`;
}

/** 境界前のお世話では、実施の暦日が行のお世話日と異なることを明示する。 */
export function careTimeDateNote(timestamp: string, recordDate: string) {
  const calendar = formatDateJst(new Date(timestamp)).replaceAll("/", "-");
  if (calendar === recordDate) return null;
  const next = parseDateInput(recordDate);
  next.setUTCDate(next.getUTCDate() + 1);
  return calendar === toDateInputValue(next) ? "翌日" : formatCareDate(calendar, recordDate);
}
