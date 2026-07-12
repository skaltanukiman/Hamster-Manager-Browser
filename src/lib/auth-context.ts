import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AppRole, HouseholdRole } from "@prisma/client";

import { auth } from "@/auth";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";

export const CURRENT_HOUSEHOLD_COOKIE = "hamster_current_household";
export const DEFAULT_HOUSEHOLD_NAME_SUFFIX = "のハムスター管理";

type SessionUser = {
  id: string;
  appRole: AppRole;
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

export type HouseholdOption = {
  id: string;
  name: string;
  role: HouseholdRole;
  memberCount: number;
  hamsterCount: number;
};

export function defaultHouseholdName(user: Pick<SessionUser, "name" | "email">) {
  const ownerName = user.name || user.email || "あなた";
  return `${ownerName}${DEFAULT_HOUSEHOLD_NAME_SUFFIX}`;
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
    appRole: user.appRole ?? "USER",
    name: user.name,
    email: user.email,
    image: user.image
  };
}

async function findMembership(userId: string, preferredHouseholdId?: string) {
  const memberships = await prisma.householdMember.findMany({
    where: { userId },
    include: {
      household: {
        include: {
          _count: {
            select: {
              members: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (preferredHouseholdId) {
    const preferredMembership = memberships.find((membership) => membership.householdId === preferredHouseholdId);

    if (preferredMembership) {
      return preferredMembership;
    }
  }

  const invitedSharedMembership = memberships.find(
    (membership) => membership.role !== "OWNER" && membership.household._count.members > 1
  );
  const sharedMembership = memberships.find((membership) => membership.household._count.members > 1);

  // 招待されたユーザーは個人用Householdも持つため、cookie未設定時は共有中のHouseholdを優先する。
  return invitedSharedMembership ?? sharedMembership ?? memberships[0] ?? null;
}

async function createInitialHousehold(user: SessionUser) {
  return prisma.$transaction(async (tx) => {
    // 初回ログイン直後は複数の Server Component が並行して初期化へ入るため、ユーザー単位で作成処理を直列化する。
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`;

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

// Route Handler向け。未認証時にHTMLへredirectせず、呼び出し側が401/404を返せるようnullで返す。
export async function getHouseholdContextForRoute(): Promise<CurrentHouseholdContext | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return null;
  }

  const sessionUser: SessionUser = {
    id: user.id,
    appRole: user.appRole ?? "USER",
    name: user.name,
    email: user.email,
    image: user.image
  };
  const membership = await findMembership(sessionUser.id, await getPreferredHouseholdId());

  if (!membership) {
    return null;
  }

  return {
    user: sessionUser,
    household: { id: membership.household.id, name: membership.household.name },
    membership: { id: membership.id, role: membership.role, createdAt: membership.createdAt }
  };
}

export async function getCurrentHouseholdSwitcherData() {
  const context = await getRequiredHouseholdContext();
  const memberships = await prisma.householdMember.findMany({
    where: { userId: context.user.id },
    include: {
      household: {
        include: {
          _count: {
            select: {
              hamsters: true,
              members: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return {
    context,
    households: memberships.map(
      (membership): HouseholdOption => ({
        id: membership.householdId,
        name: membership.household.name,
        role: membership.role,
        memberCount: membership.household._count.members,
        hamsterCount: membership.household._count.hamsters
      })
    )
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

export function hasAppRole(role: AppRole, allowedRoles: AppRole[]) {
  return allowedRoles.includes(role);
}

export async function getRequiredAppAdminUser(allowedRoles: AppRole[] = ["ADMIN", "SUPER_ADMIN"]) {
  const sessionUser = await getRequiredSessionUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true
    }
  });

  if (!user || !hasAppRole(user.appRole, allowedRoles)) {
    redirect("/");
  }

  return user;
}
