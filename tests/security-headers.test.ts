import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("本番レスポンスへ最低限のセキュリティヘッダーを設定する", () => {
  const config = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8");

  assert.match(config, /poweredByHeader:\s*false/);
  assert.match(config, /key:\s*["']X-Frame-Options["'],\s*value:\s*["']DENY["']/);
  assert.match(config, /key:\s*["']Referrer-Policy["'],\s*value:\s*["']strict-origin-when-cross-origin["']/);
  assert.match(config, /key:\s*["']X-Content-Type-Options["'],\s*value:\s*["']nosniff["']/);
});
