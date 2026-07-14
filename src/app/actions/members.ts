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
  invitationExpiresAt,
  isValidInvitationToken
} from "@/lib/invitations";
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

class InvitationUnavailableError extends Error {}

export type CreateHouseholdInvitationState = {
  inviteToken: string | null;
};

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

    const token = createInvitationToken();
    const { change, result: invitation } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "member",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: (tx) =>
        tx.householdInvitation.create({
          data: {
            householdId: context.household.id,
            tokenHash: hashInvitationToken(token),
            expiresAt: invitationExpiresAt()
          }
        })
    });
    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.invitationCreated, {
      actorUserId: context.user.id,
      actorHouseholdRole: context.membership.role,
      householdId: context.household.id,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt.toISOString()
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely([{ path: "/settings/members" }], "members.createInvitation.revalidate", {
      householdId: context.household.id
    });
    return { inviteToken: token };
  } catch (error) {
    handleServerActionError(error, { operation: "members.createInvitation", pathname: "/settings/members" });
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
      select: { id: true, householdId: true, expiresAt: true, acceptedAt: true }
    });
    if (!invitation) redirect("/invitations/accept?status=invalid");
    if (invitation.acceptedAt) redirect("/invitations/accept?status=invitationUsed");
    if (invitation.expiresAt.getTime() <= now.getTime()) redirect("/invitations/accept?status=invitationExpired");

    const change = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.householdInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: now }
        },
        data: { acceptedAt: now }
      });

      if (updateResult.count !== 1) {
        throw new InvitationUnavailableError("Invitation is no longer usable.");
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
    if (error instanceof InvitationUnavailableError) redirect("/invitations/accept?status=invitationUsed");
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
