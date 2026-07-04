// アプリ全体で共有する設定は、ユーザー別ではなく固定IDの1レコードとして扱う。
export const APP_SETTING_ID = "default";
export const DEFAULT_DASHBOARD_BOARD_COUNT = 6;
export const MIN_DASHBOARD_BOARD_COUNT = 1;
export const MAX_DASHBOARD_BOARD_COUNT = 30;
export const HAMSTER_SELECTOR_MODES = ["combobox", "select"] as const;
export const DEFAULT_HAMSTER_SELECTOR_MODE: HamsterSelectorMode = "combobox";

export type HamsterSelectorMode = (typeof HAMSTER_SELECTOR_MODES)[number];

export function normalizeDashboardBoardCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DASHBOARD_BOARD_COUNT;
  }

  // DBに範囲外の値が残っていても、画面側では許可範囲内の表示数に丸める。
  return Math.min(MAX_DASHBOARD_BOARD_COUNT, Math.max(MIN_DASHBOARD_BOARD_COUNT, Math.trunc(value)));
}

export function normalizeHamsterSelectorMode(value: string | null | undefined): HamsterSelectorMode {
  return value === "select" ? "select" : DEFAULT_HAMSTER_SELECTOR_MODE;
}
