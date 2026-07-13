import type { AppRole, HouseholdRole } from "@prisma/client";

export function hasAuthenticatedUserId(user: { id?: string | null } | null | undefined): user is { id: string } {
  return typeof user?.id === "string" && user.id.length > 0;
}

export function belongsToCurrentHousehold(resourceHouseholdId: string | null | undefined, currentHouseholdId: string) {
  return typeof resourceHouseholdId === "string" && resourceHouseholdId === currentHouseholdId;
}

export function canManageHouseholdInvitations(role: HouseholdRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canRemoveHouseholdMembers(role: HouseholdRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageHouseholdMemberRoles(role: HouseholdRole) {
  return role === "OWNER";
}

export function memberRemovalDenial({
  actorRole,
  actorUserId,
  targetUserId,
  targetRole,
  ownerCount
}: {
  actorRole: HouseholdRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: HouseholdRole;
  ownerCount: number;
}) {
  if (actorRole !== "OWNER" && actorRole !== "ADMIN") return "forbidden";
  if (actorUserId === targetUserId) return "cannotRemoveSelf";
  if (actorRole === "ADMIN" && targetRole !== "MEMBER") return "forbidden";
  if (targetRole === "OWNER" && ownerCount <= 1) return "cannotRemoveLastOwner";
  return null;
}

export function memberRoleUpdateDenial({
  actorRole,
  actorUserId,
  targetUserId,
  currentRole,
  newRole
}: {
  actorRole: HouseholdRole;
  actorUserId: string;
  targetUserId: string;
  currentRole: HouseholdRole;
  newRole: "ADMIN" | "MEMBER";
}) {
  if (actorRole !== "OWNER") return "forbidden";
  if (actorUserId === targetUserId) return "cannotChangeOwnHouseholdRole";
  if (currentRole !== "ADMIN" && currentRole !== "MEMBER") return "cannotChangeOwnerRole";
  if (currentRole === newRole) return "unchanged";
  return null;
}

export function appRoleUpdateDenial({
  actorRole,
  actorUserId,
  targetUserId,
  currentRole,
  newRole,
  superAdminCount
}: {
  actorRole: AppRole;
  actorUserId: string;
  targetUserId: string;
  currentRole: AppRole;
  newRole: AppRole;
  superAdminCount: number;
}) {
  if (actorRole !== "SUPER_ADMIN") return "forbidden";
  if (actorUserId === targetUserId && currentRole !== newRole) return "cannotChangeOwnRole";
  if (currentRole === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN" && superAdminCount <= 1) {
    return "cannotRemoveLastSuperAdmin";
  }
  return null;
}
