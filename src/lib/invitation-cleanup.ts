import type { Prisma } from "@prisma/client";

export const USED_INVITATION_RETENTION_DAYS = 90;
export const EXPIRED_INVITATION_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

type DeleteInvitations = (args: { where: Prisma.HouseholdInvitationWhereInput }) => Promise<{ count: number }>;

export function invitationCleanupWhere(now = new Date()): Prisma.HouseholdInvitationWhereInput {
  const usedBefore = new Date(now.getTime() - USED_INVITATION_RETENTION_DAYS * DAY_MS);
  const expiredBefore = new Date(now.getTime() - EXPIRED_INVITATION_RETENTION_DAYS * DAY_MS);

  return {
    OR: [
      { acceptedAt: { lt: usedBefore } },
      { acceptedAt: null, expiresAt: { lt: expiredBefore } }
    ]
  };
}

export async function cleanupInvitations(deleteInvitations: DeleteInvitations, now = new Date()) {
  return deleteInvitations({ where: invitationCleanupWhere(now) });
}
