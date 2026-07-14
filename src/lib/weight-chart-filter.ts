import { isValidDateInput } from "@/lib/date";

export type WeightChartRange = {
  from?: string;
  to?: string;
};

export function normalizeWeightChartRange(from: string | undefined, to: string | undefined): WeightChartRange {
  return {
    from: from && isValidDateInput(from) ? from : undefined,
    to: to && isValidDateInput(to) ? to : undefined
  };
}

export function getAppliedWeightChartRange(
  filterMode: "all" | "month",
  from: string | undefined,
  to: string | undefined
): WeightChartRange {
  return filterMode === "all" ? normalizeWeightChartRange(from, to) : {};
}

export function isCompleteWeightChartRange(from: string, to: string) {
  const normalized = normalizeWeightChartRange(from, to);
  return Boolean(normalized.from && normalized.to && normalized.from <= normalized.to);
}
