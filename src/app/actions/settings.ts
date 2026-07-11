"use server";

import { redirect } from "next/navigation";

import {
  DEFAULT_HOUSEHOLD_NAME_SUFFIX,
  defaultHouseholdName,
  getRequiredHouseholdContext,
  getRequiredSessionUser
} from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import {
  commitHouseholdMutation,
  getRealtimeActorId,
  publishHouseholdChangeSafely,
  publishHouseholdChangesSafely,
  updateHouseholdRevisions
} from "@/lib/realtime";
import { revalidatePathsSafely } from "@/lib/safe-side-effects";
import { dashboardSettingsSchema, updateUserProfileSchema } from "@/lib/schemas";
import { handleServerActionError } from "@/lib/server-errors";

export async function updateUserProfile(formData: FormData) {
  try {
    const sessionUser = await getRequiredSessionUser();
    const result = updateUserProfileSchema.safeParse({ name: formData.get("name") });
    if (!result.success) {
      const isNameTooLong = result.error.issues.some((issue) => issue.path[0] === "name" && issue.code === "too_big");
      redirect(isNameTooLong ? "/settings?status=profileNameTooLong" : "/settings?status=invalid");
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, email: true }
    });
    if (!user) redirect("/login");
    if ((user.name ?? "") === result.data.name) redirect("/settings?status=unchanged");

    const nextHouseholdName = defaultHouseholdName({ name: result.data.name, email: user.email });
    const changes = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: sessionUser.id }, data: { name: result.data.name } });
      await tx.household.updateMany({
        where: {
          name: { endsWith: DEFAULT_HOUSEHOLD_NAME_SUFFIX },
          members: { some: { userId: sessionUser.id, role: "OWNER" } }
        },
        data: { name: nextHouseholdName }
      });
      const memberships = await tx.householdMember.findMany({
        where: { userId: sessionUser.id },
        select: { householdId: true }
      });
      return updateHouseholdRevisions(
        tx,
        memberships.map((membership) => membership.householdId),
        "profile",
        getRealtimeActorId(formData),
        sessionUser.id
      );
    });

    publishHouseholdChangesSafely(changes);
    revalidatePathsSafely(
      [{ path: "/", type: "layout" }, { path: "/settings" }, { path: "/settings/members" }, { path: "/admin" }],
      "settings.profile.revalidate",
      { userId: sessionUser.id }
    );
    redirect("/settings?status=profileUpdated");
  } catch (error) {
    handleServerActionError(error, { operation: "settings.profile", pathname: "/settings" });
  }
}

export async function saveDashboardSettings(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = dashboardSettingsSchema.safeParse({
      dashboardBoardCount: formData.get("dashboardBoardCount"),
      hamsterSelectorMode: formData.get("hamsterSelectorMode"),
      hamsterIds: formData.getAll("hamsterIds")
    });
    if (!result.success) redirect("/settings?status=invalid");

    const { dashboardBoardCount, hamsterSelectorMode } = result.data;
    const selectedHamsterIds = [...new Set(result.data.hamsterIds)];
    const hamsters = await prisma.hamster.findMany({
      where: { householdId: context.household.id },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    const validHamsterIds = new Set(hamsters.map((hamster) => hamster.id));
    const requiredSelectionCount = Math.min(dashboardBoardCount, hamsters.length);
    if (selectedHamsterIds.some((id) => !validHamsterIds.has(id))) redirect("/settings?status=invalid");
    if (selectedHamsterIds.length > requiredSelectionCount) redirect("/settings?status=dashboardLimitExceeded");
    if (selectedHamsterIds.length < requiredSelectionCount) redirect("/settings?status=dashboardSelectionRequired");

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "settings",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
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
    });

    publishHouseholdChangeSafely(change);
    revalidatePathsSafely(
      ["/", "/cleaning", "/settings", "/weights", "/weights/export"].map((path) => ({ path })),
      "settings.dashboard.revalidate",
      { householdId: context.household.id }
    );
    redirect("/settings?status=saved");
  } catch (error) {
    handleServerActionError(error, { operation: "settings.dashboard", pathname: "/settings" });
  }
}
