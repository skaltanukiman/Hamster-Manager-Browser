import assert from "node:assert/strict";
import { File } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  canServeRecordImage,
  commitWithNewRecordImage,
  deleteRecordImage,
  prepareRecordImage,
  readRecordImage,
  RecordImageError
} from "../src/lib/record-image";
import {
  createHealthRecordSchema,
  createMedicalRecordSchema,
  createMemoryRecordSchema
} from "../src/lib/record-schemas";
import {
  buildHealthSearchText,
  buildMedicalSearchText,
  buildMemorySearchText,
  buildRecordKeywordWhere,
  collectRecordTagSuggestions,
  filterToRecordType,
  getRecordSearchVariants,
  parseRecordSearchTerms,
  normalizeRecordTypeFilter,
  RECORD_PAGE_SIZE
} from "../src/lib/records";

const projectRoot = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const validHealth = {
  hamsterId: "hamster-1",
  recordDate: "2026-07-15",
  overallCondition: "GOOD",
  appetite: "NORMAL",
  activityLevel: "NORMAL",
  stoolCondition: "NORMAL",
  urineCondition: "NORMAL",
  symptoms: ["SNEEZING"],
  memo: "少しくしゃみ"
};

const validMedical = {
  hamsterId: "hamster-1",
  recordDate: "2026-07-15",
  hospitalName: "しろ動物病院",
  reason: "食欲が少ない",
  diagnosis: "経過観察",
  examination: "触診",
  treatment: "補液",
  medication: "整腸剤",
  medicationInstructions: "朝1回",
  nextVisitDate: "2026-07-20",
  consultationFee: "3500",
  memo: ""
};

test("健康記録は必須項目・enum・文字数を検証する", () => {
  assert.equal(createHealthRecordSchema.safeParse(validHealth).success, true);
  assert.equal(createHealthRecordSchema.safeParse({ ...validHealth, hamsterId: "" }).success, false);
  assert.equal(createHealthRecordSchema.safeParse({ ...validHealth, recordDate: "2026-02-30" }).success, false);
  assert.equal(createHealthRecordSchema.safeParse({ ...validHealth, appetite: "INVALID" }).success, false);
  assert.equal(createHealthRecordSchema.safeParse({ ...validHealth, memo: "x".repeat(2001) }).success, false);
  assert.equal(createHealthRecordSchema.safeParse({ ...validHealth, symptoms: ["INVALID"] }).success, false);
});

test("通院記録は理由だけを内容必須とし、診察費は0以上の整数に限定する", () => {
  const parsed = createMedicalRecordSchema.safeParse(validMedical);
  assert.equal(parsed.success, true);
  assert.equal(createMedicalRecordSchema.safeParse({ ...validMedical, reason: "" }).success, false);
  assert.equal(createMedicalRecordSchema.safeParse({ ...validMedical, hospitalName: "", diagnosis: "", medication: "" }).success, true);
  for (const consultationFee of ["-1", "1.5", "abc", "100000000"]) {
    assert.equal(createMedicalRecordSchema.safeParse({ ...validMedical, consultationFee }).success, false);
  }
  assert.equal(parsed.success && parsed.data.nextVisitDate?.toISOString(), "2026-07-20T00:00:00.000Z");
});

test("思い出記録はタイトル・内容を必須にし、自由タグを正規化する", () => {
  const parsed = createMemoryRecordSchema.safeParse({
    hamsterId: "hamster-1",
    recordDate: "2026-07-15",
    title: "初めて手の上で寝た",
    content: "静かに眠ってくれた。",
    tags: "初めて、日常, 初めて",
    isFavorite: "true"
  });
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.success && parsed.data.tags, ["初めて", "日常"]);
  assert.equal(parsed.success && parsed.data.isFavorite, true);
  assert.equal(createMemoryRecordSchema.safeParse({ hamsterId: "h", recordDate: "2026-07-15", title: "", content: "本文", tags: "", isFavorite: "false" }).success, false);
});

