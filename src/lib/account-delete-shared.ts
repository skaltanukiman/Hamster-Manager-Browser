export const ACCOUNT_DELETE_CONFIRMATION = "アカウントを削除";

export type AccountDeleteDisposition =
  | "deleteHousehold"
  | "leaveHousehold"
  | "transferOwnership"
  | "blocked";
