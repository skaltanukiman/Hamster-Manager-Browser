import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ハムスター一覧は体重履歴と同じページ番号式UIを上下に表示する", async () => {
  const listSource = await readFile("src/components/hamster-list.tsx", "utf8");
  const paginationSource = await readFile("src/components/client-pagination.tsx", "utf8");

  assert.equal(listSource.match(/<ClientPagination/g)?.length, 2);
  assert.match(listSource, /const HAMSTER_LIST_PAGE_SIZE = 20/);
  assert.match(listSource, /function handlePageChange\(page: number\)[\s\S]*?resetDeleteSelection\(\)/);
  assert.doesNotMatch(listSource, /ChevronsLeft|ChevronsRight|最初へ|最後へ/);
  assert.match(paginationSource, /getPaginationItems/);
  assert.match(paginationSource, /aria-current="page"/);
  assert.match(paginationSource, /aria-label=\{`\$\{item\}ページへ`\}/);
});

test("ハムスター一覧ページングはモバイルとデスクトップ表示を切り替える", async () => {
  const source = await readFile("src/components/client-pagination.tsx", "utf8");

  assert.match(source, /grid min-w-0 grid-cols-3 items-center gap-1 sm:hidden/);
  assert.match(source, /hidden items-center gap-0\.5 sm:flex/);
  assert.match(source, /disabled=\{previousDisabled\}/);
  assert.match(source, /disabled=\{nextDisabled\}/);
  assert.match(source, /focus-visible:ring-2/);
});
