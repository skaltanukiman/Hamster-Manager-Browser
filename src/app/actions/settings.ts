"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { dashboardSettingsSchema } from "@/lib/schemas";

export async function saveDashboardSettings(formData: FormData) {
  const context = await getRequiredHouseholdContext();
  const result = dashboardSettingsSchema.safeParse({
    dashboardBoardCount: formData.get("dashboardBoardCount"),
    hamsterSelectorMode: formData.get("hamsterSelectorMode"),
    hamsterIds: formData.getAll("hamsterIds")
  });

  if (!result.success) {
    redirect("/settings?status=invalid");
  }

  const { dashboardBoardCount, hamsterSelectorMode } = result.data;
  // チェックボックスの多重送信や手動POSTを考慮し、保存前にIDを一意化する。
  const selectedHamsterIds = [...new Set(result.data.hamsterIds)];
  const hamsters = await prisma.hamster.findMany({
    where: { householdId: context.household.id },
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
    const setting = await tx.appSetting.upsert({
      where: {
        userId_householdId: {
          userId: context.user.id,
          householdId: context.household.id
        }
      },
      update: { dashboardBoardCount, hamsterSelectorMode },
      create: {
        userId: context.user.id,
        householdId: context.household.id,
        dashboardBoardCount,
        hamsterSelectorMode
      }
    });

    await tx.dashboardHamster.deleteMany({
      where: { settingId: setting.id }
    });

    // sortOrderは設定画面で選ばれた順序を保持し、ダッシュボード表示の優先順に使う。
    for (const [index, hamsterId] of selectedHamsterIds.entries()) {
      await tx.dashboardHamster.create({
        data: {
          settingId: setting.id,
          hamsterId,
          sortOrder: index
        }
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/cleaning");
  revalidatePath("/settings");
  revalidatePath("/weights");
  revalidatePath("/weights/export");
  redirect("/settings?status=saved");
}
