import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Prisma } from "@prisma/client";

import {
  ACTOR_NAME_FALLBACK,
  activityActorName,
  formatHouseholdActivity,
  parseActivityCategory,
  parseActivityPage,
  type HouseholdActivityListItem
} from "../src/lib/household-activity";
import { commitHouseholdMutation, type TransactionExecutor } from "../src/lib/realtime";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

function item(overrides: Partial<HouseholdActivityListItem> = {}): HouseholdActivityListItem {
  return {
    id: "activity-1",
    actorNameSnapshot: "林 勇希",
    eventType: "HAMSTER_CREATED",
    category: "CARE_RECORD",
    targetNameSnapshot: "きなこ",
    details: null,
    createdAt: new Date("2026-07-21T03:00:00.000Z"),
    ...overrides
  };
}

test("表示名snapshotはメールを使わず、未設定時は安全な名称にする", () => {
  assert.equal(activityActorName({ name: " 林 勇希 " }), "林 勇希");
  assert.equal(activityActorName({ name: null }), ACTOR_NAME_FALLBACK);
  assert.equal(activityActorName({ name: "" }), ACTOR_NAME_FALLBACK);
});

test("主要イベントを日本語表示へ集約し、不正detailsでも例外にしない", () => {
  assert.deepEqual(formatHouseholdActivity(item()), { summary: "林 勇希さんが「きなこ」を登録しました", detail: null });
  assert.equal(formatHouseholdActivity(item({ eventType: "HAMSTER_DELETED" })).summary, "林 勇希さんが「きなこ」を削除しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "HOUSEHOLD_NAME_UPDATED" })).summary, "林 勇希さんが共有グループ名を変更しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "INVITATION_CREATED" })).summary, "林 勇希さんが招待リンクを作成しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "INVITATION_REVOKED" })).summary, "林 勇希さんが招待リンクを無効化しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "MEMBER_JOINED" })).summary, "林 勇希さんが共有グループに参加しました");
  assert.deepEqual(formatHouseholdActivity(item({ eventType: "MEMBER_ROLE_UPDATED", targetNameSnapshot: "山田", details: { previousRole: "MEMBER", newRole: "ADMIN" } })), { summary: "林 勇希さんが山田さんの権限を変更しました", detail: "メンバー → 管理者" });
  assert.equal(formatHouseholdActivity(item({ eventType: "MEMBER_REMOVED", targetNameSnapshot: "山田" })).summary, "林 勇希さんが山田さんの参加を解除しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "MEMBER_LEFT" })).summary, "林 勇希さんが共有グループから退出しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "OWNERSHIP_TRANSFERRED_AND_LEFT", targetNameSnapshot: "山田" })).summary, "林 勇希さんが山田さんへ所有権を移譲して退出しました");
  assert.deepEqual(formatHouseholdActivity(item({ eventType: "WEIGHT_CREATED", details: { recordDate: "2026-07-21", weightG: 128.4 } })), { summary: "林 勇希さんが「きなこ」の体重を記録しました", detail: "128.4g・2026年7月21日" });
  assert.deepEqual(formatHouseholdActivity(item({ eventType: "WEIGHT_UPDATED", details: { previousWeightG: 127.8, newWeightG: 128.4 } })), { summary: "林 勇希さんが「きなこ」の体重を更新しました", detail: "127.8g → 128.4g" });
  assert.equal(formatHouseholdActivity(item({ eventType: "WEIGHT_DELETED", details: "invalid" })).detail, null);
  assert.equal(formatHouseholdActivity(item({ eventType: "WEIGHTS_BULK_DELETED", details: { count: 3 } })).summary, "林 勇希さんが体重記録を3件削除しました");
  assert.equal(formatHouseholdActivity(item({ eventType: "WEIGHT_CSV_APP_IMPORTED", details: { createdCount: 10, updatedCount: 4, skippedCount: 2 } })).detail, "新規10件・更新4件・スキップ2件");
  assert.equal(formatHouseholdActivity(item({ eventType: "WEIGHT_CSV_GAS_IMPORTED", details: { createdCount: 2, updatedCount: 0, skippedCount: 1 } })).detail, "新規2件・更新0件・スキップ1件");
  assert.equal(formatHouseholdActivity(item({ eventType: "CLEANING_MONTH_SAVED", details: { yearMonth: "2026-07", changedDayCount: 3 } })).detail, "2026年7月・3日分");
});

test("不正なカテゴリーとページ番号は安全な既定値へ補正する", () => {
  assert.equal(parseActivityCategory("CARE_RECORD"), "CARE_RECORD");
  assert.equal(parseActivityCategory("invalid"), null);
  assert.equal(parseActivityPage("3"), 3);
  assert.equal(parseActivityPage("0"), 1);
  assert.equal(parseActivityPage("-1"), 1);
  assert.equal(parseActivityPage("abc"), 1);
});

