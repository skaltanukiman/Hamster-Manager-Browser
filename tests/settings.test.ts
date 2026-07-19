import assert from "node:assert/strict";
import test from "node:test";

import { getSettingsChanges, type SettingsSnapshot } from "../src/lib/settings-diff";
import "./household-name.test";

const current: SettingsSnapshot = {
  name: "山田 太郎",
  dashboardBoardCount: 2,
  hamsterSelectorMode: "select",
  hamsterIds: ["hamster-1", "hamster-2"]
};

test("設定が同一ならプロフィール・ダッシュボードとも変更なしになる", () => {
  assert.deepEqual(getSettingsChanges(current, { ...current }), {
    profileChanged: false,
    dashboardChanged: false
  });
});

test("表示名だけの変更を検知する", () => {
  assert.deepEqual(getSettingsChanges(current, { ...current, name: "山田 花子" }), {
    profileChanged: true,
    dashboardChanged: false
  });
});

test("表示件数・選択方式・対象順序の変更をそれぞれ検知する", () => {
  assert.equal(getSettingsChanges(current, { ...current, dashboardBoardCount: 3 }).dashboardChanged, true);
  assert.equal(getSettingsChanges(current, { ...current, hamsterSelectorMode: "combobox" }).dashboardChanged, true);
  assert.equal(
    getSettingsChanges(current, { ...current, hamsterIds: ["hamster-2", "hamster-1"] }).dashboardChanged,
    true
  );
});
