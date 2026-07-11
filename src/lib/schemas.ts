import { z } from "zod";

import { HAMSTER_SELECTOR_MODES, MAX_DASHBOARD_BOARD_COUNT, MIN_DASHBOARD_BOARD_COUNT } from "@/lib/dashboard-settings";
import { parseDateInput, todayInputJst } from "@/lib/date";
import { MAX_WEIGHT_G } from "@/lib/weight-rules";

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

// 誕生日・お迎え日はプロフィールの日付なので、ブラウザ制限を迂回した未来日の送信も保存前に弾く。
const nullablePastOrTodayDateInputSchema = nullableDateInputSchema.refine(
  (value) => value === null || value.getTime() <= parseDateInput(todayInputJst()).getTime(),
  { message: "future" }
);

export const createHamsterSchema = z.object({
  name: z.string().trim().min(1).max(15),
  memo: nullableMemoSchema,
  birthDate: nullablePastOrTodayDateInputSchema,
  adoptionDate: nullablePastOrTodayDateInputSchema
});

export const updateHamsterSchema = createHamsterSchema.extend({
  id: idSchema
});

export const deleteHamsterSchema = z.object({
  id: idSchema
});

export const deleteHamstersSchema = z.object({
  ids: z.array(idSchema).min(1)
});

export const updateHamsterActiveStatusSchema = z.object({
  id: idSchema,
  isActive: z.enum(["true", "false"]).transform((value) => value === "true")
});

export const createWeightRecordSchema = z.object({
  hamsterId: idSchema,
  recordDate: dateInputSchema,
  weightG: z.coerce.number().positive().max(MAX_WEIGHT_G)
});

export const updateWeightRecordSchema = createWeightRecordSchema.extend({
  id: idSchema
});

export const deleteWeightRecordSchema = z.object({
  id: idSchema,
  hamsterId: idSchema
});

export const deleteWeightRecordsSchema = z.object({
  ids: z.array(idSchema).min(1),
  hamsterId: idSchema
});

export const cleaningMonthSchema = z.object({
  hamsterId: idSchema,
  yearMonth: yearMonthSchema
});

export const dashboardSettingsSchema = z.object({
  dashboardBoardCount: z.coerce.number().int().min(MIN_DASHBOARD_BOARD_COUNT).max(MAX_DASHBOARD_BOARD_COUNT),
  hamsterSelectorMode: z.enum(HAMSTER_SELECTOR_MODES),
  hamsterIds: z.array(idSchema)
});

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(1).max(50)
});
