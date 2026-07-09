"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getRequiredHouseholdContext,
  getRequiredSessionUser,
  hasHouseholdRole,
  setCurrentHouseholdCookie
} from "@/lib/auth-context";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt
} from "@/lib/invitations";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";
import { getRealtimeActorId, notifyHouseholdChange } from "@/lib/realtime";

const INVITATION_MANAGE_ROLES = ["OWNER", "ADMIN"] as const;
const MEMBER_REMOVE_ROLES = ["OWNER"] as const;

export async function createHouseholdInvitation(formData?: FormData) {
  const context = await getRequiredHouseholdContext();

  if (!hasHouseholdRole(context.membership.role, [...INVITATION_MANAGE_ROLES])) {
    redirect("/settings/members?status=forbidden");
  }

  const token = createInvitationToken();

  await prisma.householdInvitation.create({
    data: {
      householdId: context.household.id,
      tokenHash: hashInvitationToken(token),
      expiresAt: invitationExpiresAt()
    }
  });

  revalidatePath("/settings/members");
  await notifyHouseholdChange(context.household.id, "member", getRealtimeActorId(formData));

  const params = new URLSearchParams({
    status: "invitationCreated",
    inviteToken: token
  });
  redirect(`/settings/members?${params.toString()}`);
}

export async function acceptHouseholdInvitation(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string" || token.length < 32) {
    redirect("/invitations/accept?status=invalid");
  }

  const user = await getRequiredSessionUser();
  const now = new Date();
  const invitation = await prisma.householdInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: {
      id: true,
      householdId: true,
      expiresAt: true,
      acceptedAt: true
    }
  });

  if (!invitation) {
    redirect("/invitations/accept?status=invalid");
  }

  if (invitation.acceptedAt) {
    redirect("/invitations/accept?status=invitationUsed");
  }

  if (invitation.expiresAt.getTime() <= now.getTime()) {
    redirect("/invitations/accept?status=invitationExpired");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.householdInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: now }
        },
        data: { acceptedAt: now }
      });

      if (updateResult.count !== 1) {
        throw new Error("Invitation is no longer usable.");
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
    });
  } catch {
    redirect("/invitations/accept?status=invalid");
  }

  await setCurrentHouseholdCookie(invitation.householdId);
  revalidatePath("/");
  revalidatePath("/settings/members");
  await notifyHouseholdChange(invitation.householdId, "member", getRealtimeActorId(formData));
  redirect("/settings/members?status=joined");
}

export async function removeHouseholdMember(formData: FormData) {
  const memberId = formData.get("memberId");

  if (typeof memberId !== "string" || !memberId) {
    redirect("/settings/members?status=invalid");
  }

  const context = await getRequiredHouseholdContext();

  if (!hasHouseholdRole(context.membership.role, [...MEMBER_REMOVE_ROLES])) {
    redirect("/settings/members?status=forbidden");
  }

  const targetMember = await prisma.householdMember.findFirst({
    where: {
      id: memberId,
      householdId: context.household.id
    },
    select: {
      id: true,
      userId: true,
      role: true
    }
  });

  if (!targetMember) {
    redirect("/settings/members?status=invalid");
  }

  if (targetMember.userId === context.user.id) {
    redirect("/settings/members?status=cannotRemoveSelf");
  }

  if (targetMember.role === "OWNER") {
    const ownerCount = await prisma.householdMember.count({
      where: {
        householdId: context.household.id,
        role: "OWNER"
      }
    });

    if (ownerCount <= 1) {
      redirect("/settings/members?status=cannotRemoveLastOwner");
    }
  }

  // FormDataは改ざんできるため、現在のHouseholdに属するmembershipだけを削除対象にする。
  const deleteResult = await prisma.householdMember.deleteMany({
    where: {
      id: targetMember.id,
      householdId: context.household.id
    }
  });

  if (deleteResult.count !== 1) {
    redirect("/settings/members?status=invalid");
  }

  revalidatePath("/settings/members");
  await notifyHouseholdChange(context.household.id, "member", getRealtimeActorId(formData));
  redirect("/settings/members?status=memberRemoved");
}
