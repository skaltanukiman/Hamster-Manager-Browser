// 認証導入前の固定設定ID。既存データ移行スクリプトで旧設定を読み取るために残す。
export const LEGACY_APP_SETTING_ID = "default";
export const DEFAULT_DASHBOARD_BOARD_COUNT = 6;
export const MIN_DASHBOARD_BOARD_COUNT = 1;
export const MAX_DASHBOARD_BOARD_COUNT = 30;
export const HAMSTER_SELECTOR_MODES = ["combobox", "select"] as const;
export const DEFAULT_HAMSTER_SELECTOR_MODE: HamsterSelectorMode = "select";

export type HamsterSelectorMode = (typeof HAMSTER_SELECTOR_MODES)[number];

export function normalizeDashboardBoardCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DASHBOARD_BOARD_COUNT;
  }

  // DBに範囲外の値が残っていても、画面側では許可範囲内の表示数に丸める。
  return Math.min(MAX_DASHBOARD_BOARD_COUNT, Math.max(MIN_DASHBOARD_BOARD_COUNT, Math.trunc(value)));
}

export function normalizeHamsterSelectorMode(value: string | null | undefined): HamsterSelectorMode {
  return value === "combobox" || value === "select" ? value : DEFAULT_HAMSTER_SELECTOR_MODE;
}

// 設定済みの表示対象を優先し、未設定・削除済みIDがある場合は登録順のハムスターで不足分を補う。
export function pickDashboardHamsters<T extends { id: string }>(hamsters: T[], boardCount: number, selectedIds: string[]) {
  const hamsterById = new Map(hamsters.map((hamster) => [hamster.id, hamster]));
  const selectedHamsters = selectedIds
    .map((id) => hamsterById.get(id))
    .filter((hamster): hamster is T => Boolean(hamster));
  const selectedIdSet = new Set(selectedHamsters.map((hamster) => hamster.id));
  const fallbackHamsters = hamsters.filter((hamster) => !selectedIdSet.has(hamster.id));

  return [...selectedHamsters, ...fallbackHamsters].slice(0, boardCount);
}
