"use server";

import { redirect } from "next/navigation";

import { HOUSEHOLD_AUDIT_EVENTS, writeHouseholdAuditLog } from "@/lib/audit-log";
import {
  canManageHouseholdInvitations,
  canManageHouseholdMemberRoles,
  canRemoveHouseholdMembers,
  memberRemovalDenial,
  memberRoleUpdateDenial
} from "@/lib/authorization";
import {
  getRequiredHouseholdContext,
  getRequiredSessionUser,
  setCurrentHouseholdCookie
} from "@/lib/auth-context";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationAcceptanceFailure,
  invitationExpiresAt,
  isValidInvitationToken
} from "@/lib/invitations";
import {
  createRateLimitedHouseholdInvitation,
  revokeHouseholdInvitationMutation
} from "@/lib/invitation-mutations";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";
import {
  commitHouseholdMutation,
  getRealtimeActorId,
  publishHouseholdChangeSafely,
  updateHouseholdRevision
} from "@/lib/realtime";
import { revalidatePathsSafely } from "@/lib/safe-side-effects";
import { handleServerActionError, logUnexpectedError } from "@/lib/server-errors";

type InvitationUnavailableStatus = "accepted" | "expired" | "revoked" | "invalid";

class InvitationUnavailableError extends Error {
  constructor(readonly status: InvitationUnavailableStatus) {
    super(`Invitation is unavailable: ${status}`);
  }
}

export type CreateHouseholdInvitationState = {
  inviteToken: string | null;
  errorCode: "cooldown" | "hourlyLimit" | null;
  errorMessage: string | null;
  retryAfterSeconds: number | null;
};

function redirectInvitationFailure(status: InvitationUnavailableStatus): never {
  if (status === "accepted") redirect("/invitations/accept?status=invitationUsed");
  if (status === "expired") redirect("/invitations/accept?status=invitationExpired");
  if (status === "revoked") redirect("/invitations/accept?status=invitationRevokedAccess");
  redirect("/invitations/accept?status=invalid");
}

function parseManageableMemberRole(value: FormDataEntryValue | null) {
  return value === "ADMIN" || value === "MEMBER" || value === "VIEWER" ? value : null;
}

export async function createHouseholdInvitation(
  _previousState: CreateHouseholdInvitationState,
  formData: FormData
): Promise<CreateHouseholdInvitationState> {
  try {
    const context = await getRequiredHouseholdContext();
    if (!canManageHouseholdInvitations(context.membership.role)) {
      redirect("/settings/members?status=forbidden");
    }

    const now = new Date();
    const token = createInvitationToken();
    const result = await createRateLimitedHouseholdInvitation({
      householdId: context.household.id,
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      tokenHash: hashInvitationToken(token),
      now,
      expiresAt: invitationExpiresAt(now)
    });
    if (result.status === "forbidden") redirect("/settings/members?status=forbidden");
    if (result.status === "limited") {
      return {
        inviteToken: null,
        errorCode: result.code,
        errorMessage:
          result.code === "cooldown"
            ? "招待リンクを作成したばかりです。しばらくしてから再度お試しください。"
            : "短時間に作成できる招待リンクの上限に達しました。時間を空けて再度お試しください。",
        retryAfterSeconds: Math.max(1, Math.ceil((result.retryAt.getTime() - now.getTime()) / 1000))
      };
    }
    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.invitationCreated, {
      actorUserId: context.user.id,
      actorHouseholdRole: context.membership.role,
      householdId: context.household.id,
      invitationId: result.invitation.id,
      expiresAt: result.invitation.expiresAt.toISOString()
    });
    publishHouseholdChangeSafely(result.change);
    revalidatePathsSafely([{ path: "/settings/members" }], "members.createInvitation.revalidate", {
      householdId: context.household.id
    });
    return { inviteToken: token, errorCode: null, errorMessage: null, retryAfterSeconds: null };
  } catch (error) {
    handleServerActionError(error, { operation: "members.createInvitation", pathname: "/settings/members" });
  }
}

