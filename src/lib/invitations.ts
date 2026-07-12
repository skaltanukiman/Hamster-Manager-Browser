import { createHash, randomBytes } from "crypto";

export const INVITATION_TTL_DAYS = 7;
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
  return expiresAt;
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
