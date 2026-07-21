import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHouseholdActivityCutoffDate,
  cleanupHouseholdActivities,
  getHouseholdActivityRetentionDays,
  householdActivityCleanupWhere,
  HOUSEHOLD_ACTIVITY_RETENTION_DAYS_ENV,
  HouseholdActivityRetentionConfigError
} from "../src/lib/household-activity-cleanup";

test("保持日数90日の削除基準日時を計算する", () => {
  const now = new Date("2026-07-22T12:34:56.789Z");

  assert.equal(
    calculateHouseholdActivityCutoffDate(now, 90).toISOString(),
    "2026-04-23T12:34:56.789Z"
  );
});

test("保持日数を別の値へ変更できる", () => {
  const now = new Date("2026-07-22T12:34:56.789Z");

  assert.equal(
    calculateHouseholdActivityCutoffDate(now, 30).toISOString(),
    "2026-06-22T12:34:56.789Z"
  );
});

test("削除条件は基準日時より古いcreatedAtだけを対象にする", () => {
  const cutoffDate = new Date("2026-04-23T12:34:56.789Z");

  assert.deepEqual(householdActivityCleanupWhere(cutoffDate), {
    createdAt: { lt: cutoffDate }
  });
});

test("基準日時と同時刻の履歴は削除条件に含まれない", () => {
  const cutoffDate = new Date("2026-04-23T12:34:56.789Z");
  const where = householdActivityCleanupWhere(cutoffDate) as { createdAt: { lt: Date } };
  const matchesDeleteCondition = (createdAt: Date) => createdAt < where.createdAt.lt;

  assert.equal(matchesDeleteCondition(new Date(cutoffDate.getTime() - 1)), true);
  assert.equal(matchesDeleteCondition(new Date(cutoffDate)), false);
});

test("正常な環境変数から保持日数を取得する", () => {
  assert.equal(getHouseholdActivityRetentionDays({ [HOUSEHOLD_ACTIVITY_RETENTION_DAYS_ENV]: "90" }), 90);
});

test("未設定の環境変数を拒否する", () => {
  assert.throws(() => getHouseholdActivityRetentionDays({}), HouseholdActivityRetentionConfigError);
});

for (const [label, value] of [
  ["0", "0"],
  ["負数", "-1"],
  ["小数", "1.5"],
  ["数値以外", "ninety"],
  ["空文字", ""]
] as const) {
  test(`${label}の環境変数を拒否する`, () => {
    assert.throws(
      () => getHouseholdActivityRetentionDays({ [HOUSEHOLD_ACTIVITY_RETENTION_DAYS_ENV]: value }),
      HouseholdActivityRetentionConfigError
    );
  });
}

test("前後に空白がある正の整数を取得する", () => {
  assert.equal(getHouseholdActivityRetentionDays({ [HOUSEHOLD_ACTIVITY_RETENTION_DAYS_ENV]: "  45 \t" }), 45);
});

test("クリーンアップ処理は生成した条件をdeleteManyへ渡す", async () => {
  const now = new Date("2026-07-22T12:34:56.789Z");
  const cutoffDate = calculateHouseholdActivityCutoffDate(now, 90);
  let receivedDeleteWhere: unknown;

  const result = await cleanupHouseholdActivities(
    {
      async count() {
        return 3;
      },
      async deleteMany({ where }) {
        receivedDeleteWhere = where;
        return { count: 2 };
      }
    },
    90,
    now
  );

  assert.deepEqual(receivedDeleteWhere, householdActivityCleanupWhere(cutoffDate));
  assert.deepEqual(result, { cutoffDate, targetCount: 3, deletedCount: 2 });
});

test("dry-runでは対象件数だけ取得して削除しない", async () => {
  let deleteCalled = false;

  const result = await cleanupHouseholdActivities(
    {
      async count() {
        return 4;
      },
      async deleteMany() {
        deleteCalled = true;
        return { count: 4 };
      }
    },
    90,
    new Date("2026-07-22T12:34:56.789Z"),
    { dryRun: true }
  );

  assert.equal(result.targetCount, 4);
  assert.equal(result.deletedCount, 0);
  assert.equal(deleteCalled, false);
});
