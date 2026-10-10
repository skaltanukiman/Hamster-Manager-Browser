import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

import { CareHistoryPanel } from "../src/components/care-history-panel";
import {
  buildCareHistoryDays, careTimeDateNote, formatCareDate, formatLatestCareTime,
  getCareHistoryRange, isCareHistoryPeriod
} from "../src/lib/care-history";
import { getCareHistory, getLatestCareTimes } from "../src/lib/care-history-queries";
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
      },
      async groupBy(args: { where: Where }) {
        calls.push({ kind: field + ".groupBy", args });
        const groups = new Map<string, Date>();
        for (const row of filter(rows, args.where)) {
          if (!groups.has(row.hamsterId) || row[field]! > groups.get(row.hamsterId)!) groups.set(row.hamsterId, row[field]!);
        }
        return [...groups].map(([hamsterId, date]) => ({ hamsterId, _max: { [field]: date } }));
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

test("前回日時はJSTの今日/昨日/年月日を表示し、UTCで日付がずれない", () => {
  assert.equal(formatLatestCareTime(null, now), "記録なし");
  assert.equal(formatLatestCareTime(now.toISOString(), now), "今日 20:30");
  assert.equal(formatLatestCareTime("2026-10-09T12:15:00Z", now), "昨日 21:15");
  assert.equal(formatLatestCareTime("2026-10-08T10:40:00Z", now), "10/8 19:40");
  assert.equal(formatLatestCareTime("2025-12-31T10:40:00Z", now), "2025/12/31 19:40");
  assert.equal(formatLatestCareTime("2026-10-09T15:00:00Z", now), "今日 00:00");
  assert.equal(formatCareDate("2025-12-31", "2026-01-01"), "2025/12/31");
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

test("最新timestampを二つの集約queryで取得し、取消後は以前の記録へ戻る", async () => {
  const db = fakeDatabase();
  const scope = { householdId: "home", userId: "viewer" };
  let latest = await getLatestCareTimes(db.reader, scope, ["h1", "h2"]);
  assert.equal(latest.get("h1")?.fedAt?.toISOString(), now.toISOString());
  assert.equal(latest.get("h2")?.fedAt?.toISOString(), "2026-10-08T10:40:00.000Z");
  assert.equal(latest.get("h2")?.replacedAt, null);
  assert.equal(db.calls.length, 2);
  db.feedings.splice(db.feedings.findIndex((row) => row.hamsterId === "h1" && toDateInputValue(row.recordDate) === "2026-10-10"), 1);
  latest = await getLatestCareTimes(db.reader, scope, ["h1", "h2"]);
  assert.equal(latest.get("h1")?.fedAt?.toISOString(), "2026-10-09T12:30:00.000Z");
  const count = db.calls.length;
  assert.equal((await getLatestCareTimes(db.reader, scope, [])).size, 0);
  assert.equal(db.calls.length, count);
});

test("最新はrecordDateの大小より実施timestampを優先し、履歴は期間外の水替えも除外", async () => {
  const db = fakeDatabase();
  db.feedings.push({ hamsterId: "h1", recordDate: parseDateInput("2026-10-08"), fedAt: new Date("2026-10-10T13:00:00Z") });
  const latest = await getLatestCareTimes(db.reader, { householdId: "home", userId: "viewer" }, ["h1"]);
  assert.equal(latest.get("h1")?.fedAt?.toISOString(), "2026-10-10T13:00:00.000Z");
  const rows = buildCareHistoryDays(["2026-10-10"], [], [{ recordDate: parseDateInput("2026-10-09"), replacedAt: now }]);
  assert.equal(rows[0].replacedAt, null);
});

test("ダッシュボードは食事/水替え/共通履歴/体重の順、記録なしでも履歴ボタンを維持", () => {
  for (const path of ["src/app/(app)/page.tsx", "src/app/demo/page.tsx"]) {
    const page = source(path);
    assert.match(page, /<FeedingToggle[\s\S]*<WaterReplacementToggle[\s\S]*<CareHistoryPanel[\s\S]*最新体重/);
    assert.equal((page.match(/<CareHistoryPanel/g) ?? []).length, 1);
  }
  const html = renderToStaticMarkup(<CareHistoryPanel hamsterId="h1" hamsterName="きなこ" householdId="home" latestFedAt={null} latestReplacedAt={null} referenceTime={now.toISOString()} historyVersion="home:1" />);
  assert.match(html, /お世話履歴を見る/);
  assert.equal((html.match(/記録なし/g) ?? []).length, 2);
  assert.doesNotMatch(html, /disabled|<form|<dialog/);
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
