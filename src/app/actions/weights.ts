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

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

function getWeightHistoryFilter(formData: FormData) {
  const filter = formData.get("filter");
  const month = formData.get("month");
  const page = formData.get("page");
  const pageNumber = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : undefined;
  const historyFilter: { filter?: string; month?: string; page?: number } = {};

  if (filter === "month") {
    historyFilter.filter = "month";

    if (typeof month === "string" && YEAR_MONTH_PATTERN.test(month)) {
      historyFilter.month = month;
    }
  }

  if (pageNumber && pageNumber > 1) {
    historyFilter.page = pageNumber;
  }

  return historyFilter;
}

function weightRedirect(hamsterId: string, status: string, historyFilter: { filter?: string; month?: string; page?: number } = {}) {
  const params = new URLSearchParams({
    hamsterId,
    status
  });

  if (historyFilter.filter) {
    params.set("filter", historyFilter.filter);
  }

  if (historyFilter.month) {
    params.set("month", historyFilter.month);
  }

  if (historyFilter.page && historyFilter.page > 1) {
    params.set("page", String(historyFilter.page));
  }

  redirect(`/weights?${params.toString()}`);
}

async function ensureHamsterIsActive(hamsterId: string) {
  const hamster = await prisma.hamster.findUnique({
    where: { id: hamsterId },
    select: { isActive: true }
  });

  if (!hamster) {
    redirect("/weights?status=invalid");
  }

  if (!hamster.isActive) {
    weightRedirect(hamsterId, "locked");
  }
}

async function getEditableWeightRecord(recordId: string, hamsterId: string) {
  const record = await prisma.weightRecord.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      hamsterId: true,
      hamster: {
        select: {
          isActive: true
        }
      }
    }
  });

  if (!record || record.hamsterId !== hamsterId) {
    redirect("/weights?status=invalid");
  }

  // 管理外のハムスターに紐づく履歴は、復活するまで編集・削除を受け付けない。
  if (!record.hamster.isActive) {
    weightRedirect(record.hamsterId, "locked");
  }

  return record;
}

export async function createWeightRecord(formData: FormData) {
  const result = createWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  const historyFilter = getWeightHistoryFilter(formData);

  if (isFutureDateInput(result.data.recordDate)) {
    weightRedirect(result.data.hamsterId, "future", historyFilter);
  }

  await ensureHamsterIsActive(result.data.hamsterId);

  const recordDate = parseDateInput(result.data.recordDate);

  // 体重はハムスターごとに1日1件として扱い、同じ日の再登録は最新入力で上書きする。
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
  weightRedirect(result.data.hamsterId, "saved", historyFilter);
}

export async function updateWeightRecord(formData: FormData) {
  const result = updateWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  const historyFilter = getWeightHistoryFilter(formData);

  if (isFutureDateInput(result.data.recordDate)) {
    weightRedirect(result.data.hamsterId, "future", historyFilter);
  }

  await getEditableWeightRecord(result.data.id, result.data.hamsterId);

  const recordDate = parseDateInput(result.data.recordDate);
  let status = "updated";

  // 編集で日付を移動した先に既存レコードがある場合は、DBの一意制約に任せて重複エラーとして返す。
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
  weightRedirect(result.data.hamsterId, status, historyFilter);
}

export async function deleteWeightRecord(formData: FormData) {
  const result = deleteWeightRecordSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/weights?status=invalid");
  }

  const historyFilter = getWeightHistoryFilter(formData);

  await getEditableWeightRecord(result.data.id, result.data.hamsterId);

  await prisma.weightRecord.delete({
    where: { id: result.data.id }
  });

  revalidatePath("/");
  revalidatePath("/weights");
  weightRedirect(result.data.hamsterId, "deleted", historyFilter);
}
