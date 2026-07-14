import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupInvitations,
  EXPIRED_INVITATION_RETENTION_DAYS,
  invitationCleanupWhere,
  USED_INVITATION_RETENTION_DAYS
} from "../src/lib/invitation-cleanup";

test("使用済み90日・未使用（無効化済みを含む）期限切れ30日より古い招待だけを削除条件にする", () => {
  const now = new Date("2026-07-13T00:00:00.000Z");
  const where = invitationCleanupWhere(now);

  assert.equal(USED_INVITATION_RETENTION_DAYS, 90);
  assert.equal(EXPIRED_INVITATION_RETENTION_DAYS, 30);
  assert.deepEqual(where, {
    OR: [
      { acceptedAt: { lt: new Date("2026-04-14T00:00:00.000Z") } },
      { acceptedAt: null, expiresAt: { lt: new Date("2026-06-13T00:00:00.000Z") } }
    ]
  });
});

test("クリーンアップ処理は計算した条件をdeleteManyへ渡す", async () => {
  const now = new Date("2026-07-13T00:00:00.000Z");
  let receivedWhere: unknown;
  const result = await cleanupInvitations(async ({ where }) => {
    receivedWhere = where;
    return { count: 3 };
  }, now);

  assert.deepEqual(receivedWhere, invitationCleanupWhere(now));
  assert.equal(result.count, 3);
});
