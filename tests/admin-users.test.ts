import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ADMIN_LIST_PAGE_SIZE, normalizeAdminPage } from "../src/lib/admin-pagination";
import {
  getAdminUserPage,
  normalizeAdminRoleReturnPath
} from "../src/lib/admin-users";

test("ユーザー管理ページ番号は不正値と0以下を1へ正規化する", () => {
  assert.equal(normalizeAdminPage(undefined), 1);
  assert.equal(normalizeAdminPage("0"), 1);
  assert.equal(normalizeAdminPage("-1"), 1);
  assert.equal(normalizeAdminPage("1.5"), 1);
  assert.equal(normalizeAdminPage("invalid"), 1);
  assert.equal(normalizeAdminPage("999999999999999999999"), 1);
  assert.equal(normalizeAdminPage(["3", "4"]), 3);
});

test("ユーザー一覧はcount後に範囲外ページを補正し20件だけDB取得する", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  const result = await getAdminUserPage(99, {
    count: async () => 45,
    findMany: async (args) => {
      findManyArgs = args;
      return [];
    }
  });

  assert.equal(ADMIN_LIST_PAGE_SIZE, 20);
  assert.deepEqual(result.pagination, { currentPage: 3, totalPages: 3, totalCount: 45, pageSize: 20 });
  assert.equal(findManyArgs?.skip, 40);
  assert.equal(findManyArgs?.take, 20);
  assert.deepEqual(findManyArgs?.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.ok(findManyArgs?.select);
});

test("ユーザー0件は1ページ目の空状態として扱う", async () => {
  const result = await getAdminUserPage(10, {
    count: async () => 0,
    findMany: async ({ skip, take }) => {
      assert.equal(skip, 0);
      assert.equal(take, 20);
      return [];
    }
  });

  assert.deepEqual(result.pagination, { currentPage: 1, totalPages: 1, totalCount: 0, pageSize: 20 });
});

test("権限変更の戻り先は管理画面内の許可パスだけを受け付ける", () => {
  assert.equal(normalizeAdminRoleReturnPath("/admin"), "/admin");
  assert.equal(normalizeAdminRoleReturnPath("/admin/users"), "/admin/users");
  assert.equal(normalizeAdminRoleReturnPath("https://example.com"), "/admin/users");
  assert.equal(normalizeAdminRoleReturnPath("//example.com"), "/admin/users");
  assert.equal(normalizeAdminRoleReturnPath(null), "/admin/users");
});

test("ユーザー管理画面は管理者認可、レスポンシブ一覧、権限変更の戻り先を備える", async () => {
  const pageSource = await readFile("src/app/admin/users/page.tsx", "utf8");
  const listSource = await readFile("src/components/admin-user-list.tsx", "utf8");
  const paginationSource = await readFile("src/components/admin-pagination.tsx", "utf8");
  const actionSource = await readFile("src/app/actions/admin.ts", "utf8");

  assert.match(pageSource, /getRequiredAppAdminUser\(\)/);
  assert.match(pageSource, /normalizeAdminPage\(params\.page\)/);
  assert.match(pageSource, /getAdminUserPage\(/);
  assert.match(pageSource, /<AdminPagination pathname="\/admin\/users"/);
  assert.match(paginationSource, /<AdminPaginationLayout/);
  assert.match(pageSource, /管理トップへ戻る/);
  assert.match(listSource, /hidden overflow-x-auto[\s\S]*?lg:block/);
  assert.match(listSource, /className="grid gap-3 lg:hidden"/);
  assert.match(listSource, /name="returnTo" value=\{returnPath\}/);
  assert.match(listSource, /sm:w-auto/);
  assert.match(actionSource, /pathname: returnPath/);

  for (const label of ["名前", "メールアドレス", "アプリ全体権限", "所属共有数", "セッション数", "作成日"]) {
    assert.equal(listSource.match(new RegExp(`>${label}<`, "g"))?.length, 2);
  }
});