test("業務更新・履歴・revisionは同じtransactionで確定し、履歴失敗時はrollbackする", async () => {
  const database = { value: 0, revision: 0, activities: 0, failActivity: false };
  const execute: TransactionExecutor = async (operation) => {
    const snapshot = { ...database };
    const tx = {
      householdActivity: { create: async () => {
        if (database.failActivity) throw new Error("activity failed");
        database.activities += 1;
        return { id: "activity-1" };
      } },
      household: { update: async () => {
        database.revision += 1;
        return { realtimeRevision: BigInt(database.revision) };
      } }
    } as unknown as Prisma.TransactionClient;
    try {
      return await operation(tx);
    } catch (error) {
      Object.assign(database, snapshot);
      throw error;
    }
  };

  await commitHouseholdMutation({ householdId: "household-1", source: "weight", actorUserId: "user-1", actorNameSnapshot: "林 勇希", mutate: async () => { database.value += 1; }, activity: { eventType: "WEIGHT_CREATED", category: "CARE_RECORD" } }, execute);
  assert.deepEqual(database, { value: 1, revision: 1, activities: 1, failActivity: false });

  await assert.rejects(commitHouseholdMutation({
    householdId: "household-1",
    source: "weight",
    actorUserId: "user-1",
    mutate: async () => { throw new Error("mutation failed"); },
    activity: { eventType: "WEIGHT_CREATED", category: "CARE_RECORD" }
  }, execute), /mutation failed/);
  assert.deepEqual(database, { value: 1, revision: 1, activities: 1, failActivity: false });

  database.failActivity = true;
  await assert.rejects(commitHouseholdMutation({ householdId: "household-1", source: "weight", actorUserId: "user-1", mutate: async () => { database.value += 1; }, activity: { eventType: "WEIGHT_CREATED", category: "CARE_RECORD" } }, execute), /activity failed/);
  assert.deepEqual(database, { value: 1, revision: 1, activities: 1, failActivity: true });
});

test("取得は現在所属HouseholdだけをDB側で絞り、安定順・20件ページング・最新5件を使う", () => {
  const queries = source("src/lib/household-activity-queries.ts");
  const membersPage = source("src/app/settings/members/page.tsx");
  assert.match(queries, /getRequiredHouseholdContext\(\)/);
  assert.match(queries, /householdId: context\.household\.id/);
  assert.match(queries, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(queries, /HOUSEHOLD_ACTIVITY_PAGE_SIZE/);
  assert.match(queries, /category: input\.category/);
  assert.match(queries, /take: Math\.min\(Math\.max\(limit, 1\), 5\)/);
  assert.match(membersPage, /HouseholdActivityList/);
});

test("履歴入力へ機密本文を渡さず、対象イベントだけを記録する", () => {
  const activity = source("src/lib/household-activity.ts");
  const weights = source("src/app/actions/weights.ts");
  const cleaning = source("src/app/actions/cleaning.ts");
  assert.doesNotMatch(activity, /tokenHash|inviteToken|email|csvFile|memo|Authorization|Cookie/i);
  assert.match(weights, /details: \{ createdCount: created\.count, updatedCount:/);
  assert.match(cleaning, /details: \{ yearMonth, changedDayCount \}/);
  assert.doesNotMatch(cleaning, /details: \{[^}]*memo/);
});

test("全対象Mutationが履歴イベントを持ち、変更なしではtransactionへ進まない", () => {
  const members = source("src/app/actions/members.ts");
  const hamsters = source("src/app/actions/hamsters.ts");
  const weights = source("src/app/actions/weights.ts");
  const cleaning = source("src/app/actions/cleaning.ts");
  const householdName = source("src/lib/household-name.ts");
  const invitations = source("src/lib/invitation-mutations.ts");
  const leave = source("src/lib/household-leave.ts");
  for (const event of ["MEMBER_JOINED", "MEMBER_ROLE_UPDATED", "MEMBER_REMOVED"]) assert.match(members, new RegExp(event));
  for (const event of ["HAMSTER_CREATED", "HAMSTER_DELETED"]) assert.match(hamsters, new RegExp(event));
  for (const event of ["WEIGHT_CREATED", "WEIGHT_UPDATED", "WEIGHT_DELETED", "WEIGHTS_BULK_DELETED", "WEIGHT_CSV_APP_IMPORTED", "WEIGHT_CSV_GAS_IMPORTED"]) assert.match(weights, new RegExp(event));
  assert.match(cleaning, /CLEANING_MONTH_SAVED/);
  assert.match(householdName, /HOUSEHOLD_NAME_UPDATED/);
  assert.match(invitations, /INVITATION_CREATED/);
  assert.match(invitations, /INVITATION_REVOKED/);
  assert.match(leave, /MEMBER_LEFT/);
  assert.match(leave, /OWNERSHIP_TRANSFERRED_AND_LEFT/);
  assert.match(weights, /weightRedirect\([^\n]+"unchanged"/);
  assert.match(weights, /changeCount > 0/);
  assert.match(cleaning, /operations\.length === 0/);
});

test("削除後もsnapshotを残すCascade・SetNull設計を持つ", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260721120000_add_household_activity_history/migration.sql");
  assert.match(schema, /actorNameSnapshot\s+String/);
  assert.match(schema, /targetNameSnapshot\s+String\?/);
  assert.match(schema, /onDelete: Cascade/);
  assert.match(schema, /HouseholdActivityActor[\s\S]*onDelete: SetNull/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.match(migration, /ON DELETE SET NULL/);
});
