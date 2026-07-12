import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";

import { transports } from "winston";

import { HOUSEHOLD_AUDIT_EVENTS, writeHouseholdAuditLog } from "../src/lib/audit-log";
import { closeServerLogger, createServerLogger } from "../src/lib/logger";

test("Household管理操作の成功監査ログを識別可能な項目だけで記録する", async () => {
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
