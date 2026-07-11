"use server";

import { redirect } from "next/navigation";
import type { AppRole } from "@prisma/client";

import { getRequiredAppAdminUser } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { revalidatePathsSafely } from "@/lib/safe-side-effects";
import { handleServerActionError } from "@/lib/server-errors";

const APP_ROLES: AppRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];

function parseAppRole(value: FormDataEntryValue | null): AppRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : null;
}

export async function updateUserAppRole(formData: FormData) {
  try {
    const currentUser = await getRequiredAppAdminUser(["SUPER_ADMIN"]);
    const targetUserId = formData.get("userId");
    const appRole = parseAppRole(formData.get("appRole"));
    if (typeof targetUserId !== "string" || !targetUserId || !appRole) {
      redirect("/admin?status=adminTargetInvalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('hamster-manager-super-admin', 0))`;
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, appRole: true }
      });
      if (!targetUser) redirect("/admin?status=adminTargetInvalid");
      if (targetUser.id === currentUser.id && targetUser.appRole !== appRole) {
        redirect("/admin?status=cannotChangeOwnRole");
      }
      if (targetUser.appRole === "SUPER_ADMIN" && appRole !== "SUPER_ADMIN") {
        const superAdminCount = await tx.user.count({ where: { appRole: "SUPER_ADMIN" } });
        if (superAdminCount <= 1) redirect("/admin?status=cannotRemoveLastSuperAdmin");
      }
      await tx.user.update({ where: { id: targetUser.id }, data: { appRole } });
    });

    revalidatePathsSafely([{ path: "/admin" }, { path: "/", type: "layout" }], "admin.updateRole.revalidate", {
      targetUserId
    });
    redirect("/admin?status=roleUpdated");
  } catch (error) {
    handleServerActionError(error, { operation: "admin.updateRole", pathname: "/admin" });
  }
}
