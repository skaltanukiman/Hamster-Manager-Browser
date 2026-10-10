import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RecordDeleteControl } from "../src/components/record-delete-control";

test("削除メニューは初期状態で閉じ、PCボタンとモバイルトリガーを分ける", () => {
  const markup = renderToStaticMarkup(
    <RecordDeleteControl title="通院: はむ病院" action={() => {}} onSubmit={() => {}}>
      <input type="hidden" name="id" value="record-1" />
    </RecordDeleteControl>
  );
  assert.match(markup, /aria-label="通院: はむ病院の操作メニュー"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-haspopup="menu"/);
  assert.match(markup, /name="id" value="record-1"/);
  assert.match(markup, /sm:inline-flex/);
  assert.match(markup, /sm:hidden/);
  assert.doesNotMatch(markup, /role="menuitem"/);
});

test("全記録の共通削除は既存の確認・権限条件と送信値を引き継ぐ", () => {
  const timeline = readFileSync("src/components/record-timeline.tsx", "utf8");
  assert.match(timeline, /const editable = canEdit && \(record.recordType === "MEMORY" \|\| record.hamster.isActive\)/);
  assert.match(timeline, /editable \? \(/);
  assert.match(timeline, /<RecordDeleteControl title=\{record.recordType === "HEALTH" \? "体調記録" : record.title\} action=\{deleteHamsterRecord\} onSubmit=\{confirmDelete\}>/);
  assert.match(timeline, /window.confirm\("この記録を削除します。元に戻せません。よろしいですか？"\)/);
  for (const field of ["id", "hamsterId", "viewScope", "returnHamsterId"]) {
    assert.match(timeline, new RegExp('name="' + field + '"'));
  }
});

test("思い出の削除も44pxの共通トリガーを使い、全種別のタイトルと日付は次の行へ配置する", () => {
  const markup = renderToStaticMarkup(
    <RecordDeleteControl title="長い思い出タイトル" action={() => {}} onSubmit={() => {}}>
      <input type="hidden" name="id" value="memory-1" />
      <input type="hidden" name="hamsterId" value="representative" />
      <input type="hidden" name="viewScope" value="household" />
      <input type="hidden" name="returnHamsterId" value="selected" />
    </RecordDeleteControl>
  );
  assert.match(markup, /aria-label="長い思い出タイトルの操作メニュー"/);
  assert.match(markup, /h-11 w-11/);
  assert.match(markup, /bg-transparent/);
  for (const [name, value] of [["id", "memory-1"], ["hamsterId", "representative"], ["viewScope", "household"], ["returnHamsterId", "selected"]]) {
    assert.ok(markup.includes('name="' + name + '" value="' + value + '"'));
  }
  const timeline = readFileSync("src/components/record-timeline.tsx", "utf8");
  assert.doesNotMatch(timeline, /hasSummaryHeader|<form action={deleteHamsterRecord}/);
  assert.ok(timeline.includes("col-span-2 row-start-2 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"));
  assert.ok(timeline.includes("col-span-2 row-start-3 min-w-0"));
  assert.ok(timeline.includes('record.recordType !== "MEDICAL" ? "min-w-0 max-w-full"'));
  assert.ok(timeline.includes("record.memoryDetail?.isFavorite"));
  assert.ok(timeline.includes("[&>form]:self-start"));
});
