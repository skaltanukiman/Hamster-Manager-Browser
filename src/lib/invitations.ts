import { createHash, randomBytes } from "crypto";

export const INVITATION_TTL_DAYS = 7;
export const INVITATION_CREATION_COOLDOWN_MS = 30 * 1000;
export const INVITATION_CREATION_WINDOW_MS = 60 * 60 * 1000;
export const INVITATION_CREATION_WINDOW_LIMIT = 5;
export const INVITATION_CREATION_RATE_SCOPE = "user" as const;
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

export type InvitationCreationLimitCode = "cooldown" | "hourlyLimit";
export type HouseholdInvitationStatus = "active" | "accepted" | "expired" | "revoked";

type InvitationLifecycle = {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

type InvitationCreator = {
  createdBy: { name: string | null; email: string | null } | null;
};

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function evaluateInvitationCreationLimit({
  now,
  latestCreatedAt,
  createdWithinWindow,
  oldestCreatedWithinWindowAt
}: {
  now: Date;
  latestCreatedAt: Date | null;
  createdWithinWindow: number;
  oldestCreatedWithinWindowAt: Date | null;
}): { code: InvitationCreationLimitCode; retryAt: Date } | null {
  if (
    latestCreatedAt &&
    now.getTime() - latestCreatedAt.getTime() < INVITATION_CREATION_COOLDOWN_MS
  ) {
    return {
      code: "cooldown",
      retryAt: new Date(latestCreatedAt.getTime() + INVITATION_CREATION_COOLDOWN_MS)
    };
  }

  if (createdWithinWindow >= INVITATION_CREATION_WINDOW_LIMIT) {
    return {
      code: "hourlyLimit",
      retryAt: new Date(
        (oldestCreatedWithinWindowAt?.getTime() ?? now.getTime()) + INVITATION_CREATION_WINDOW_MS
      )
    };
  }

  return null;
}

export function getHouseholdInvitationStatus(
  invitation: InvitationLifecycle,
  now = new Date()
): HouseholdInvitationStatus {
  if (invitation.revokedAt) return "revoked";
  if (invitation.acceptedAt) return "accepted";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

export function getInvitationCreatorDisplayName(invitation: InvitationCreator) {
  return invitation.createdBy?.name || invitation.createdBy?.email || "不明（既存データ）";
}

export function invitationAcceptanceFailure(
  invitation: InvitationLifecycle,
  now = new Date()
): Exclude<HouseholdInvitationStatus, "active"> | null {
  const status = getHouseholdInvitationStatus(invitation, now);
  return status === "active" ? null : status;
}

export function isValidInvitationToken(token: string) {
  return INVITATION_TOKEN_PATTERN.test(token);
}

export function buildInvitationUrl(origin: string, token: string) {
  const url = new URL("/invitations/accept", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

export function getInvitationTokenFromHash(hash: string) {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && isValidInvitationToken(token) ? token : null;
}
