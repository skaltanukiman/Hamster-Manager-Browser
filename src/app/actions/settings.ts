"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { APP_SETTING_ID } from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";
import { dashboardSettingsSchema } from "@/lib/schemas";

export async function saveDashboardSettings(formData: FormData) {
  const result = dashboardSettingsSchema.safeParse({
    dashboardBoardCount: formData.get("dashboardBoardCount"),
    hamsterIds: formData.getAll("hamsterIds")
  });

  if (!result.success) {
    redirect("/settings?status=invalid");
  }

  const { dashboardBoardCount } = result.data;
  const selectedHamsterIds = [...new Set(result.data.hamsterIds)];
  const hamsters = await prisma.hamster.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  const validHamsterIds = new Set(hamsters.map((hamster) => hamster.id));
  const requiredSelectionCount = Math.min(dashboardBoardCount, hamsters.length);

  if (selectedHamsterIds.some((id) => !validHamsterIds.has(id))) {
    redirect("/settings?status=invalid");
  }

  if (selectedHamsterIds.length > requiredSelectionCount) {
    redirect("/settings?status=dashboardLimitExceeded");
  }

  if (selectedHamsterIds.length < requiredSelectionCount) {
    redirect("/settings?status=dashboardSelectionRequired");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { id: APP_SETTING_ID },
      update: { dashboardBoardCount },
      create: {
        id: APP_SETTING_ID,
        dashboardBoardCount
      }
    });

    await tx.dashboardHamster.deleteMany({
      where: { settingId: APP_SETTING_ID }
    });

    for (const [index, hamsterId] of selectedHamsterIds.entries()) {
      await tx.dashboardHamster.create({
        data: {
          settingId: APP_SETTING_ID,
          hamsterId,
          sortOrder: index
        }
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/settings");
  redirect("/settings?status=saved");
}
