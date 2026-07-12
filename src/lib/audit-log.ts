import type { Logger } from "winston";

import { writeServerLog } from "@/lib/logger";

export const HOUSEHOLD_AUDIT_EVENTS = {
  invitationCreated: "household_invitation_created",
  memberRemoved: "household_member_removed",
  memberRoleUpdated: "household_member_role_updated"
} as const;

export type HouseholdAuditEvent = (typeof HOUSEHOLD_AUDIT_EVENTS)[keyof typeof HOUSEHOLD_AUDIT_EVENTS];

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
