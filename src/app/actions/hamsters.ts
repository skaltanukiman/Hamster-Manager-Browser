"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createHamsterSchema, deleteHamsterSchema, updateHamsterSchema } from "@/lib/schemas";

export async function createHamster(formData: FormData) {
  const result = createHamsterSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/hamsters?status=invalid");
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
    redirect("/hamsters?status=invalid");
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
