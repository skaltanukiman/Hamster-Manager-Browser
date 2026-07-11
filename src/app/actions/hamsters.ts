"use server";

import { redirect } from "next/navigation";
import type { ZodIssue } from "zod";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";
import { commitHouseholdMutation, getRealtimeActorId, publishHouseholdChangeSafely } from "@/lib/realtime";
import { revalidatePathsSafely } from "@/lib/safe-side-effects";
import { handleServerActionError, isPrismaUniqueConstraintError } from "@/lib/server-errors";
import {
  createHamsterSchema,
  deleteHamstersSchema,
  deleteHamsterSchema,
  updateHamsterActiveStatusSchema,
  updateHamsterSchema
} from "@/lib/schemas";

function isSameNullableDate(first: Date | null, second: Date | null) {
  if (first === null || second === null) {
    return first === second;
  }

  return first.getTime() === second.getTime();
}

// maxLengthをすり抜けて送信された場合でも、文字数超過は項目別のメッセージに分ける。
function hamsterValidationStatus(issues: ZodIssue[]) {
  if (issues.some((issue) => issue.path[0] === "name" && issue.code === "too_big")) {
    return "hamsterNameTooLong";
  }

  if (issues.some((issue) => issue.path[0] === "memo" && issue.code === "too_big")) {
    return "hamsterMemoTooLong";
  }

  // 誕生日・お迎え日の未来日だけは、入力不備の理由が伝わるように専用メッセージへ振り分ける。
  if (issues.some((issue) => ["birthDate", "adoptionDate"].includes(String(issue.path[0])) && issue.message === "future")) {
    return "future";
  }

  return "invalid";
}

export async function createHamster(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = createHamsterSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
      redirect(`/hamsters?status=${hamsterValidationStatus(result.error.issues)}`);
    }

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "hamster",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: (tx) =>
        tx.hamster.create({
          data: {
            ...result.data,
            householdId: context.household.id
          }
        })
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely([{ path: "/" }, { path: "/hamsters" }], "hamsters.create.revalidate", {
      householdId: context.household.id
    });
    redirect("/hamsters?status=created");
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      redirect("/hamsters?status=hamsterDuplicate");
    }

    handleServerActionError(error, { operation: "hamsters.create", pathname: "/hamsters" });
  }
}

export async function updateHamster(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = updateHamsterSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
      redirect(`/hamsters?status=${hamsterValidationStatus(result.error.issues)}`);
    }

    const { id, ...data } = result.data;
    const hamster = await prisma.hamster.findUnique({
      where: { id },
      select: {
        householdId: true,
        name: true,
        memo: true,
        birthDate: true,
        adoptionDate: true,
        isActive: true
      }
    });

    if (!hamster || hamster.householdId !== context.household.id) {
      redirect("/hamsters?status=invalid");
    }

    if (!hamster.isActive) {
      redirect("/hamsters?status=locked");
    }

    if (
      hamster.name === data.name &&
      hamster.memo === data.memo &&
      isSameNullableDate(hamster.birthDate, data.birthDate) &&
      isSameNullableDate(hamster.adoptionDate, data.adoptionDate)
    ) {
      redirect("/hamsters?status=unchanged");
    }

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "hamster",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: (tx) => tx.hamster.update({ where: { id }, data })
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely([{ path: "/" }, { path: "/hamsters" }], "hamsters.update.revalidate", {
      householdId: context.household.id,
      hamsterId: id
    });
    redirect("/hamsters?status=updated");
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      redirect("/hamsters?status=hamsterDuplicate");
    }

    handleServerActionError(error, { operation: "hamsters.update", pathname: "/hamsters" });
  }
}

export async function updateHamsterActiveStatus(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = updateHamsterActiveStatusSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) redirect("/hamsters?status=invalid");

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "hamster",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
        const updated = await tx.hamster.updateMany({
          where: { id: result.data.id, householdId: context.household.id },
          data: { isActive: result.data.isActive }
        });
        if (updated.count !== 1) redirect("/hamsters?status=invalid");
      }
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely(
      ["/", "/hamsters", "/cleaning", "/weights", "/settings"].map((path) => ({ path })),
      "hamsters.activeStatus.revalidate",
      { householdId: context.household.id, hamsterId: result.data.id }
    );
    redirect("/hamsters?status=updated");
  } catch (error) {
    handleServerActionError(error, { operation: "hamsters.activeStatus", pathname: "/hamsters" });
  }
}

export async function deleteHamster(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = deleteHamsterSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) redirect("/hamsters?status=invalid");

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "hamster",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
        const deleted = await tx.hamster.deleteMany({ where: { id: result.data.id, householdId: context.household.id } });
        if (deleted.count !== 1) redirect("/hamsters?status=invalid");
      }
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely([{ path: "/" }, { path: "/hamsters" }], "hamsters.delete.revalidate", {
      householdId: context.household.id,
      hamsterId: result.data.id
    });
    redirect("/hamsters?status=deleted");
  } catch (error) {
    handleServerActionError(error, { operation: "hamsters.delete", pathname: "/hamsters" });
  }
}

export async function deleteHamsters(formData: FormData) {
  try {
    const context = await getRequiredHouseholdContext();
    const result = deleteHamstersSchema.safeParse({ ids: formData.getAll("ids") });
    if (!result.success) redirect("/hamsters?status=invalid");

    const { change } = await commitHouseholdMutation({
      householdId: context.household.id,
      source: "hamster",
      actorClientId: getRealtimeActorId(formData),
      actorUserId: context.user.id,
      mutate: async (tx) => {
        const deleted = await tx.hamster.deleteMany({
          where: { id: { in: result.data.ids }, householdId: context.household.id }
        });
        if (deleted.count !== result.data.ids.length) redirect("/hamsters?status=invalid");
      }
    });
    publishHouseholdChangeSafely(change);
    revalidatePathsSafely(
      ["/", "/hamsters", "/cleaning", "/weights", "/settings"].map((path) => ({ path })),
      "hamsters.deleteMany.revalidate",
      { householdId: context.household.id, targetCount: result.data.ids.length }
    );
    redirect("/hamsters?status=deleted");
  } catch (error) {
    handleServerActionError(error, { operation: "hamsters.deleteMany", pathname: "/hamsters" });
  }
}
