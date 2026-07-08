"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredSessionUser, setCurrentHouseholdCookie } from "@/lib/auth-context";
import { DEFAULT_DASHBOARD_BOARD_COUNT, DEFAULT_HAMSTER_SELECTOR_MODE } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";

function getRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function switchCurrentHousehold(formData: FormData) {
  const householdId = formData.get("householdId");
  const redirectTo = getRedirectPath(formData.get("redirectTo"));

  if (typeof householdId !== "string" || !householdId) {
    redirect(redirectTo);
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
    redirect(redirectTo);
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
  redirect(redirectTo);
}