export async function revokeHouseholdInvitation(formData: FormData) {
  try {
    const invitationId = formData.get("invitationId");
    if (typeof invitationId !== "string" || !invitationId) redirect("/settings/members?status=invalid");

    const context = await getRequiredHouseholdContext();
    if (!canManageHouseholdInvitations(context.membership.role)) {
      redirect("/settings/members?status=forbidden");
    }

    const result = await revokeHouseholdInvitationMutation({
      householdId: context.household.id,
      actorUserId: context.user.id,
      actorClientId: getRealtimeActorId(formData),
      invitationId,
      now: new Date()
    });
    if (result.status !== "revoked") {
      if (result.status === "forbidden") redirect("/settings/members?status=forbidden");
      if (result.status === "notFound") redirect("/settings/members?status=invalid");
      if (result.status === "accepted") redirect("/settings/members?status=invitationUsed");
      if (result.status === "expired") redirect("/settings/members?status=invitationExpired");
      redirect("/settings/members?status=invitationAlreadyRevoked");
    }

    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.invitationRevoked, {
      actorUserId: context.user.id,
      actorHouseholdRole: context.membership.role,
      householdId: context.household.id,
      invitationId: result.invitationId
    });
    publishHouseholdChangeSafely(result.change);
    revalidatePathsSafely([{ path: "/settings/members" }], "members.revokeInvitation.revalidate", {
      householdId: context.household.id
    });
    redirect("/settings/members?status=invitationRevoked");
  } catch (error) {
    handleServerActionError(error, { operation: "members.revokeInvitation", pathname: "/settings/members" });
  }
}

export async function acceptHouseholdInvitation(formData: FormData) {
  try {
    const token = formData.get("token");
    if (typeof token !== "string" || !isValidInvitationToken(token)) redirect("/invitations/accept?status=invalid");

    const user = await getRequiredSessionUser();
    const now = new Date();
    const invitation = await prisma.householdInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      select: { id: true, householdId: true, expiresAt: true, acceptedAt: true, revokedAt: true }
    });
    if (!invitation) redirect("/invitations/accept?status=invalid");
    const initialFailure = invitationAcceptanceFailure(invitation, now);
    if (initialFailure) redirectInvitationFailure(initialFailure);

    const change = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.householdInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        data: { acceptedAt: now }
      });

      if (updateResult.count !== 1) {
        const current = await tx.householdInvitation.findUnique({
          where: { id: invitation.id },
          select: { acceptedAt: true, revokedAt: true, expiresAt: true }
        });
        throw new InvitationUnavailableError(
          current ? (invitationAcceptanceFailure(current, now) ?? "invalid") : "invalid"
        );
      }

      // 招待URLは共有され得るため、参加先HouseholdへのmembershipをDB側で一意に確定する。
      await tx.householdMember.upsert({
        where: {
          householdId_userId: {
            householdId: invitation.householdId,
            userId: user.id
          }
        },
        update: {},
        create: {
          householdId: invitation.householdId,
          userId: user.id,
          role: "MEMBER"
        }
      });

      await tx.appSetting.upsert({
        where: {
          userId_householdId: {
            userId: user.id,
            householdId: invitation.householdId
          }
        },
        update: {},
        create: {
          userId: user.id,
          householdId: invitation.householdId,
          dashboardBoardCount: DEFAULT_DASHBOARD_BOARD_COUNT,
          hamsterSelectorMode: DEFAULT_HAMSTER_SELECTOR_MODE
        }
      });
      return updateHouseholdRevision(
        tx,
        invitation.householdId,
        "member",
        getRealtimeActorId(formData),
        user.id
      );
    });

    publishHouseholdChangeSafely(change);
    try {
      await setCurrentHouseholdCookie(invitation.householdId);
    } catch (cookieError) {
      logUnexpectedError(cookieError, {
        operation: "members.acceptInvitation.setCookie",
        context: { householdId: invitation.householdId, userId: user.id }
      });
    }
    revalidatePathsSafely([{ path: "/" }, { path: "/settings/members" }], "members.acceptInvitation.revalidate", {
      householdId: invitation.householdId,
      userId: user.id
    });
    redirect("/settings/members?status=joined");
  } catch (error) {
    if (error instanceof InvitationUnavailableError) redirectInvitationFailure(error.status);
    handleServerActionError(error, { operation: "members.acceptInvitation", pathname: "/invitations/accept" });
  }
}

