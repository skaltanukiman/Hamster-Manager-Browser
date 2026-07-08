"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppRole } from "@prisma/client";

import { getRequiredAppAdminUser } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

const APP_ROLES: AppRole[] = ["USER", "ADMIN", "SUPER_ADMIN"];

function parseAppRole(value: FormDataEntryValue | null): AppRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : null;
}

export async function updateUserAppRole(formData: FormData) {
  const currentUser = await getRequiredAppAdminUser(["SUPER_ADMIN"]);
  const targetUserId = formData.get("userId");
  const appRole = parseAppRole(formData.get("appRole"));

  if (typeof targetUserId !== "string" || !targetUserId || !appRole) {
    redirect("/admin?status=adminTargetInvalid");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      appRole: true
    }
  });

  if (!targetUser) {
    redirect("/admin?status=adminTargetInvalid");
  }

  if (targetUser.id === currentUser.id && targetUser.appRole !== appRole) {
    redirect("/admin?status=cannotChangeOwnRole");
  }

  if (targetUser.appRole === "SUPER_ADMIN" && appRole !== "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({
      where: { appRole: "SUPER_ADMIN" }
    });

    if (superAdminCount <= 1) {
      redirect("/admin?status=cannotRemoveLastSuperAdmin");
    }
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { appRole }
  });

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?status=roleUpdated");
}
