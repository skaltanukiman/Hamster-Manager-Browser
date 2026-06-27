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
