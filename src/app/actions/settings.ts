"use server";

import { redirect } from "next/navigation";

import {
  DEFAULT_HOUSEHOLD_NAME_SUFFIX,
  defaultHouseholdName,
  getRequiredHouseholdContext
} from "@/lib/auth-context";
import {
  normalizeDashboardBoardCount,
  normalizeHamsterSelectorMode,
  pickDashboardHamsters
} from "@/lib/dashboard-settings";
import { prisma } from "@/lib/prisma";
import {
  getRealtimeActorId,
  publishHouseholdChangesSafely,
  updateHouseholdRevisions
} from "@/lib/realtime";
import { revalidatePathsSafely } from "@/lib/safe-side-effects";
import { dashboardSettingsSchema, updateUserProfileSchema } from "@/lib/schemas";
import { handleServerActionError } from "@/lib/server-errors";
import { getSettingsChanges } from "@/lib/settings-diff";

export async function saveSettings(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const profileResult = updateUserProfileSchema.safeParse({ name: formData.get("name") });
    if (!profileResult.success) {
      const isNameTooLong = profileResult.error.issues.some(
        (issue) => issue.path[0] === "name" && issue.code === "too_big"
      );
      redirect(isNameTooLong ? "/settings?status=profileNameTooLong" : "/settings?status=invalid");
    }
    const dashboardResult = dashboardSettingsSchema.safeParse({
      dashboardBoardCount: formData.get("dashboardBoardCount"),
      hamsterSelectorMode: formData.get("hamsterSelectorMode"),
      hamsterIds: formData.getAll("hamsterIds")
    });
    if (!dashboardResult.success) redirect("/settings?status=invalid");

    const { dashboardBoardCount, hamsterSelectorMode } = dashboardResult.data;
    const selectedHamsterIds = [...new Set(dashboardResult.data.hamsterIds)];
    const [user, hamsters, setting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.user.id },
        select: { id: true, name: true, email: true }
      }),
      prisma.hamster.findMany({
        where: { householdId: context.household.id },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      }),
      prisma.appSetting.findUnique({
        where: { userId_householdId: { userId: context.user.id, householdId: context.household.id } },
        include: { dashboardHamsters: { orderBy: { sortOrder: "asc" } } }
      })
    ]);
    if (!user) redirect("/login");

    const validHamsterIds = new Set(hamsters.map((hamster) => hamster.id));
    const requiredSelectionCount = Math.min(dashboardBoardCount, hamsters.length);
    if (selectedHamsterIds.some((id) => !validHamsterIds.has(id))) redirect("/settings?status=invalid");
    if (selectedHamsterIds.length > requiredSelectionCount) redirect("/settings?status=dashboardLimitExceeded");
    if (selectedHamsterIds.length < requiredSelectionCount) redirect("/settings?status=dashboardSelectionRequired");

    const currentBoardCount = normalizeDashboardBoardCount(setting?.dashboardBoardCount);
    const currentSelectorMode = normalizeHamsterSelectorMode(setting?.hamsterSelectorMode);
    const currentSelectedHamsterIds = pickDashboardHamsters(
      hamsters,
      currentBoardCount,
      setting?.dashboardHamsters.map((entry) => entry.hamsterId) ?? []
    ).map((hamster) => hamster.id);
    const { profileChanged, dashboardChanged } = getSettingsChanges(
      {
        name: user.name ?? "",
        dashboardBoardCount: currentBoardCount,
        hamsterSelectorMode: currentSelectorMode,
        hamsterIds: currentSelectedHamsterIds
      },
      {
        name: profileResult.data.name,
        dashboardBoardCount,
        hamsterSelectorMode,
        hamsterIds: selectedHamsterIds
      }
    );

    if (!profileChanged && !dashboardChanged) redirect("/settings?status=unchanged");

    const actorClientId = getRealtimeActorId(formData);
    const changes = await prisma.$transaction(async (tx) => {
      if (profileChanged) {
        const nextHouseholdName = defaultHouseholdName({ name: profileResult.data.name, email: user.email });
        await tx.user.update({ where: { id: context.user.id }, data: { name: profileResult.data.name } });
        await tx.household.updateMany({
          where: {
            name: { endsWith: DEFAULT_HOUSEHOLD_NAME_SUFFIX },
            members: { some: { userId: context.user.id, role: "OWNER" } }
          },
          data: { name: nextHouseholdName }
        });
      }

      if (dashboardChanged) {
        const setting = await tx.appSetting.upsert({
          where: { userId_householdId: { userId: context.user.id, householdId: context.household.id } },
          update: { dashboardBoardCount, hamsterSelectorMode },
          create: {
            userId: context.user.id,
            householdId: context.household.id,
            dashboardBoardCount,
            hamsterSelectorMode
          }
        });
        await tx.dashboardHamster.deleteMany({ where: { settingId: setting.id } });
        for (const [index, hamsterId] of selectedHamsterIds.entries()) {
          await tx.dashboardHamster.create({ data: { settingId: setting.id, hamsterId, sortOrder: index } });
        }
      }
      const householdIds = profileChanged
        ? (
            await tx.householdMember.findMany({
              where: { userId: context.user.id },
              select: { householdId: true }
            })
          ).map((membership) => membership.householdId)
        : [context.household.id];

      return updateHouseholdRevisions(
        tx,
        householdIds,
        profileChanged ? "profile" : "settings",
        actorClientId,
        context.user.id
      );
    });

    publishHouseholdChangesSafely(changes);
    revalidatePathsSafely(
      [
        { path: "/", type: "layout" },
        { path: "/cleaning" },
        { path: "/settings" },
        { path: "/settings/members" },
        { path: "/weights" },
        { path: "/weights/export" },
        { path: "/admin" }
      ],
      "settings.save.revalidate",
      { householdId: context.household.id, userId: context.user.id }
    );
    redirect("/settings?status=saved");
  } catch (error) {
    handleServerActionError(error, { operation: "settings.save", pathname: "/settings" });
  }
}
