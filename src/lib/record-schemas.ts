import { z } from "zod";

import { isValidDateInput, parseDateInput } from "@/lib/date";

const idSchema = z.string().trim().min(1);
const dateSchema = z.string().refine(isValidDateInput, "invalidDate");
const optionalDateSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.union([dateSchema.transform(parseDateInput), z.null()])
);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.union([z.string().trim().max(max), z.null()])
  );

export const HEALTH_OVERALL_CONDITIONS = ["GOOD", "CONCERN", "WARNING"] as const;
export const HEALTH_AMOUNT_CONDITIONS = ["NORMAL", "LOW", "NONE", "UNKNOWN"] as const;
export const HEALTH_EXCRETION_CONDITIONS = ["NORMAL", "LOW", "ABNORMAL", "UNKNOWN"] as const;
export const HEALTH_SYMPTOMS = [
  "SNEEZING",
  "RUNNY_NOSE",
  "EYE_DISCHARGE",
  "HAIR_LOSS",
  "BLEEDING",
  "LUMP",
  "DIARRHEA",
  "UNSTEADY",
  "ABNORMAL_BREATHING",
  "LOSS_OF_APPETITE",
  "OTHER"
] as const;

const healthBaseSchema = z.object({
  hamsterId: idSchema,
  recordDate: dateSchema,
  overallCondition: z.enum(HEALTH_OVERALL_CONDITIONS),
  appetite: z.enum(HEALTH_AMOUNT_CONDITIONS),
  activityLevel: z.enum(HEALTH_AMOUNT_CONDITIONS),
  stoolCondition: z.enum(HEALTH_EXCRETION_CONDITIONS),
  urineCondition: z.enum(HEALTH_EXCRETION_CONDITIONS),
  symptoms: z.array(z.enum(HEALTH_SYMPTOMS)).max(HEALTH_SYMPTOMS.length),
  memo: optionalText(2000)
});

export const createHealthRecordSchema = healthBaseSchema;
export const updateHealthRecordSchema = healthBaseSchema.extend({ id: idSchema });

const consultationFeeSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return Number.NaN;
    return Number(trimmed);
  }
  return value;
}, z.union([z.number().int().min(0).max(99_999_999), z.null()]));

const medicalBaseSchema = z.object({
  hamsterId: idSchema,
  recordDate: dateSchema,
  hospitalName: optionalText(120),
  reason: z.string().trim().min(1).max(2000),
  diagnosis: optionalText(2000),
  examination: optionalText(2000),
  treatment: optionalText(2000),
  medication: optionalText(2000),
  medicationInstructions: optionalText(2000),
  nextVisitDate: optionalDateSchema,
  consultationFee: consultationFeeSchema,
  memo: optionalText(2000)
});

export const createMedicalRecordSchema = medicalBaseSchema;
export const updateMedicalRecordSchema = medicalBaseSchema.extend({ id: idSchema });

function normalizeTags(value: unknown) {
  if (typeof value !== "string") return value;
  return [...new Set(value.split(/[、,]/).map((tag) => tag.trim()).filter(Boolean))];
}

const memoryBaseSchema = z.object({
  hamsterId: idSchema,
  recordDate: dateSchema,
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(5000),
  tags: z.preprocess(normalizeTags, z.array(z.string().min(1).max(30)).max(20)),
  isFavorite: z.preprocess((value) => value === "true" || value === "on", z.boolean())
});

export const createMemoryRecordSchema = memoryBaseSchema.extend({
  saveTags: z.preprocess((value) => value === "true" || value === "on", z.boolean())
});
export const updateMemoryRecordSchema = memoryBaseSchema.extend({ id: idSchema });

export const deleteHamsterRecordSchema = z.object({
  id: idSchema,
  hamsterId: idSchema
});

export type HealthRecordInput = z.infer<typeof healthBaseSchema>;
export type MedicalRecordInput = z.infer<typeof medicalBaseSchema>;
export type MemoryRecordInput = z.infer<typeof memoryBaseSchema>;
