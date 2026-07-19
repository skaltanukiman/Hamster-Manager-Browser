import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEFAULT_HAMSTER_SELECTOR_MODE, normalizeHamsterSelectorMode } from "../src/lib/dashboard-settings";

const dashboardSettingsFormSource = readFileSync(
  new URL("../src/components/dashboard-settings-form.tsx", import.meta.url),
  "utf8"
);

test("ハムスター選択方式はコンボボックス式とプルダウン式を維持する", () => {
  assert.equal(normalizeHamsterSelectorMode("combobox"), "combobox");
  assert.equal(normalizeHamsterSelectorMode("select"), "select");
});

test("不正または未設定のハムスター選択方式は既定値に戻す", () => {
  assert.equal(normalizeHamsterSelectorMode("invalid"), DEFAULT_HAMSTER_SELECTOR_MODE);
  assert.equal(normalizeHamsterSelectorMode(null), DEFAULT_HAMSTER_SELECTOR_MODE);
  assert.equal(normalizeHamsterSelectorMode(undefined), DEFAULT_HAMSTER_SELECTOR_MODE);
});

test("ダッシュボード表示対象の検索と状態フィルターを同時に適用する", () => {
  assert.match(dashboardSettingsFormSource, /normalizeSearchText\(hamster\.name\)\.includes\(normalizedSearchTerm\)/);
  assert.match(dashboardSettingsFormSource, /return matchesSearch && matchesStatus/);
  assert.match(dashboardSettingsFormSource, /statusFilter === "active" && hamster\.isActive/);
  assert.match(dashboardSettingsFormSource, /statusFilter === "inactive" && !hamster\.isActive/);
  assert.match(dashboardSettingsFormSource, /statusFilter === "selected" && selectedIdSet\.has\(hamster\.id\)/);
});

test("状態フィルターは操作可能なボタンで、一覧の行領域だけをスクロールする", () => {
  assert.match(dashboardSettingsFormSource, /aria-pressed=\{isSelected\}/);
  assert.match(dashboardSettingsFormSource, /flex flex-wrap gap-2/);
  assert.match(dashboardSettingsFormSource, /max-h-\[50vh\].*overflow-y-auto.*sm:max-h-96.*lg:max-h-\[28rem\]/);
});
