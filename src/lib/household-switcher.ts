import type { HouseholdRole } from "@prisma/client";

import { HOUSEHOLD_ROLE_LABELS } from "@/lib/authorization";

type HouseholdSwitcherOption = {
  name: string;
  role: HouseholdRole;
  memberCount: number;
  hamsterCount: number;
};

export function getDuplicateHouseholdNames(households: ReadonlyArray<{ name: string }>) {
  const counts = new Map<string, number>();
  for (const household of households) {
    counts.set(household.name, (counts.get(household.name) ?? 0) + 1);
  }

  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
}

export function getHouseholdSwitcherOptionLabel(
  household: HouseholdSwitcherOption,
  hasDuplicateName: boolean
) {
  const roleLabel = HOUSEHOLD_ROLE_LABELS[household.role];
  if (!hasDuplicateName) {
    return `${household.name}（${roleLabel}）`;
  }

  return `${household.name}（${roleLabel}・ハムスター${household.hamsterCount}匹・メンバー${household.memberCount}人）`;
}