test("検索用テキストへ症状・診断・薬・内容・タグを含める", () => {
  const health = createHealthRecordSchema.parse(validHealth);
  const medical = createMedicalRecordSchema.parse(validMedical);
  const memory = createMemoryRecordSchema.parse({ hamsterId: "h", recordDate: "2026-07-15", title: "誕生日", content: "ひまわりの種", tags: "記念日、食事", isFavorite: "false" });
  assert.match(buildHealthSearchText(health), /くしゃみ/);
  assert.match(buildMedicalSearchText(medical), /経過観察/);
  assert.match(buildMedicalSearchText(medical), /整腸剤/);
  assert.match(buildMemorySearchText(memory), /ひまわりの種/);
  assert.match(buildMemorySearchText(memory), /記念日/);
});

test("カンマ区切りのキーワードと#タグをかな表記差を吸収したOR条件へ変換する", () => {
  assert.deepEqual(parseRecordSearchTerms("はちみつ, 手に乗った, #初めて"), [
    { value: "はちみつ", isTag: false },
    { value: "手に乗った", isTag: false },
    { value: "初めて", isTag: true }
  ]);
  assert.deepEqual(getRecordSearchVariants("ハチミツ"), ["ハチミツ", "はちみつ"]);
  const where = buildRecordKeywordWhere("ハチミツ,#ハジメテ");
  assert.ok(where?.OR);
  assert.deepEqual(where.OR, [
    { searchText: { contains: "ハチミツ", mode: "insensitive" } },
    { searchText: { contains: "はちみつ", mode: "insensitive" } },
    { recordType: "MEMORY", memoryDetail: { is: { tags: { has: "ハジメテ" } } } },
    { recordType: "MEMORY", memoryDetail: { is: { tags: { has: "はじめて" } } } }
  ]);
  assert.deepEqual(collectRecordTagSuggestions([{ tags: ["日常", "ハジメテ"] }, { tags: ["はじめて", "食事"] }]), ["ハジメテ", "食事", "日常"]);
});

test("種類フィルターと20件ページングを固定する", () => {
  assert.equal(normalizeRecordTypeFilter("health"), "health");
  assert.equal(normalizeRecordTypeFilter("unknown"), "all");
  assert.equal(filterToRecordType("medical"), "MEDICAL");
  assert.equal(filterToRecordType("all"), undefined);
  assert.equal(RECORD_PAGE_SIZE, 20);
});

test("共通タイムラインはHousehold内ハムスターだけを日付・作成日時・IDの順でDB取得する", () => {
  const query = source("src/lib/record-queries.ts");
  assert.match(query, /where:\s*{ householdId: context\.household\.id }/);
  assert.match(query, /recordDate: "desc"[\s\S]*createdAt: "desc"[\s\S]*id: "desc"/);
  assert.match(query, /buildRecordKeywordWhere\(filters\.keyword\)/);
  assert.match(query, /memoryRecordDetail\.findMany/);
  assert.match(query, /hamster: \{ householdId: context\.household\.id \}/);
  assert.match(query, /memoryDetail: \{ is: \{ isFavorite: true \} \}/);
  assert.match(query, /skip: \(currentPage - 1\) \* RECORD_PAGE_SIZE/);
  assert.match(query, /take: RECORD_PAGE_SIZE/);
});

test("更新Actionは未来日・Household所属・管理外制御とrevision同一トランザクションを維持する", () => {
  const actions = source("src/app/actions/records.ts");
  assert.match(actions, /isFutureDateInput\(result\.data\.recordDate\)/);
  assert.match(actions, /where: \{ id: hamsterId, householdId \}/);
  assert.match(actions, /where: \{ id, hamsterId, hamster: \{ householdId \} \}/);
  assert.match(actions, /if \(!allowInactive && !hamster\.isActive\)/);
  assert.match(actions, /record\.recordType !== "MEMORY" && !record\.hamster\.isActive/);
  assert.match(actions, /commitHouseholdMutation\(/);
  assert.match(actions, /source: "record"/);
  assert.match(actions, /publishHouseholdChangeSafely\(change\)/);
});

test("Prismaは親・種類別詳細・画像を分離し、Cascadeと検索索引を持つ", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260715120000_add_hamster_records/migration.sql");
  for (const model of ["HamsterRecord", "HealthRecordDetail", "MedicalVisitDetail", "MemoryRecordDetail", "MemoryRecordImage"]) {
    assert.match(schema, new RegExp(`model ${model}`));
  }
  assert.match(schema, /memoryRecord\s+MemoryRecordDetail[\s\S]*onDelete: Cascade/);
  assert.match(migration, /gin_trgm_ops/);
});

