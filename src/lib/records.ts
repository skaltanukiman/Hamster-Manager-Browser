import type {
  HealthAmountCondition,
  HealthExcretionCondition,
  HealthOverallCondition,
  HealthSymptom,
  HamsterRecordType,
  Prisma
} from "@prisma/client";

import { isValidDateInput } from "@/lib/date";
import type { HealthRecordInput, MedicalRecordInput, MemoryRecordInput } from "@/lib/record-schemas";
import { normalizeSearchText } from "@/lib/search";

export const RECORD_PAGE_SIZE = 20;

export const RECORD_TYPE_LABELS: Record<HamsterRecordType, string> = {
  HEALTH: "健康・体調",
  MEDICAL: "通院",
  MEMORY: "思い出"
};

export const HEALTH_OVERALL_LABELS: Record<HealthOverallCondition, string> = {
  GOOD: "良好",
  CONCERN: "少し気になる",
  WARNING: "要注意"
};

export const HEALTH_AMOUNT_LABELS: Record<HealthAmountCondition, string> = {
  NORMAL: "普通",
  LOW: "少ない",
  NONE: "なし・ほとんどない",
  UNKNOWN: "未確認"
};

export const HEALTH_EXCRETION_LABELS: Record<HealthExcretionCondition, string> = {
  NORMAL: "通常",
  LOW: "少ない",
  ABNORMAL: "異常あり",
  UNKNOWN: "未確認"
};

export const HEALTH_SYMPTOM_LABELS: Record<HealthSymptom, string> = {
  SNEEZING: "くしゃみ",
  RUNNY_NOSE: "鼻水",
  EYE_DISCHARGE: "目やに",
  HAIR_LOSS: "脱毛",
  BLEEDING: "出血",
  LUMP: "しこり",
  DIARRHEA: "軟便・下痢",
  UNSTEADY: "ふらつき",
  ABNORMAL_BREATHING: "呼吸の異常",
  LOSS_OF_APPETITE: "食欲低下",
  OTHER: "その他"
};

export const MEMORY_TAG_SUGGESTIONS = [
  "お迎え",
  "初めて",
  "日常",
  "かわいい行動",
  "寝姿",
  "食事",
  "遊び",
  "誕生日",
  "記念日"
] as const;

export type RecordTypeFilter = "all" | "health" | "medical" | "memory";

export function normalizeRecordTypeFilter(value?: string): RecordTypeFilter {
  return value === "health" || value === "medical" || value === "memory" ? value : "all";
}

export function filterToRecordType(value: RecordTypeFilter): HamsterRecordType | undefined {
  if (value === "health") return "HEALTH";
  if (value === "medical") return "MEDICAL";
  if (value === "memory") return "MEMORY";
  return undefined;
}

export function normalizeRecordPage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizeRecordDateFilter(value?: string) {
  return value && isValidDateInput(value) ? value : "";
}

export function normalizeRecordKeyword(value?: string) {
  return value?.trim().slice(0, 100) ?? "";
}

export type RecordSearchTerm = {
  value: string;
  isTag: boolean;
};

export function parseRecordSearchTerms(keyword: string): RecordSearchTerm[] {
  return keyword
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const normalizedPart = part.normalize("NFKC");
      const isTag = normalizedPart.startsWith("#");
      return { value: (isTag ? normalizedPart.slice(1) : part).trim(), isTag };
    })
    .filter((term) => Boolean(term.value));
}

function toKatakana(value: string) {
  return value.replace(/[\u3041-\u3096]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x60)
  );
}

export function getRecordSearchVariants(value: string) {
  const original = value.trim().toLocaleLowerCase("ja-JP");
  const nfkc = original.normalize("NFKC");
  const hiragana = normalizeSearchText(original);
  return Array.from(new Set([original, nfkc, hiragana, toKatakana(hiragana)].filter(Boolean)));
}

export function buildRecordKeywordWhere(keyword: string): Prisma.HamsterRecordWhereInput | undefined {
  const terms = parseRecordSearchTerms(keyword);
  const keywordConditions = terms
    .filter((term) => !term.isTag)
    .flatMap<Prisma.HamsterRecordWhereInput>((term) =>
      getRecordSearchVariants(term.value).map((variant) => ({
        searchText: { contains: variant, mode: "insensitive" }
      }))
    );
  const tagConditions = terms
    .filter((term) => term.isTag)
    .flatMap<Prisma.HamsterRecordWhereInput>((term) =>
      getRecordSearchVariants(term.value).map((variant) => ({
        recordType: "MEMORY",
        memoryDetail: { is: { tags: { has: variant } } }
      }))
    );
  const groups = [keywordConditions, tagConditions]
    .filter((conditions) => conditions.length > 0)
    .map<Prisma.HamsterRecordWhereInput>((conditions) => ({ OR: conditions }));

  if (groups.length === 0) return undefined;
  return groups.length === 1 ? groups[0] : { AND: groups };
}

export function collectRecordTagSuggestions(rows: ReadonlyArray<{ tags: string[] }>) {
  const tagsByNormalizedValue = new Map<string, string>();
  for (const { tags } of rows) {
    for (const tag of tags) {
      const normalized = normalizeSearchText(tag);
      if (normalized && !tagsByNormalizedValue.has(normalized)) tagsByNormalizedValue.set(normalized, tag);
    }
  }
  return Array.from(tagsByNormalizedValue.values()).sort((left, right) => left.localeCompare(right, "ja"));
}

export function buildSavedMemoryTagRows(householdId: string, createdByUserId: string, tags: readonly string[]) {
  return tags.map((name) => ({
    householdId,
    createdByUserId,
    name,
    normalizedName: normalizeSearchText(name)
  }));
}

export function buildHealthRecordTitle(overallCondition: HealthOverallCondition) {
  return `体調: ${HEALTH_OVERALL_LABELS[overallCondition]}`;
}

export function buildMedicalRecordTitle(hospitalName: string | null) {
  return hospitalName ? `通院: ${hospitalName}` : "通院記録";
}

function joinSearchText(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).join("\n").toLocaleLowerCase("ja-JP");
}

export function buildHealthSearchText(input: HealthRecordInput) {
  return joinSearchText([
    buildHealthRecordTitle(input.overallCondition),
    input.memo,
    ...input.symptoms.map((symptom) => HEALTH_SYMPTOM_LABELS[symptom])
  ]);
}

export function buildMedicalSearchText(input: MedicalRecordInput) {
  return joinSearchText([
    buildMedicalRecordTitle(input.hospitalName),
    input.hospitalName,
    input.reason,
    input.diagnosis,
    input.examination,
    input.treatment,
    input.medication,
    input.medicationInstructions,
    input.memo
  ]);
}

export function buildMemorySearchText(input: MemoryRecordInput) {
  return joinSearchText([input.title, input.content]);
}
