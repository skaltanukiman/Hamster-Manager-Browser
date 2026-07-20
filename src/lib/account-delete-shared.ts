export const ACCOUNT_DELETE_CONFIRMATION = "アカウントを削除";

export type AccountDeleteDisposition =
  | "deleteHousehold"
  | "leaveHousehold"
  | "transferOwnership"
  | "blocked";

export function requiresAccountDeleteAttention(disposition: AccountDeleteDisposition) {
  return disposition === "transferOwnership" || disposition === "blocked";
}
