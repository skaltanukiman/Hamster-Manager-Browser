import { z } from "zod";

import { MAX_DASHBOARD_BOARD_COUNT, MIN_DASHBOARD_BOARD_COUNT } from "@/lib/dashboard-settings";

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

export const createHamsterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  memo: nullableMemoSchema
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
