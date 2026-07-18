import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("管理トップはユーザーと共有を新しい順で最大5件だけ取得する", async () => {
  const userSource = await readFile("src/lib/admin-users.ts", "utf8");
  const householdSource = await readFile("src/lib/admin-households.ts", "utf8");
  const pageSource = await readFile("src/app/admin/page.tsx", "utf8");

  assert.match(userSource, /getAdminUserPreview[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\][\s\S]*?take: 5/);
  assert.match(householdSource, /getAdminHouseholdPreview[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\][\s\S]*?take: 5/);
  assert.match(pageSource, /<AdminUserList users=\{users\} \/>/);
  assert.match(pageSource, /<AdminHouseholdList households=\{households\} \/>/);
  assert.match(pageSource, /すべてのユーザーを表示/);
  assert.match(pageSource, /すべての共有を表示/);
});

test("管理トップの集計はプレビュー配列長ではなく独立countを使う", async () => {
  const source = await readFile("src/app/admin/page.tsx", "utf8");

  assert.match(source, /prisma\.user\.count\(\)/);
  assert.match(source, /prisma\.household\.count\(\)/);
  assert.match(source, /getActiveInvitationCount\(now\)/);
  assert.match(source, />\{userCount\}<\/p>/);
  assert.match(source, />\{householdCount\}<\/p>/);
  assert.doesNotMatch(source, />\{users\.length\}<\/p>/);
  assert.doesNotMatch(source, />\{households\.length\}<\/p>/);
});

test("招待検索候補と全招待有無は5件プレビューから独立して取得する", async () => {
  const source = await readFile("src/app/admin/page.tsx", "utf8");

  assert.match(source, /prisma\.household\.findMany\(\{[\s\S]*?select: \{ id: true, name: true \}/);
  assert.match(source, /findMatchingAdminInvitationHouseholdIds\([\s\S]*?invitationHouseholds/);
  assert.match(source, /options=\{invitationHouseholds\}/);
  assert.match(source, /prisma\.householdInvitation\.count\(\)/);
  assert.match(source, /hasAnyInvitations: invitationCount > 0/);
  assert.doesNotMatch(source, /hasAnyInvitations: households\.some/);
});
