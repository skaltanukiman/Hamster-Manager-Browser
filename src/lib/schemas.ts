import { z } from "zod";

import { MAX_DASHBOARD_BOARD_COUNT, MIN_DASHBOARD_BOARD_COUNT } from "@/lib/dashboard-settings";
import { parseDateInput } from "@/lib/date";

export const idSchema = z.string().min(1);

export const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

// 空文字のメモはDBへ空文字ではなくnullで保存し、未入力として扱いを統一する。
const nullableMemoSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().max(2000).nullable());

// 任意の日付入力は空欄ならnull、入力ありならDB保存用のDateへ正規化する。
const nullableDateInputSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return dateInputSchema.safeParse(trimmed).success ? parseDateInput(trimmed) : value;
}, z.date().nullable());

export const createHamsterSchema = z.object({
  name: z.string().trim().min(1).max(15),
  memo: nullableMemoSchema,
  birthDate: nullableDateInputSchema,
  adoptionDate: nullableDateInputSchema
});

export const updateHamsterSchema = createHamsterSchema.extend({
  id: idSchema
});

export const deleteHamsterSchema = z.object({
  id: idSchema
});

export const createWeightRecordSchema = z.object({
  hamsterId: idSchema,
  recordDate: dateInputSchema,
  weightG: z.coerce.number().positive().max(500)
});

export const updateWeightRecordSchema = createWeightRecordSchema.extend({
  id: idSchema
});

export const deleteWeightRecordSchema = z.object({
  id: idSchema,
  hamsterId: idSchema
});

export const cleaningMonthSchema = z.object({
  hamsterId: idSchema,
  yearMonth: yearMonthSchema
});

export const dashboardSettingsSchema = z.object({
  dashboardBoardCount: z.coerce.number().int().min(MIN_DASHBOARD_BOARD_COUNT).max(MAX_DASHBOARD_BOARD_COUNT),
  hamsterIds: z.array(idSchema)
});
