import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";

import { transports } from "winston";

import { HOUSEHOLD_AUDIT_EVENTS, writeHouseholdAuditLog } from "../src/lib/audit-log";
import { closeServerLogger, createServerLogger } from "../src/lib/logger";

test("Household管理操作の成功監査ログを識別可能な項目だけで記録する", async () => {
  assert.equal(HOUSEHOLD_AUDIT_EVENTS.invitationRevoked, "household_invitation_revoked");
  assert.equal(HOUSEHOLD_AUDIT_EVENTS.householdDeleted, "household_deleted");
  assert.equal(HOUSEHOLD_AUDIT_EVENTS.householdNameUpdated, "household_name_updated");
  assert.equal(HOUSEHOLD_AUDIT_EVENTS.memberLeft, "household_member_left");
  assert.equal(
    HOUSEHOLD_AUDIT_EVENTS.ownershipTransferredAndMemberLeft,
    "household_ownership_transferred_and_member_left"
  );
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });
  const logger = createServerLogger({ disableFile: true, consoleTransport: new transports.Stream({ stream }) });

  try {
    writeHouseholdAuditLog(HOUSEHOLD_AUDIT_EVENTS.memberRoleUpdated, {
      actorUserId: "actor-1",
      actorHouseholdRole: "OWNER",
      householdId: "household-1",
      targetMemberId: "member-1",
      targetUserId: "user-1",
      previousRole: "MEMBER",
      newRole: "ADMIN"
    }, logger);
    await closeServerLogger(logger);

    const line = JSON.parse(output.trim()) as Record<string, unknown>;
    assert.equal(line.level, "info");
    assert.equal(line.event, "household_member_role_updated");
    assert.equal(line.operation, "audit.household_member_role_updated");
    assert.deepEqual(line.context, {
      actorUserId: "actor-1",
      actorHouseholdRole: "OWNER",
      householdId: "household-1",
      targetMemberId: "member-1",
      targetUserId: "user-1",
      previousRole: "MEMBER",
      newRole: "ADMIN"
    });
    assert.doesNotMatch(output, /token|email|name/i);
  } finally {
    if (!logger.writableFinished) await closeServerLogger(logger);
  }
});

test("所有権移譲を伴う退出ログは以前の権限・移譲先・結果を記録し、機密情報を含めない", async () => {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });
  const logger = createServerLogger({ disableFile: true, consoleTransport: new transports.Stream({ stream }) });

  try {
    writeHouseholdAuditLog(
      HOUSEHOLD_AUDIT_EVENTS.ownershipTransferredAndMemberLeft,
      {
        actorUserId: "owner-1",
        householdId: "household-1",
        previousRole: "OWNER",
        transferTargetUserId: "member-1",
        transferTargetPreviousRole: "VIEWER",
        result: "success"
      },
      logger
    );
    await closeServerLogger(logger);

    const line = JSON.parse(output.trim()) as { context: Record<string, string> };
    assert.deepEqual(line.context, {
      actorUserId: "owner-1",
      householdId: "household-1",
      previousRole: "OWNER",
      transferTargetUserId: "member-1",
      transferTargetPreviousRole: "VIEWER",
      result: "success"
    });
    assert.doesNotMatch(output, /email|oauth|sessionToken|accessToken|refreshToken/i);
  } finally {
    if (!logger.writableFinished) await closeServerLogger(logger);
  }
});
