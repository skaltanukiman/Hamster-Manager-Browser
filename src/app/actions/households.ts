"use server";

import { revalidatePath } from "next/cache";

import { getRequiredSessionUser, setCurrentHouseholdCookie } from "@/lib/auth-context";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";

export async function switchCurrentHousehold(formData: FormData) {
  const householdId = formData.get("householdId");

  if (typeof householdId !== "string" || !householdId) {
    return;
  }

  const user = await getRequiredSessionUser();
  const membership = await prisma.householdMember.findFirst({
    where: {
      householdId,
      userId: user.id
    },
    select: { householdId: true }
  });

  if (!membership) {
    return;
  }

  await prisma.appSetting.upsert({
    where: {
      userId_householdId: {
        userId: user.id,
        householdId
      }
    },
    update: {},
    create: {
      userId: user.id,
      householdId,
      dashboardBoardCount: DEFAULT_DASHBOARD_BOARD_COUNT,
      hamsterSelectorMode: DEFAULT_HAMSTER_SELECTOR_MODE
    }
  });

  await setCurrentHouseholdCookie(householdId);
  revalidatePath("/", "layout");
}
