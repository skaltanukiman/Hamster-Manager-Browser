import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as React from "react";
import ts from "typescript";
import type { Prisma } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

import { canManageCareDaySettings } from "../src/lib/authorization";
import { CareHistoryPanel } from "../src/components/care-history-panel";
import {
  buildCareHistoryDays, careTimeDateNote, formatCareDate,
  getCareHistoryRange, isCareHistoryPeriod
} from "../src/lib/care-history";
import { getCareHistory } from "../src/lib/care-history-queries";
import { parseDateInput, toDateInputValue } from "../src/lib/date";

const source = (path: string) => readFileSync(path, "utf8");
const now = new Date("2026-10-10T11:30:00Z");
type Row = { hamsterId: string; recordDate: Date; fedAt?: Date; replacedAt?: Date };
type Where = {
  hamsterId: string | { in: string[] };
  hamster: { householdId: string; household: { isDemo: boolean; demoSlug?: string; members?: { some: { userId: string } } } };
  recordDate?: { gte: Date; lte: Date };
};

function fakeDatabase() {
  const calls: { kind: string; args: unknown }[] = [];
  const hamsters = [
    { id: "h1", householdId: "home", active: true, demo: false, start: 480 },
    { id: "h2", householdId: "home", active: false, demo: false, start: 480 },
    { id: "foreign", householdId: "other", active: true, demo: false, start: 0 },
    { id: "sample", householdId: "demo", active: true, demo: true, start: 0 }
  ];
  const feedings: Row[] = [
    { hamsterId: "h1", recordDate: parseDateInput("2026-10-09"), fedAt: new Date("2026-10-09T12:30:00Z") },
    { hamsterId: "h1", recordDate: parseDateInput("2026-10-10"), fedAt: new Date("2026-10-10T11:30:00Z") },
    { hamsterId: "h1", recordDate: parseDateInput("2026-09-01"), fedAt: new Date("2026-09-01T12:30:00Z") },
    { hamsterId: "h2", recordDate: parseDateInput("2026-10-08"), fedAt: new Date("2026-10-08T10:40:00Z") },
    { hamsterId: "foreign", recordDate: parseDateInput("2026-10-10"), fedAt: now },
    { hamsterId: "sample", recordDate: parseDateInput("2026-10-10"), fedAt: now }
  ];
  const waters: Row[] = [{ hamsterId: "h1", recordDate: parseDateInput("2026-10-09"), replacedAt: new Date("2026-10-09T11:15:00Z") }];
  function allowed(id: string, where: Where["hamster"]) {
    const h = hamsters.find((item) => item.id === id);
    return h && h.householdId === where.householdId && h.demo === where.household.isDemo &&
      (h.demo ? where.household.demoSlug === "public-sample" : where.household.members?.some.userId === "viewer");
  }
  function filter(rows: Row[], where: Where) {
    return rows.filter((row) => (typeof where.hamsterId === "string" ? row.hamsterId === where.hamsterId : where.hamsterId.in.includes(row.hamsterId)) &&
      allowed(row.hamsterId, where.hamster) && (!where.recordDate || row.recordDate >= where.recordDate.gte && row.recordDate <= where.recordDate.lte));
  }
  function records(rows: Row[], field: "fedAt" | "replacedAt") {
    return {
      async findMany(args: { where: Where; take: number }) {
        calls.push({ kind: field + ".findMany", args });
        return filter(rows, args.where).sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime()).slice(0, args.take);
      }
    };
  }
  const reader = {
    hamster: {
      async findFirst(args: { where: Where["hamster"] & { id: string } }) {
        calls.push({ kind: "hamster.findFirst", args });
        const h = hamsters.find((item) => item.id === args.where.id);
        return h && allowed(h.id, args.where) ? { household: { careDayStartMinutes: h.start } } : null;
      }
    },
    feedingRecord: records(feedings, "fedAt"), waterReplacementRecord: records(waters, "replacedAt")
  } as unknown as Pick<Prisma.TransactionClient, "hamster" | "feedingRecord" | "waterReplacementRecord">;
  return { reader, calls, feedings };
}

