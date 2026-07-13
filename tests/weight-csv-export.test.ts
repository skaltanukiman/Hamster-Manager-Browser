import assert from "node:assert/strict";
import test from "node:test";

import { toCsv } from "../src/lib/csv";
import {
  buildWeightCsvRows,
  DEFAULT_WEIGHT_CSV_DATA_COLUMNS,
  formatWeightCsvTimestamp,
  parseWeightCsvExportOptions,
  validateWeightCsvDataColumns,
  validateWeightCsvTimeZone,
  WeightCsvExportValidationError,
  type WeightCsvRecord
} from "../src/lib/weight-csv-export";

const record: WeightCsvRecord = {
  id: "weight-1",
  recordDate: new Date("2026-07-10T00:00:00.000Z"),
  weightG: 120,
  createdAt: new Date("2026-07-10T01:23:45.000Z"),
  updatedAt: new Date("2026-07-10T02:34:56.000Z"),
  hamster: { name: "しろ" }
};

test("初期状態では固定列に続けて全データ列を定義順で出力する", () => {
  const options = parseWeightCsvExportOptions(new URLSearchParams());
  assert.deepEqual(options.columns, DEFAULT_WEIGHT_CSV_DATA_COLUMNS);

  const rows = buildWeightCsvRows([record], options.columns, options.timeZone);
  assert.deepEqual(rows[0], [
    "app_id",
    "record_type",
    "schema_version",
    "record_id",
    "date",
    "hamster",
    "weight_g",
    "created_at",
    "updated_at"
  ]);
  assert.deepEqual(rows[1], [
    "hamster-manager-browser",
    "weight_record",
    "1",
    "weight-1",
    "2026-07-10",
    "しろ",
    120,
    "2026-07-10T01:23:45.000Z",
    "2026-07-10T02:34:56.000Z"
  ]);
  assert.equal(rows[0].length, rows[1].length);
});

test("選択したデータ列だけを画面の定義順で出力する", () => {
  const selected = validateWeightCsvDataColumns(["updated_at", "date"]);
  const rows = buildWeightCsvRows([record], selected, "UTC");

  assert.deepEqual(rows[0], ["app_id", "record_type", "schema_version", "record_id", "date", "updated_at"]);
  assert.deepEqual(rows[1], [
    "hamster-manager-browser",
    "weight_record",
    "1",
    "weight-1",
    "2026-07-10",
    "2026-07-10T02:34:56.000Z"
  ]);
});

test("UTCとJSTをISO 8601で出力し、同じ瞬間を9時間差の時刻で表す", () => {
  const utc = formatWeightCsvTimestamp(record.createdAt, "UTC");
  const jst = formatWeightCsvTimestamp(record.createdAt, "JST");

  assert.equal(utc, "2026-07-10T01:23:45.000Z");
  assert.equal(jst, "2026-07-10T10:23:45.000+09:00");
  assert.match(utc, /Z$/);
  assert.match(jst, /\+09:00$/);
  assert.equal(Number(jst.slice(11, 13)) - Number(utc.slice(11, 13)), 9);
});

test("測定日はUTCとJSTの選択で変化しない", () => {
  const utcRows = buildWeightCsvRows([record], ["date"], "UTC");
  const jstRows = buildWeightCsvRows([record], ["date"], "JST");

  assert.equal(utcRows[1][4], "2026-07-10");
  assert.equal(jstRows[1][4], "2026-07-10");
});

test("不正・未選択・重複したデータ列と不正なタイムゾーンを拒否する", () => {
  assert.throws(() => validateWeightCsvDataColumns(["unknown"]), WeightCsvExportValidationError);
  assert.throws(() => validateWeightCsvDataColumns([]), /1つ以上/);
  assert.throws(() => validateWeightCsvDataColumns([""]), /1つ以上/);
  assert.throws(() => validateWeightCsvDataColumns(["date", "date"]), /重複/);
  assert.throws(() => validateWeightCsvTimeZone("Asia/Tokyo"), WeightCsvExportValidationError);
});

test("ハムスター名のカンマ・改行・ダブルクォートをCSV仕様どおりエスケープする", () => {
  const specialRecord = { ...record, hamster: { name: "しろ,\n\"ちゃん\"" } };
  const csv = toCsv(buildWeightCsvRows([specialRecord], ["hamster"], "UTC"));

  assert.match(csv, /"しろ,\n""ちゃん"""/);
});
