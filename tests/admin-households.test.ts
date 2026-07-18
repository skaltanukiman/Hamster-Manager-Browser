import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getAdminHouseholdPage } from "../src/lib/admin-households";
import { normalizeAdminPage } from "../src/lib/admin-pagination";

test("共有管理ページ番号は不正値を安全に1へ正規化する", () => {
  for (const value of [undefined, "", "0", "-2", "2.5", "not-a-page"]) {
    assert.equal(normalizeAdminPage(value), 1);
  }
});

test("共有一覧はcount後に範囲外ページを補正しページ内20件だけDB取得する", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  const result = await getAdminHouseholdPage(999, {
    count: async () => 41,
    findMany: async (args) => {
      findManyArgs = args;
      return [];
    }
  });

  assert.deepEqual(result.pagination, { currentPage: 3, totalPages: 3, totalCount: 41, pageSize: 20 });
  assert.equal(findManyArgs?.skip, 40);
  assert.equal(findManyArgs?.take, 20);
  assert.deepEqual(findManyArgs?.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  const select = findManyArgs?.select as { members?: unknown } | undefined;
  assert.ok(select?.members, "ページ内共有と同じfindManyで必要なメンバーだけを取得する");
});

test("共有0件は1ページ目の空状態として扱う", async () => {
  const result = await getAdminHouseholdPage(5, {
    count: async () => 0,
    findMany: async ({ skip, take }) => {
      assert.equal(skip, 0);
      assert.equal(take, 20);
      return [];
    }
  });

  assert.equal(result.pagination.currentPage, 1);
  assert.equal(result.pagination.totalPages, 1);
  assert.equal(result.pagination.totalCount, 0);
});

test("共有管理画面は管理者認可、共有カード、共通ページングを備える", async () => {
  const pageSource = await readFile("src/app/admin/households/page.tsx", "utf8");
  const listSource = await readFile("src/components/admin-household-list.tsx", "utf8");
  const paginationSource = await readFile("src/components/admin-pagination.tsx", "utf8");

  assert.match(pageSource, /getRequiredAppAdminUser\(\)/);
  assert.match(pageSource, /getAdminHouseholdPage\(normalizeAdminPage\(params\.page\)\)/);
  assert.match(pageSource, /管理トップへ戻る/);
  assert.match(listSource, /household\._count\.members/);
  assert.match(listSource, /household\._count\.hamsters/);
  assert.match(listSource, /household\._count\.invitations/);
  assert.match(listSource, /HOUSEHOLD_ROLE_LABELS\[member\.role\]/);
  assert.match(listSource, /\[overflow-wrap:anywhere\]/);

  for (const label of ["最初へ", "前へ", "次へ", "最後へ"]) {
    assert.match(paginationSource, new RegExp(`label: "${label}"`));
  }
  assert.match(paginationSource, /aria-disabled="true"/);
});
