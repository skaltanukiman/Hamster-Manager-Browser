"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodIssue } from "zod";

import { prisma } from "@/lib/prisma";
import { createHamsterSchema, deleteHamsterSchema, updateHamsterSchema } from "@/lib/schemas";

// maxLengthをすり抜けて送信された場合でも、文字数超過は項目別のメッセージに分ける。
function hamsterValidationStatus(issues: ZodIssue[]) {
  if (issues.some((issue) => issue.path[0] === "name" && issue.code === "too_big")) {
    return "hamsterNameTooLong";
  }

  if (issues.some((issue) => issue.path[0] === "memo" && issue.code === "too_big")) {
    return "hamsterMemoTooLong";
  }

  return "invalid";
}

export async function createHamster(formData: FormData) {
  const result = createHamsterSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect(`/hamsters?status=${hamsterValidationStatus(result.error.issues)}`);
  }

  let status = "created";

  // ハムスター名は一意制約を持つため、同名登録時は管理画面専用の重複エラーへ遷移する。
  try {
    await prisma.hamster.create({ data: result.data });
  } catch {
    status = "hamsterDuplicate";
  }

  revalidatePath("/");
  revalidatePath("/hamsters");
  redirect(`/hamsters?status=${status}`);
}

export async function updateHamster(formData: FormData) {
  const result = updateHamsterSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect(`/hamsters?status=${hamsterValidationStatus(result.error.issues)}`);
  }

  const { id, ...data } = result.data;
  let status = "updated";

  // 名前変更でも同名の別ハムスターと衝突する可能性があるため、登録時と同じ重複エラーを返す。
  try {
    await prisma.hamster.update({
      where: { id },
      data
    });
  } catch {
    status = "hamsterDuplicate";
  }

  revalidatePath("/");
  revalidatePath("/hamsters");
  redirect(`/hamsters?status=${status}`);
}

export async function deleteHamster(formData: FormData) {
  const result = deleteHamsterSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/hamsters?status=invalid");
  }

  await prisma.hamster.delete({
    where: { id: result.data.id }
  });

  revalidatePath("/");
  revalidatePath("/hamsters");
  redirect("/hamsters?status=deleted");
}
