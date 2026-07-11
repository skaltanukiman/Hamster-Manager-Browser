import assert from "node:assert/strict";
import test from "node:test";

import {
  createRealtimeHealthState,
  getRealtimeRetryDelay,
  REALTIME_BASE_RETRY_MS,
  REALTIME_MAX_RETRY_MS,
  recordRealtimeFailure,
  recordRealtimeSuccess,
  shouldShowRealtimeWarning
} from "../src/lib/realtime-health";
import { parseWeightCsvImport } from "../src/lib/weight-csv-import";
import {
  getWeightCsvFileSizeError,
  MAX_WEIGHT_CSV_FILE_SIZE_BYTES
} from "../src/lib/weight-rules";

test("CSVの500g超過・未来日・不正値を行単位で拒否する", () => {
  const csv = [
    "date,hamster,weight,unit",
    "2026/07/10,しろ,501,g",
    "2026/07/12,しろ,120,g",
    "2026/07/10,しろ,abc,g",
    "2026/07/10,しろ,120,g"
  ].join("\n");
  const parsed = parseWeightCsvImport(csv, "2026-07-11");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].weightG, 120);
  assert.equal(parsed.errors.length, 3);
  assert.match(parsed.errors[0].message, /500g以下/);
  assert.match(parsed.errors[1].message, /未来日/);
  assert.match(parsed.errors[2].message, /数値/);
});

test("CSVファイルサイズ上限を処理開始前に判定する", () => {
  assert.equal(getWeightCsvFileSizeError(MAX_WEIGHT_CSV_FILE_SIZE_BYTES), null);
  assert.match(getWeightCsvFileSizeError(MAX_WEIGHT_CSV_FILE_SIZE_BYTES + 1) ?? "", /2MB以下/);
});

test("同期警告は連続失敗かつ一定時間経過後だけ表示し、回復時に解除する", () => {
  const startedAt = 1_000;
  let state = createRealtimeHealthState(startedAt);
  state = recordRealtimeFailure(state);
  state = recordRealtimeFailure(state);
  assert.equal(shouldShowRealtimeWarning(state, startedAt + 20_000), false);
  state = recordRealtimeFailure(state);
  assert.equal(shouldShowRealtimeWarning(state, startedAt + 11_999), false);
  assert.equal(shouldShowRealtimeWarning(state, startedAt + 12_000), true);
  state = recordRealtimeSuccess(state, startedAt + 12_001);
  assert.equal(shouldShowRealtimeWarning(state, startedAt + 30_000), false);
});

test("同期再試行間隔はバックオフし上限を超えない", () => {
  assert.equal(getRealtimeRetryDelay(0), REALTIME_BASE_RETRY_MS);
  assert.ok(getRealtimeRetryDelay(2) > getRealtimeRetryDelay(1));
  assert.equal(getRealtimeRetryDelay(100), REALTIME_MAX_RETRY_MS);
});
