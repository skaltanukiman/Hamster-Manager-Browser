"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DEFAULT_HOUSEHOLD_NAME_SUFFIX,
  defaultHouseholdName,
  getRequiredHouseholdContext,
  getRequiredSessionUser
} from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { dashboardSettingsSchema, updateUserProfileSchema } from "@/lib/schemas";

export async function updateUserProfile(formData: FormData) {
  const sessionUser = await getRequiredSessionUser();
  const result = updateUserProfileSchema.safeParse({
    name: formData.get("name")
  });

  if (!result.success) {
    const isNameTooLong = result.error.issues.some((issue) => issue.path[0] === "name" && issue.code === "too_big");
    redirect(isNameTooLong ? "/settings?status=profileNameTooLong" : "/settings?status=invalid");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true }
  });

  if (!user) {
    redirect("/login");
  }

  if ((user.name ?? "") === result.data.name) {
    redirect("/settings?status=unchanged");
  }

  const nextHouseholdName = defaultHouseholdName({ name: result.data.name, email: user.email });

  await prisma.$transaction(async (tx) => {
    // 表示名は本人のプロフィール情報だけを更新し、FormData由来のuserIdでは更新対象を決めない。
    await tx.user.update({
      where: { id: sessionUser.id },
      data: { name: result.data.name }
    });

    // 個人用Household名は作成時の表示名を含むため、表示名変更時に自動生成名だけ同期する。
    await tx.household.updateMany({
      where: {
        name: { endsWith: DEFAULT_HOUSEHOLD_NAME_SUFFIX },
        members: {
          some: {
            userId: sessionUser.id,
            role: "OWNER"
          }
        }
      },
      data: { name: nextHouseholdName }
    });
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/members");
  revalidatePath("/admin");
  redirect("/settings?status=profileUpdated");
}

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
