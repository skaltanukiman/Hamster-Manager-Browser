"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isFutureDateInput, parseDateInput } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  createWeightRecordSchema,
  deleteWeightRecordSchema,
  updateWeightRecordSchema
} from "@/lib/schemas";

function weightRedirect(hamsterId: string, status: string) {
  redirect(`/weights?hamsterId=${encodeURIComponent(hamsterId)}&status=${status}`);
}

export async function createWeightRecord(formData: FormData) {
  const result = createWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  if (isFutureDateInput(result.data.recordDate)) {
    weightRedirect(result.data.hamsterId, "future");
  }

  const recordDate = parseDateInput(result.data.recordDate);

  await prisma.weightRecord.upsert({
    where: {
      hamsterId_recordDate: {
        hamsterId: result.data.hamsterId,
        recordDate
      }
    },
    update: {
      weightG: result.data.weightG
    },
    create: {
      hamsterId: result.data.hamsterId,
      recordDate,
      weightG: result.data.weightG
    }
  });

  revalidatePath("/");
  revalidatePath("/weights");
  weightRedirect(result.data.hamsterId, "saved");
}

export async function updateWeightRecord(formData: FormData) {
  const result = updateWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  if (isFutureDateInput(result.data.recordDate)) {
    weightRedirect(result.data.hamsterId, "future");
  }

  const recordDate = parseDateInput(result.data.recordDate);
  let status = "updated";

  try {
    await prisma.weightRecord.update({
      where: { id: result.data.id },
      data: {
        recordDate,
        weightG: result.data.weightG
      }
    });
  } catch {
    status = "duplicate";
  }

  revalidatePath("/");
  revalidatePath("/weights");
  weightRedirect(result.data.hamsterId, status);
}

export async function deleteWeightRecord(formData: FormData) {
  const result = deleteWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  await prisma.weightRecord.delete({
    where: { id: result.data.id }
  });

  revalidatePath("/");
  revalidatePath("/weights");
  weightRedirect(result.data.hamsterId, "deleted");
}
