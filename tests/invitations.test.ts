import assert from "node:assert/strict";
import test from "node:test";

import { buildInvitationUrl, createInvitationToken, getInvitationTokenFromHash } from "../src/lib/invitations";

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
