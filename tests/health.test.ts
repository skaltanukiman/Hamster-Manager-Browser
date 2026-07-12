import assert from "node:assert/strict";
import test from "node:test";

import { isApplicationHealthy } from "../src/lib/health";

test("DBへ接続できる場合だけアプリをhealthyと判定する", async () => {
  assert.equal(await isApplicationHealthy(async () => 1), true);
  assert.equal(
    await isApplicationHealthy(async () => {
      throw new Error("database unavailable");
    }),
    false
  );
});
