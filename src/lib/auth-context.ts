import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { HouseholdRole } from "@prisma/client";

import { auth } from "@/auth";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";

export const CURRENT_HOUSEHOLD_COOKIE = "hamster_current_household";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type CurrentHouseholdContext = {
  user: SessionUser;
  household: {
    id: string;
    name: string;
  };
  membership: {
    id: string;
    role: HouseholdRole;
    createdAt: Date;
  };
};

function defaultHouseholdName(user: SessionUser) {
  const ownerName = user.name || user.email || "あなた";
  return `${ownerName}のハムスター管理`;
}

async function getPreferredHouseholdId() {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_HOUSEHOLD_COOKIE)?.value;
}

export async function getRequiredSessionUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    redirect("/login");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image
  };
}

async function findMembership(userId: string, preferredHouseholdId?: string) {
  if (preferredHouseholdId) {
    const preferredMembership = await prisma.householdMember.findFirst({
      where: {
        userId,
        householdId: preferredHouseholdId
      },
      include: {
        household: true
      }
    });

    if (preferredMembership) {
      return preferredMembership;
    }
  }

  return prisma.householdMember.findFirst({
    where: { userId },
    include: {
      household: true
    },
    orderBy: { createdAt: "asc" }
  });
}

async function createInitialHousehold(user: SessionUser) {
  return prisma.$transaction(async (tx) => {
    const existingMembership = await tx.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: true },
      orderBy: { createdAt: "asc" }
    });

    if (existingMembership) {
      return existingMembership;
    }

    const household = await tx.household.create({
      data: {
        name: defaultHouseholdName(user),
        members: {
          create: {
            userId: user.id,
            role: "OWNER"
          }
        },
        appSettings: {
          create: {
            userId: user.id,
            dashboardBoardCount: DEFAULT_DASHBOARD_BOARD_COUNT,
            hamsterSelectorMode: DEFAULT_HAMSTER_SELECTOR_MODE
          }
        }
      },
      include: {
        members: {
          where: { userId: user.id },
          include: { household: true }
        }
      }
    });

    return household.members[0];
  });
}

export async function getRequiredHouseholdContext(): Promise<CurrentHouseholdContext> {
  const sessionUser = await getRequiredSessionUser();
  const membership =
    (await findMembership(sessionUser.id, await getPreferredHouseholdId())) ?? (await createInitialHousehold(sessionUser));

  return {
    user: sessionUser,
    household: {
      id: membership.household.id,
      name: membership.household.name
    },
    membership: {
      id: membership.id,
      role: membership.role,
      createdAt: membership.createdAt
    }
  };
}

export async function setCurrentHouseholdCookie(householdId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export function hasHouseholdRole(role: HouseholdRole, allowedRoles: HouseholdRole[]) {
  return allowedRoles.includes(role);
}
