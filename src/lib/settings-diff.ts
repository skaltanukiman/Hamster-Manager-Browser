import type { HamsterSelectorMode } from "@/lib/dashboard-settings";
import type { RecordScope } from "@/lib/records";

export type SettingsSnapshot = {
  name: string;
  dashboardBoardCount: number;
  hamsterSelectorMode: HamsterSelectorMode;
  recordTimelineDefaultScope: RecordScope;
  hamsterIds: readonly string[];
};

function hasSameOrder(currentIds: readonly string[], nextIds: readonly string[]) {
  return currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index]);
}

export function getSettingsChanges(current: SettingsSnapshot, next: SettingsSnapshot) {
  return {
    profileChanged: current.name !== next.name,
    recordTimelineDefaultScopeChanged:
      current.recordTimelineDefaultScope !== next.recordTimelineDefaultScope,
    dashboardChanged:
      current.dashboardBoardCount !== next.dashboardBoardCount ||
      current.hamsterSelectorMode !== next.hamsterSelectorMode ||
      !hasSameOrder(current.hamsterIds, next.hamsterIds)
  };
}
