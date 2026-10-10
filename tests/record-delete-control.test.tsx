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

test("通院削除にも既存の確認・権限条件と送信値を引き継ぐ", () => {
  const timeline = readFileSync("src/components/record-timeline.tsx", "utf8");
  assert.match(timeline, /const editable = canEdit && \(record.recordType === "MEMORY" \|\| record.hamster.isActive\)/);
  assert.match(timeline, /editable \? hasSummaryHeader \? \(/);
  assert.match(timeline, /<RecordDeleteControl title=\{record.recordType === "HEALTH" \? "体調記録" : record.title\} action=\{deleteHamsterRecord\} onSubmit=\{confirmDelete\}>/);
  assert.match(timeline, /window.confirm\("この記録を削除します。元に戻せません。よろしいですか？"\)/);
  for (const field of ["id", "hamsterId", "viewScope", "returnHamsterId"]) {
    assert.match(timeline, new RegExp('name="' + field + '"'));
  }
});
