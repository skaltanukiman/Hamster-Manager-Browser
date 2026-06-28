export const APP_SETTING_ID = "default";
export const DEFAULT_DASHBOARD_BOARD_COUNT = 6;
export const MIN_DASHBOARD_BOARD_COUNT = 1;
export const MAX_DASHBOARD_BOARD_COUNT = 30;

export function normalizeDashboardBoardCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DASHBOARD_BOARD_COUNT;
  }

  return Math.min(MAX_DASHBOARD_BOARD_COUNT, Math.max(MIN_DASHBOARD_BOARD_COUNT, Math.trunc(value)));
}
