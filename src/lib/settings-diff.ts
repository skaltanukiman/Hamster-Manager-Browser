import type { HamsterSelectorMode } from "@/lib/dashboard-settings";

export type SettingsSnapshot = {
  name: string;
  dashboardBoardCount: number;
  hamsterSelectorMode: HamsterSelectorMode;
  hamsterIds: readonly string[];
};

function hasSameOrder(currentIds: readonly string[], nextIds: readonly string[]) {
  return currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index]);
}

export function getSettingsChanges(current: SettingsSnapshot, next: SettingsSnapshot) {
  return {
    profileChanged: current.name !== next.name,
    dashboardChanged:
      current.dashboardBoardCount !== next.dashboardBoardCount ||
      current.hamsterSelectorMode !== next.hamsterSelectorMode ||
      !hasSameOrder(current.hamsterIds, next.hamsterIds)
  };
}
