import assert from "node:assert/strict";
import test from "node:test";

import {
  appRoleUpdateDenial,
  belongsToCurrentHousehold,
  canManageHouseholdInvitations,
  hasAuthenticatedUserId,
  memberRemovalDenial,
  memberRoleUpdateDenial
} from "../src/lib/authorization";

test("Server Actionは認証済みユーザーIDを必須とする", () => {
  assert.equal(hasAuthenticatedUserId(null), false);
  assert.equal(hasAuthenticatedUserId({}), false);
  assert.equal(hasAuthenticatedUserId({ id: "" }), false);
  assert.equal(hasAuthenticatedUserId({ id: "user-1" }), true);
});

test("Household外のリソースを操作対象として認めない", () => {
  assert.equal(belongsToCurrentHousehold("household-1", "household-1"), true);
  assert.equal(belongsToCurrentHousehold("household-2", "household-1"), false);
  assert.equal(belongsToCurrentHousehold(null, "household-1"), false);
});

test("招待発行はOWNERとADMINだけに許可する", () => {
  assert.equal(canManageHouseholdInvitations("OWNER"), true);
  assert.equal(canManageHouseholdInvitations("ADMIN"), true);
  assert.equal(canManageHouseholdInvitations("MEMBER"), false);
});

test("メンバー削除は自己削除・権限越え・最後のOWNER削除を拒否する", () => {
  const base = { actorUserId: "actor", targetUserId: "target", ownerCount: 2 } as const;
  assert.equal(memberRemovalDenial({ ...base, actorRole: "MEMBER", targetRole: "MEMBER" }), "forbidden");
  assert.equal(memberRemovalDenial({ ...base, actorRole: "OWNER", targetUserId: "actor", targetRole: "MEMBER" }), "cannotRemoveSelf");
  assert.equal(memberRemovalDenial({ ...base, actorRole: "ADMIN", targetRole: "ADMIN" }), "forbidden");
  assert.equal(memberRemovalDenial({ ...base, actorRole: "OWNER", targetRole: "OWNER", ownerCount: 1 }), "cannotRemoveLastOwner");
  assert.equal(memberRemovalDenial({ ...base, actorRole: "OWNER", targetRole: "MEMBER" }), null);
});

test("Household権限変更はOWNERだけに許可し、自己変更とOWNER変更を拒否する", () => {
  const base = { actorUserId: "actor", targetUserId: "target", currentRole: "MEMBER", newRole: "ADMIN" } as const;
  assert.equal(memberRoleUpdateDenial({ ...base, actorRole: "ADMIN" }), "forbidden");
  assert.equal(memberRoleUpdateDenial({ ...base, actorRole: "OWNER", targetUserId: "actor" }), "cannotChangeOwnHouseholdRole");
  assert.equal(memberRoleUpdateDenial({ ...base, actorRole: "OWNER", currentRole: "OWNER" }), "cannotChangeOwnerRole");
  assert.equal(memberRoleUpdateDenial({ ...base, actorRole: "OWNER" }), null);
});

test("アプリ権限変更はSUPER_ADMINだけに許可し、自己降格と最後のSUPER_ADMIN降格を拒否する", () => {
  const base = {
    actorUserId: "actor",
    targetUserId: "target",
    currentRole: "ADMIN",
    newRole: "USER",
    superAdminCount: 2
  } as const;
  assert.equal(appRoleUpdateDenial({ ...base, actorRole: "ADMIN" }), "forbidden");
  assert.equal(appRoleUpdateDenial({ ...base, actorRole: "SUPER_ADMIN" }), null);
  assert.equal(
    appRoleUpdateDenial({
      ...base,
      actorRole: "SUPER_ADMIN",
      targetUserId: "actor",
      currentRole: "SUPER_ADMIN",
      newRole: "ADMIN"
    }),
    "cannotChangeOwnRole"
  );
  assert.equal(
    appRoleUpdateDenial({ ...base, actorRole: "SUPER_ADMIN", currentRole: "SUPER_ADMIN", newRole: "ADMIN", superAdminCount: 1 }),
    "cannotRemoveLastSuperAdmin"
  );
});
