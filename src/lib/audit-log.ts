import type { Logger } from "winston";

import { writeServerLog } from "@/lib/logger";

export const HOUSEHOLD_AUDIT_EVENTS = {
  householdDeleted: "household_deleted",
  invitationCreated: "household_invitation_created",
  invitationRevoked: "household_invitation_revoked",
  householdNameUpdated: "household_name_updated",
  memberLeft: "household_member_left",
  memberRemoved: "household_member_removed",
  memberRoleUpdated: "household_member_role_updated",
  ownershipTransferredAndMemberLeft: "household_ownership_transferred_and_member_left"
} as const;

export const ACCOUNT_AUDIT_EVENTS = {
  accountDeleted: "account_deleted"
} as const;

export type HouseholdAuditEvent = (typeof HOUSEHOLD_AUDIT_EVENTS)[keyof typeof HOUSEHOLD_AUDIT_EVENTS];
export type AccountAuditEvent = (typeof ACCOUNT_AUDIT_EVENTS)[keyof typeof ACCOUNT_AUDIT_EVENTS];

export function writeHouseholdAuditLog(
  event: HouseholdAuditEvent,
  context: Record<string, string>,
  logger?: Logger
) {
  writeServerLog(
    "info",
    {
      event,
      message: "Household管理操作が完了しました。",
      operation: `audit.${event}`,
      context
    },
    logger
  );
}

export function writeAccountAuditLog(
  event: AccountAuditEvent,
  context: Record<string, string>,
  logger?: Logger
) {
  writeServerLog(
    "info",
    {
      event,
      message: "アカウント削除が完了しました。",
      operation: `audit.${event}`,
      context
    },
    logger
  );
}
