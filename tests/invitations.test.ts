import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvitationUrl,
  createInvitationToken,
  getInvitationTokenFromHash,
  invitationAcceptanceFailure
} from "../src/lib/invitations";

test("招待トークンはクエリではなくURLフラグメントへ格納する", () => {
  const token = createInvitationToken();
  const inviteUrl = new URL(buildInvitationUrl("https://hamster.example", token));

  assert.equal(inviteUrl.pathname, "/invitations/accept");
  assert.equal(inviteUrl.search, "");
  assert.equal(inviteUrl.hash.startsWith("#token="), true);
  assert.equal(getInvitationTokenFromHash(inviteUrl.hash), token);
});

test("不正な招待トークンはURLフラグメントから受け取らない", () => {
  assert.equal(getInvitationTokenFromHash(""), null);
  assert.equal(getInvitationTokenFromHash("#token=short"), null);
  assert.equal(getInvitationTokenFromHash("#token=invalid%20token"), null);
});

test("有効な招待は参加でき、使用済み・期限切れ・無効化済みを区別する", () => {
  const now = new Date("2026-07-14T00:00:00.000Z");
  const active = { acceptedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + 1) };

  assert.equal(invitationAcceptanceFailure(active, now), null);
  assert.equal(invitationAcceptanceFailure({ ...active, acceptedAt: now }, now), "accepted");
  assert.equal(invitationAcceptanceFailure({ ...active, expiresAt: now }, now), "expired");
  assert.equal(invitationAcceptanceFailure({ ...active, revokedAt: now }, now), "revoked");
});