test("7/14/30日は当日を含み、年跨ぎも新しい順に欠落日を埋める", () => {
  for (const period of [7, 14, 30] as const) {
    const range = getCareHistoryRange(new Date("2025-12-31T15:30:00Z"), 0, period);
    assert.equal(range.dates.length, period);
    assert.equal(range.dates[0], "2026-01-01");
    assert.equal(toDateInputValue(range.end), "2026-01-01");
    assert.equal((range.end.getTime() - range.start.getTime()) / 86400000, period - 1);
    const days = buildCareHistoryDays(range.dates, [], []);
    assert.equal(days.length, period);
    assert.ok(days.every((day) => day.fedAt === null && day.replacedAt === null));
    assert.ok(days.every((day, index) => index === 0 || day.recordDate < days[index - 1].recordDate));
  }
  for (const input of [0, 8, 31, NaN, "7", null]) assert.equal(isCareHistoryPeriod(input), false);
  for (const input of [7, 14, 30]) assert.equal(isCareHistoryPeriod(input), true);
});

test("8時境界の前後をJSTで算出し、timestampの暦日で既存recordDateを書き換えない", () => {
  const before = new Date("2026-10-09T22:59:59.999Z");
  const at = new Date("2026-10-09T23:00:00Z");
  assert.equal(getCareHistoryRange(before, 480, 7).dates[0], "2026-10-09");
  assert.equal(getCareHistoryRange(at, 480, 7).dates[0], "2026-10-10");
  const days = buildCareHistoryDays(["2026-10-10", "2026-10-09"], [{ recordDate: parseDateInput("2026-10-09"), fedAt: before }], []);
  assert.equal(days[0].fedAt, null);
  assert.equal(days[1].fedAt, before.toISOString());
  assert.equal(careTimeDateNote(before.toISOString(), "2026-10-09"), "翌日");
  assert.equal(careTimeDateNote("2026-10-09T12:30:00Z", "2026-10-09"), null);
  assert.equal(careTimeDateNote("2025-12-31T15:00:00Z", "2025-12-31"), "翌日");
});

test("お世話日は年を跨いでも暦日を維持して表示する", () => {
  assert.equal(formatCareDate("2025-12-31", "2026-01-01"), "2025/12/31");
  assert.equal(formatCareDate("2026-01-01", "2026-01-01"), "1/1");
});

test("DBで対象期間・対象個体を制限し、食事と水替えの過去記録と欠落日を返す", async () => {
  for (const period of [7, 14, 30] as const) {
    const db = fakeDatabase();
    const result = await getCareHistory(db.reader, { householdId: "home", userId: "viewer" }, "h1", period, now);
    assert.equal(result?.days.length, period);
    assert.equal(result?.days[0].fedAt, now.toISOString());
    assert.equal(result?.days[1].replacedAt, "2026-10-09T11:15:00.000Z");
    assert.equal(result?.days[2].fedAt, null);
    assert.equal(db.calls.length, 3);
    assert.equal(result?.days.some((day) => day.recordDate === "2026-09-01"), false);
    for (const call of db.calls.filter((call) => call.kind.endsWith("findMany"))) {
      const args = call.args as { where: Where; take: number };
      assert.equal(args.take, period);
      assert.equal(args.where.hamsterId, "h1");
      assert.equal(args.where.recordDate?.lte.toISOString(), "2026-10-10T00:00:00.000Z");
      assert.equal(args.where.hamster.household.members?.some.userId, "viewer");
    }
  }
});

test("VIEWERと管理外は閲覧可、別Household・所属解除・デモ混入はDB読込前に拒否", async () => {
  const db = fakeDatabase();
  const inactive = await getCareHistory(db.reader, { householdId: "home", userId: "viewer" }, "h2", 7, now);
  assert.equal(inactive?.days[2].fedAt, "2026-10-08T10:40:00.000Z");
  for (const [id, userId] of [["foreign", "viewer"], ["h1", "removed"], ["sample", "viewer"]]) {
    db.calls.length = 0;
    assert.equal(await getCareHistory(db.reader, { householdId: "home", userId }, id, 7, now), null);
    assert.deepEqual(db.calls.map((call) => call.kind), ["hamster.findFirst"]);
  }
});

