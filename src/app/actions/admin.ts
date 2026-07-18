"use server";

import { redirect } from "next/navigation";
import type { AppRole } from "@prisma/client";

import { appRoleUpdateDenial } from "@/lib/authorization";
import { getRequiredAppAdminUser } from "@/lib/auth-context";
import { buildAdminRoleStatusHref, normalizeAdminRoleReturnPath } from "@/lib/admin-users";
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
  const returnPath = normalizeAdminRoleReturnPath(formData.get("returnTo"));

  try {
    const currentUser = await getRequiredAppAdminUser(["SUPER_ADMIN"]);
    const targetUserId = formData.get("userId");
    const appRole = parseAppRole(formData.get("appRole"));
    if (typeof targetUserId !== "string" || !targetUserId || !appRole) {
      redirect(buildAdminRoleStatusHref(returnPath, "adminTargetInvalid"));
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('hamster-manager-super-admin', 0))`;
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, appRole: true }
      });
      if (!targetUser) redirect(buildAdminRoleStatusHref(returnPath, "adminTargetInvalid"));
      let superAdminCount = Number.MAX_SAFE_INTEGER;
      if (targetUser.appRole === "SUPER_ADMIN" && appRole !== "SUPER_ADMIN") {
        superAdminCount = await tx.user.count({ where: { appRole: "SUPER_ADMIN" } });
      }
      const denial = appRoleUpdateDenial({
        actorRole: currentUser.appRole,
        actorUserId: currentUser.id,
        targetUserId: targetUser.id,
        currentRole: targetUser.appRole,
        newRole: appRole,
        superAdminCount
      });
      if (denial === "forbidden") redirect("/");
      if (denial) redirect(buildAdminRoleStatusHref(returnPath, denial));
      await tx.user.update({ where: { id: targetUser.id }, data: { appRole } });
    });

    revalidatePathsSafely(
      [{ path: "/admin" }, { path: "/admin/users" }, { path: "/", type: "layout" }],
      "admin.updateRole.revalidate",
      { targetUserId }
    );
    redirect(buildAdminRoleStatusHref(returnPath, "roleUpdated"));
  } catch (error) {
    handleServerActionError(error, { operation: "admin.updateRole", pathname: returnPath });
  }
}
