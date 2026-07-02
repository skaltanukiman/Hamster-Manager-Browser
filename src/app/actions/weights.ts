"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isFutureDateInput, parseDateInput, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  createWeightRecordSchema,
  deleteWeightRecordSchema,
  updateWeightRecordSchema
} from "@/lib/schemas";
import { parseWeightCsvImport, type WeightCsvImportIssue } from "@/lib/weight-csv-import";

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const WEIGHT_SORT_TARGETS = new Set(["registered", "date", "weight"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);

type WeightHistoryFilter = {
  filter?: string;
  month?: string;
  page?: number;
  sort?: string;
  direction?: string;
};

export type WeightCsvImportState = {
  hasResult: boolean;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  errors: WeightCsvImportIssue[];
  message: string;
};

function weightCsvImportState({
  successCount = 0,
  skippedCount = 0,
  errors = [],
  message
}: {
  successCount?: number;
  skippedCount?: number;
  errors?: WeightCsvImportIssue[];
  message: string;
}): WeightCsvImportState {
  return {
    hasResult: true,
    successCount,
    skippedCount,
    errorCount: errors.length,
    errors,
    message
  };
}

function getWeightHistoryFilter(formData: FormData) {
  const filter = formData.get("filter");
  const month = formData.get("month");
  const page = formData.get("page");
  const sort = formData.get("sort");
  const direction = formData.get("direction");
  const pageNumber = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : undefined;
  const historyFilter: WeightHistoryFilter = {};

  if (filter === "month") {
    historyFilter.filter = "month";

    if (typeof month === "string" && YEAR_MONTH_PATTERN.test(month)) {
      historyFilter.month = month;
    }
  }

  if (pageNumber && pageNumber > 1) {
    historyFilter.page = pageNumber;
  }

  if (typeof sort === "string" && WEIGHT_SORT_TARGETS.has(sort)) {
    historyFilter.sort = sort;
  }

  if (typeof direction === "string" && SORT_DIRECTIONS.has(direction)) {
    historyFilter.direction = direction;
  }

  return historyFilter;
}

function weightRedirect(hamsterId: string, status: string, historyFilter: WeightHistoryFilter = {}) {
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

  if (historyFilter.sort) {
    params.set("sort", historyFilter.sort);
  }

  if (historyFilter.direction) {
    params.set("direction", historyFilter.direction);
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
  weightRedirect(result.data.hamsterId, "saved", {
    filter: historyFilter.filter,
    month: historyFilter.month,
    sort: "registered",
    direction: "desc"
  });
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

export async function importWeightRecordsCsv(
  _previousState: WeightCsvImportState,
  formData: FormData
): Promise<WeightCsvImportState> {
  const csvFile = formData.get("csvFile");

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return weightCsvImportState({
      errors: [{ lineNumber: 0, message: "CSVファイルを選択してください。" }],
      message: "CSVインポートに失敗しました。"
    });
  }

  const parsed = parseWeightCsvImport(await csvFile.text());
  const errors: WeightCsvImportIssue[] = [...parsed.errors];

  if (parsed.rows.length === 0) {
    return weightCsvImportState({
      errors,
      message: errors.length > 0 ? "登録できる行がありませんでした。" : "CSVに登録対象の行がありませんでした。"
    });
  }

  const hamsters = await prisma.hamster.findMany({
    select: {
      id: true,
      name: true,
      isActive: true
    }
  });
  const hamsterByName = new Map(hamsters.map((hamster) => [hamster.name, hamster]));
  const importCandidates: Array<{
    hamsterId: string;
    recordDate: Date;
    recordDateInput: string;
    weightG: number;
  }> = [];

  for (const row of parsed.rows) {
    const hamster = hamsterByName.get(row.hamsterName);

    if (!hamster) {
      errors.push({ lineNumber: row.lineNumber, message: `ハムスター「${row.hamsterName}」が登録されていません。` });
      continue;
    }

    if (!hamster.isActive) {
      errors.push({ lineNumber: row.lineNumber, message: `ハムスター「${row.hamsterName}」は管理外のため登録できません。` });
      continue;
    }

    importCandidates.push({
      hamsterId: hamster.id,
      recordDate: row.recordDate,
      recordDateInput: row.recordDateInput,
      weightG: row.weightG
    });
  }

  if (importCandidates.length === 0) {
    return weightCsvImportState({
      errors,
      message: "登録できる行がありませんでした。"
    });
  }

  const hamsterIds = [...new Set(importCandidates.map((row) => row.hamsterId))];
  const recordDates = [...new Set(importCandidates.map((row) => row.recordDateInput))].map(parseDateInput);
  const existingRecords = await prisma.weightRecord.findMany({
    where: {
      hamsterId: { in: hamsterIds },
      recordDate: { in: recordDates }
    },
    select: {
      hamsterId: true,
      recordDate: true
    }
  });
  const existingKeys = new Set(existingRecords.map((record) => `${record.hamsterId}:${toDateInputValue(record.recordDate)}`));
  const csvKeys = new Set<string>();
  const createRows: Array<{
    hamsterId: string;
    recordDate: Date;
    weightG: number;
  }> = [];
  let skippedCount = 0;

  for (const row of importCandidates) {
    const key = `${row.hamsterId}:${row.recordDateInput}`;

    if (existingKeys.has(key) || csvKeys.has(key)) {
      skippedCount++;
      continue;
    }

    csvKeys.add(key);
    createRows.push({
      hamsterId: row.hamsterId,
      recordDate: row.recordDate,
      weightG: row.weightG
    });
  }

  const createResult =
    createRows.length > 0
      ? await prisma.weightRecord.createMany({
          data: createRows,
          skipDuplicates: true
        })
      : { count: 0 };

  skippedCount += createRows.length - createResult.count;

  revalidatePath("/");
  revalidatePath("/weights");

  return weightCsvImportState({
    successCount: createResult.count,
    skippedCount,
    errors,
    message: "CSVインポートが完了しました。"
  });
}