async function pngFile() {
  const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: "orange" } }).png().toBuffer();
  return new File([buffer], "memory.png", { type: "image/png" });
}

test("思い出画像は変換・Household分離・保存失敗時の後片付けに対応する", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "record-image-"));
  const image = await prepareRecordImage(await pngFile());
  try {
    const stored = await commitWithNewRecordImage({ householdId: "household-1", image, rootDir: root, commit: async (fileName) => fileName });
    assert.equal(stored, image.fileName);
    assert.deepEqual(await readRecordImage("household-1", image.fileName, root), image.buffer);
    assert.equal(canServeRecordImage({ currentHouseholdId: "household-1", hamsterHouseholdId: "household-1", fileName: image.fileName }), true);
    assert.equal(canServeRecordImage({ currentHouseholdId: "household-2", hamsterHouseholdId: "household-1", fileName: image.fileName }), false);
    await deleteRecordImage("household-1", image.fileName, root);

    const rollbackImage = await prepareRecordImage(await pngFile());
    await assert.rejects(commitWithNewRecordImage({ householdId: "household-1", image: rollbackImage, rootDir: root, commit: async () => { throw new Error("DB failed"); } }), /DB failed/);
    await assert.rejects(readRecordImage("household-1", rollbackImage.fileName, root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("不正な思い出画像を拒否する", async () => {
  await assert.rejects(prepareRecordImage(new File(["GIF89a"], "memory.gif", { type: "image/gif" })), (error: unknown) => error instanceof RecordImageError && error.code === "unsupported");
});

test("記録フィルターは変更時に自動適用し、スクロール位置を維持する", () => {
  const page = source("src/app/records/page.tsx");
  const form = source("src/components/auto-submit-filter-form.tsx");
  assert.match(page, /<AutoSubmitFilterForm[\s\S]*?action="\/records"/);
  assert.match(page, /ignoreFieldNames=\{\["hamsterId"\]\}/);
  assert.doesNotMatch(page, />絞り込む<\/button>/);
  assert.match(form, /form\.requestSubmit\(\)/);
  assert.match(form, /scroll=\{false\}/);
});

test("記録画面はハムスターの空選択を表示せず、クリア時に絞り込み入力を初期化して再取得する", () => {
  const page = source("src/app/records/page.tsx");
  const selector = source("src/components/hamster-selector-input.tsx");
  const form = source("src/components/auto-submit-filter-form.tsx");
  assert.match(page, /<HamsterSelectorInput[\s\S]*?showEmptyOption=\{false\}/);
  assert.match(selector, /!allOptionLabel && showEmptyOption/);
  assert.match(page, /<FilterClearButton fieldNames=\{\["from", "to", "keyword", "favorite"\]\}/);
  assert.match(form, /control\.checked = false/);
  assert.match(form, /valueSetter\?\.call\(control, ""\)/);
  assert.match(form, /new Event\("input", \{ bubbles: true \}\)/);
  assert.match(form, /form\.requestSubmit\(\)/);
});

test("キーワード欄は#入力時に選択中ハムスターの使用済みタグ候補を表示する", () => {
  const page = source("src/app/records/page.tsx");
  const input = source("src/components/record-keyword-input.tsx");
  assert.match(page, /<RecordKeywordInput[\s\S]*?tagSuggestions=\{data\.tagSuggestions\}/);
  assert.match(input, /segment\.startsWith\("#"\)/);
  assert.match(input, /normalizeSearchText\(tag\)\.includes\(normalizedQuery\)/);
  assert.match(input, /selectTag\(tag, event\.currentTarget\.form\)/);
});
