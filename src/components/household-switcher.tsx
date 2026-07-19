"use client";

import { usePathname } from "next/navigation";

import type { HouseholdOption } from "@/lib/auth-context";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { getDuplicateHouseholdNames, getHouseholdSwitcherOptionLabel } from "@/lib/household-switcher";

type HouseholdSwitcherProps = {
  currentHouseholdId: string;
  households: HouseholdOption[];
  action: (formData: FormData) => void | Promise<void>;
};

export function HouseholdSwitcher({ currentHouseholdId, households, action }: HouseholdSwitcherProps) {
  const pathname = usePathname();
  const duplicateNames = getDuplicateHouseholdNames(households);

  if (households.length <= 1) {
    return null;
  }

  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-2">
      <input type="hidden" name="redirectTo" value={pathname} />
      <label htmlFor="household-switcher" className="text-xs font-semibold text-slate-500">
        操作対象
      </label>
      <AutoSubmitSelect
        id="household-switcher"
        name="householdId"
        value={currentHouseholdId}
        aria-label="操作対象の共有を切り替える"
        className="h-9 w-auto max-w-[min(100%,18rem)] bg-white py-1.5 pl-3 pr-8 text-sm"
      >
        {households.map((household) => (
          <option key={household.id} value={household.id}>
            {getHouseholdSwitcherOptionLabel(household, duplicateNames.has(household.name))}
          </option>
        ))}
      </AutoSubmitSelect>
    </form>
  );
}