test("匿名デモは固定slug・isDemoのサンプルだけを返し、通常データにアクセスしない", async () => {
  const db = fakeDatabase();
  assert.ok(await getCareHistory(db.reader, { householdId: "demo", publicDemo: true }, "sample", 7, now));
  assert.equal(await getCareHistory(db.reader, { householdId: "demo", publicDemo: true }, "h1", 7, now), null);
  assert.equal(await getCareHistory(db.reader, { householdId: "home", publicDemo: true }, "h1", 7, now), null);
  const route = source("src/app/demo/care-history/route.ts");
  assert.match(route, /getPublicDemoCareHistory/);
  assert.doesNotMatch(route, /getRequiredHouseholdContext|auth\(|cookies\(|params.get\("householdId"\)/);
});

test("取消で削除された当日記録を履歴に含めず、過去日の記録を保持する", async () => {
  const db = fakeDatabase();
  db.feedings.splice(db.feedings.findIndex((row) => row.hamsterId === "h1" && toDateInputValue(row.recordDate) === "2026-10-10"), 1);
  const data = await getCareHistory(db.reader, { householdId: "home", userId: "viewer" }, "h1", 7, now);
  assert.equal(data?.days[0].fedAt, null);
  assert.equal(data?.days[1].fedAt, "2026-10-09T12:30:00.000Z");
});

test("履歴ボタンはカード上部に1つ置き、状態一覧は食事/水替え/体重の順を維持", () => {
  for (const path of ["src/app/(app)/page.tsx", "src/app/demo/page.tsx"]) {
    const page = source(path);
    const header = page.slice(page.indexOf("<article key={hamster.id}"), page.indexOf("<HamsterThumbnail"));
    const states = page.slice(page.indexOf("<dl"));
    assert.match(header, /<CareHistoryPanel[\s\S]*管理中[\s\S]*管理外/);
    assert.equal((page.match(/<CareHistoryPanel/g) ?? []).length, 1);
    assert.match(states, /<FeedingToggle[\s\S]*<WaterReplacementToggle[\s\S]*最新体重/);
    assert.doesNotMatch(states, /<CareHistoryPanel|前回/);
    assert.match(header, /min-w-0 flex-1/);
    assert.match(header, /break-words text-lg/);
    assert.match(header, /flex shrink-0 items-center gap-1/);
  }
  const html = renderToStaticMarkup(<CareHistoryPanel hamsterId="h1" hamsterName="とても長い名前のきなこ" householdId="home" historyVersion="home:1" />);
  assert.match(html, /とても長い名前のきなこのお世話履歴を見る/);
  assert.match(html, />履歴<|>\s*履歴\s*</);
  assert.match(html, /lucide-history/);
  assert.match(html, /min-h-11 min-w-11 shrink-0/);
  assert.doesNotMatch(html, /前回|記録なし|<dt|<dd|<form|<dialog|disabled/);
});

test("前回日時だけのDB取得を撤去し、履歴APIとrevision更新を維持する", () => {
  for (const path of ["src/lib/queries.ts", "src/lib/public-demo-queries.ts"]) {
    assert.doesNotMatch(source(path), /getLatestCareTimes|latestFedAt|latestReplacedAt|referenceTime/);
    assert.match(source(path), /historyVersion:/);
  }
  assert.match(source("src/lib/queries.ts"), /select: \{ realtimeRevision: true \}/);
  assert.match(source("src/lib/public-demo-queries.ts"), /export async function getPublicDemoCareHistory/);
});

test("履歴は読取専用、開いた時だけ取得し、終了・revision更新時は以前の応答を破棄", () => {
  const panel = source("src/components/care-history-panel.tsx");
  assert.match(panel, /isOpen \? createPortal/);
  assert.match(panel, /days: "30"/);
  assert.match(panel, /data\?\.days\.slice\(0, period\)/);
  assert.match(panel, /controller.abort\(\)/);
  assert.match(panel, /if \(active\) setResult/);
  assert.match(panel, /\[hamsterId, householdId, historyVersion, demo, retry\]/);
  assert.match(panel, /dialog.showModal\(\)/);
  assert.match(panel, /onCancel=/);
  assert.match(panel, /document.body.style.overflow = "hidden"/);
  assert.match(panel, /returnFocusRef.current\(\)/);
  assert.doesNotMatch(panel, /actions\/|method:|onSubmit|type="submit"/);
  const route = source("src/app/api/care-history/route.ts");
  assert.match(route, /await getRequiredHouseholdContext\(\)/);
  assert.match(route, /params.get\("householdId"\) !== context.household.id/);
  assert.match(route, /userId: context.user.id/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /export async function (POST|PATCH|DELETE)/);
});


test("設定案内は選択中Householdの設定変更権限を追加queryなしでサーバーから渡す", () => {
  const queries = source("src/lib/queries.ts");
  const dashboard = queries.slice(queries.indexOf("export async function getDashboardData"), queries.indexOf("export async function getHamsterManagementData"));
  assert.match(dashboard, /canManageCareDaySettings: canManageCareDaySettings\(context.membership.role\)/);
  const page = source("src/app/(app)/page.tsx");
  assert.match(page, /canManageCareDaySettings[^\n]*await getDashboardData\(\)/);
  assert.match(page, /canManageCareDaySettings=\{canManageCareDaySettings\}/);
});

test("各権限・公開デモで案内のみを制御し、共通説明・動的時刻・余白を維持する", () => {
  // 内部モーダルをメモリ内で公開し、取得済みデータだけをuseStateの初期値へ注入する。
  // 本番のexportや取得処理を変えず、実際のJSXを各権限で描画して確認する。
  const compiled = ts.transpileModule(source("src/components/care-history-panel.tsx") + "\nexport { CareHistoryModal };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const require = createRequire(import.meta.url);
  for (const start of [15, 480]) {
    for (const role of ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const) {
      for (const demo of [false, true]) {
        const exports: { CareHistoryModal?: React.ComponentType<Record<string, unknown>> } = {};
        runInNewContext(compiled, {
          exports,
          require: (id: string) => id === "react" ? {
            ...React,
            useState: (initial: unknown) => React.useState(initial === null ? {
              version: "home:1", retry: 0, data: {
                careDayStartMinutes: start,
                days: [{ recordDate: "2026-10-10", fedAt: "2026-10-10T11:30:00Z", replacedAt: null }]
              }
            } : initial)
          } : require(id)
        });
        const html = renderToStaticMarkup(React.createElement(exports.CareHistoryModal!, {
          hamsterId: "h1", hamsterName: "きなこ", householdId: "home", historyVersion: "home:1",
          canManageCareDaySettings: canManageCareDaySettings(role), demo,
          onClose: () => {}, returnFocus: () => {}
        }));
        const explanation = html.match(/<p id="[^"]*" class="mb-3 text-xs leading-5 text-slate-500">(.*?)<\/p>/)![1];
        const canManage = !demo && (role === "OWNER" || role === "ADMIN");
        assert.equal(explanation.includes("切り替え時刻は設定画面の「お世話日の設定」から変更できます。"), canManage, `${role} demo=${demo}`);
        assert.match(explanation, /記録なしは未実施を意味するものではありません。/);
        assert.ok(explanation.includes(`お世話日は${start === 15 ? "00:15" : "08:00"}に切り替わります。`));
        assert.equal((explanation.match(/<span class="block">/g) ?? []).length, canManage ? 3 : 2);
        assert.doesNotMatch(html, /この期間のお世話記録はありません。/);
        assert.match(html, /記録あり/);
      }
    }
  }
});
