import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_HAMSTER_SELECTOR_MODE, normalizeHamsterSelectorMode } from "../src/lib/dashboard-settings";

test("ハムスター選択方式はコンボボックス式とプルダウン式を維持する", () => {
  assert.equal(normalizeHamsterSelectorMode("combobox"), "combobox");
  assert.equal(normalizeHamsterSelectorMode("select"), "select");
});

test("不正または未設定のハムスター選択方式は既定値に戻す", () => {
  assert.equal(normalizeHamsterSelectorMode("invalid"), DEFAULT_HAMSTER_SELECTOR_MODE);
  assert.equal(normalizeHamsterSelectorMode(null), DEFAULT_HAMSTER_SELECTOR_MODE);
  assert.equal(normalizeHamsterSelectorMode(undefined), DEFAULT_HAMSTER_SELECTOR_MODE);
});