export async function removeHouseholdMember(formData: FormData) {
  try {
    const memberId = formData.get("memberId");
    if (typeof memberId !== "string" || !memberId) redirect("/settings/members?status=invalid");
    const context = await getRequiredHouseholdContext();
    if (!canRemoveHouseholdMembers(context.membership.role)) {
      redirect("/settings/members?status=forbidden");
    }

    const { change, result: removedMember } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "member",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${context.household.id}, 0))`;
        const targetMember = await tx.householdMember.findFirst({
          where: { id: memberId, householdId: context.household.id },
          select: { id: true, userId: true, role: true }
        });
        if (!targetMember) redirect("/settings/members?status=invalid");
        let ownerCount = Number.MAX_SAFE_INTEGER;
        if (targetMember.role === "OWNER") {
          ownerCount = await tx.householdMember.count({
            where: { householdId: context.household.id, role: "OWNER" }
          });
        }
        const denial = memberRemovalDenial({
          actorRole: context.membership.role,
          actorUserId: context.user.id,
          targetUserId: targetMember.userId,
          targetRole: targetMember.role,
          ownerCount
        });
        if (denial) redirect(`/settings/members?status=${denial}`);
        const deleted = await tx.householdMember.deleteMany({
          where: { id: targetMember.id, householdId: context.household.id }
        });
        if (deleted.count !== 1) redirect("/settings/members?status=invalid");
        return targetMember;
      }
    });

    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.memberRemoved, {
      actorUserId: context.user.id,
      actorHouseholdRole: context.membership.role,
      householdId: context.household.id,
      targetMemberId: removedMember.id,
      targetUserId: removedMember.userId,
      removedRole: removedMember.role
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely(
      [{ path: "/", type: "layout" }, { path: "/settings/members" }],
      "members.remove.revalidate",
      { householdId: context.household.id, memberId }
    );
    redirect("/settings/members?status=memberRemoved");
  } catch (error) {
    handleServerActionError(error, { operation: "members.remove", pathname: "/settings/members" });
  }
}

export async function updateHouseholdMemberRole(formData: FormData) {
  try {
    const memberId = formData.get("memberId");
    const role = parseManageableMemberRole(formData.get("role"));
    if (typeof memberId !== "string" || !memberId || !role) redirect("/settings/members?status=invalid");
    const context = await getRequiredHouseholdContext();
    if (!canManageHouseholdMemberRoles(context.membership.role)) {
      redirect("/settings/members?status=forbidden");
    }

    const { change, result: updatedMember } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "member",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
        const targetMember = await tx.householdMember.findFirst({
          where: { id: memberId, householdId: context.household.id },
          select: { id: true, userId: true, role: true }
        });
        if (!targetMember) redirect("/settings/members?status=invalid");
        const denial = memberRoleUpdateDenial({
          actorRole: context.membership.role,
          actorUserId: context.user.id,
          targetUserId: targetMember.userId,
          currentRole: targetMember.role,
          newRole: role
        });
        if (denial) redirect(`/settings/members?status=${denial}`);
        const updated = await tx.householdMember.updateMany({
          where: { id: targetMember.id, householdId: context.household.id, role: targetMember.role },
          data: { role }
        });
        if (updated.count !== 1) redirect("/settings/members?status=invalid");
        return { ...targetMember, newRole: role };
      }
    });

    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.memberRoleUpdated, {
      actorUserId: context.user.id,
      actorHouseholdRole: context.membership.role,
      householdId: context.household.id,
      targetMemberId: updatedMember.id,
      targetUserId: updatedMember.userId,
      previousRole: updatedMember.role,
      newRole: updatedMember.newRole
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely(
      [{ path: "/", type: "layout" }, { path: "/settings/members" }],
      "members.updateRole.revalidate",
      { householdId: context.household.id, memberId }
    );
    redirect("/settings/members?status=roleUpdated");
  } catch (error) {
    handleServerActionError(error, { operation: "members.updateRole", pathname: "/settings/members" });
  }
}
