"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodIssue } from "zod";

import { prisma } from "@/lib/prisma";
import {
  createHamsterSchema,
  deleteHamstersSchema,
  deleteHamsterSchema,
  updateHamsterActiveStatusSchema,
  updateHamsterSchema
} from "@/lib/schemas";

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
  const hamster = await prisma.hamster.findUnique({
    where: { id },
    select: { isActive: true }
  });

  if (!hamster) {
    redirect("/hamsters?status=invalid");
  }

  // 管理外のハムスターはプロフィールも含めてロックし、復活後だけ編集できるようにする。
  if (!hamster.isActive) {
    redirect("/hamsters?status=locked");
  }

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

export async function updateHamsterActiveStatus(formData: FormData) {
  const result = updateHamsterActiveStatusSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/hamsters?status=invalid");
  }

  await prisma.hamster.update({
    where: { id: result.data.id },
    data: { isActive: result.data.isActive }
  });

  revalidatePath("/");
  revalidatePath("/hamsters");
  revalidatePath("/cleaning");
  revalidatePath("/weights");
  revalidatePath("/settings");
  redirect("/hamsters?status=updated");
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

export async function deleteHamsters(formData: FormData) {
  const result = deleteHamstersSchema.safeParse({
    ids: formData.getAll("ids")
  });

  if (!result.success) {
    redirect("/hamsters?status=invalid");
  }

  // 送信されたIDの一部だけが存在する場合に、意図しない部分削除にならないよう全件一致を確認する。
  const targetCount = await prisma.hamster.count({
    where: {
      id: { in: result.data.ids }
    }
  });

  if (targetCount !== result.data.ids.length) {
    redirect("/hamsters?status=invalid");
  }

  await prisma.hamster.deleteMany({
    where: {
      id: { in: result.data.ids }
    }
  });

  revalidatePath("/");
  revalidatePath("/hamsters");
  revalidatePath("/cleaning");
  revalidatePath("/weights");
  revalidatePath("/settings");
  redirect("/hamsters?status=deleted");
}
