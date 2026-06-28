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
  // チェックボックスの多重送信や手動POSTを考慮し、保存前にIDを一意化する。
  const selectedHamsterIds = [...new Set(result.data.hamsterIds)];
  const hamsters = await prisma.hamster.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  const validHamsterIds = new Set(hamsters.map((hamster) => hamster.id));
  // 登録数が表示数未満の場合は、登録済みハムスター数が必要な選択数になる。
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

  // 設定本体と表示対象の差し替えを同時に確定し、中途半端な選択状態を残さない。
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

    // sortOrderは設定画面で選ばれた順序を保持し、ダッシュボード表示の優先順に使う。
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
