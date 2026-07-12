import assert from "node:assert/strict";
import test from "node:test";

import { createWeightRecordSchema, updateWeightRecordSchema } from "../src/lib/schemas";
import { parseWeightCsvImport } from "../src/lib/weight-csv-import";
import { isWeightInTenths } from "../src/lib/weight-rules";

test("体重は整数または0.1g単位だけを受け付ける", () => {
  assert.equal(isWeightInTenths(121), true);
  assert.equal(isWeightInTenths(121.1), true);
  assert.equal(isWeightInTenths(0.3), true);
  assert.equal(isWeightInTenths(121.11), false);
  assert.equal(isWeightInTenths(121.1111111), false);
});

test("通常登録と編集のschemaは0.1gより細かい値を拒否する", () => {
  const base = { hamsterId: "hamster-1", recordDate: "2026-07-12" };
  assert.equal(createWeightRecordSchema.safeParse({ ...base, weightG: "121.1" }).success, true);
  assert.equal(createWeightRecordSchema.safeParse({ ...base, weightG: "121.1111111" }).success, false);
  assert.equal(updateWeightRecordSchema.safeParse({ ...base, id: "weight-1", weightG: "121.11" }).success, false);
});

test("CSV取込は0.1gより細かい値を行エラーにする", () => {
  const csv = [
    "date,hamster,weight,unit",
    "2026/07/12,しろ,121.1,g",
    "2026/07/12,くろ,121.1111111,g"
  ].join("\n");
  const parsed = parseWeightCsvImport(csv, "2026-07-12");

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].weightG, 121.1);
  assert.equal(parsed.errors.length, 1);
  assert.match(parsed.errors[0].message, /0.1g単位/);
});
