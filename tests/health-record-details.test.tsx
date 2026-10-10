import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HealthRecordDetails, HealthStatusBadge } from "../src/components/health-record-details";
import { HEALTH_AMOUNT_LABELS, HEALTH_EXCRETION_LABELS, HEALTH_OVERALL_LABELS, HEALTH_SYMPTOM_LABELS } from "../src/lib/records";

const detail = { appetite: "NORMAL", activityLevel: "NORMAL", stoolCondition: "NORMAL", urineCondition: "NORMAL", symptoms: [] } as const;
type Detail = Parameters<typeof HealthRecordDetails>[0]["detail"];
const render = (value: Detail, memo?: string | null) => renderToStaticMarkup(<HealthRecordDetails detail={value} memo={memo} />);

test("総合状態は登録された状態名と控えめな状態色で表示する", () => {
  for (const [condition, color] of [["GOOD", "emerald"], ["CONCERN", "amber"], ["WARNING", "red"]] as const) {
    const markup = renderToStaticMarkup(<HealthStatusBadge condition={condition} />);
    assert.ok(markup.includes(HEALTH_OVERALL_LABELS[condition]));
    assert.ok(markup.includes("bg-" + color + "-50"));
    assert.ok(markup.includes("rounded-md"));
    assert.doesNotMatch(markup, /rounded-full/);
  }
});

function fieldStyle(markup: string, label: string) {
  const block = markup.match(new RegExp('<div class="([^"]+)"><dt[^>]*>' + label + '</dt>'));
  assert.ok(block, label + "のブロックが存在する");
  return block[1];
}

test("食欲・活動量は内部値に応じて既存ラベルと背景・文字色を表示する", () => {
  for (const [condition, color] of [["NORMAL", "slate"], ["LOW", "amber"], ["NONE", "red"], ["UNKNOWN", "slate"]] as const) {
    const markup = render({ ...detail, symptoms: [], appetite: condition, activityLevel: condition });
    assert.equal(markup.split(HEALTH_AMOUNT_LABELS[condition]).length - 1, 2);
    for (const label of ["食欲", "活動量"]) {
      assert.ok(fieldStyle(markup, label).includes("bg-" + color + "-50"));
      assert.ok(fieldStyle(markup, label).includes("text-" + color + (color === "slate" ? "-700" : "-800")));
    }
    assert.doesNotMatch(markup, /text-emerald|bg-emerald/);
  }
});

test("便・尿は内部値に応じて既存ラベルと背景・文字色を表示する", () => {
  for (const [condition, color] of [["NORMAL", "slate"], ["LOW", "amber"], ["ABNORMAL", "red"], ["UNKNOWN", "slate"]] as const) {
    const markup = render({ ...detail, symptoms: [], stoolCondition: condition, urineCondition: condition });
    assert.equal(markup.split(HEALTH_EXCRETION_LABELS[condition]).length - 1, 2);
    for (const label of ["便", "尿"]) {
      assert.ok(fieldStyle(markup, label).includes("bg-" + color + "-50"));
      assert.ok(fieldStyle(markup, label).includes("text-" + color + (color === "slate" ? "-700" : "-800")));
    }
    assert.doesNotMatch(markup, /text-emerald|bg-emerald/);
  }
});

test("総合状態に関係なく各項目の登録値で独立して色分けし、症状タグはピル型を維持する", () => {
  for (const condition of ["GOOD", "CONCERN", "WARNING"] as const) {
    const markup = renderToStaticMarkup(<><HealthStatusBadge condition={condition} /><HealthRecordDetails detail={{ ...detail, appetite: "NORMAL", activityLevel: "LOW", stoolCondition: "ABNORMAL", urineCondition: "UNKNOWN", symptoms: ["DIARRHEA"] }} /></>);
    assert.ok(markup.includes(HEALTH_OVERALL_LABELS[condition]));
    assert.ok(fieldStyle(markup, "食欲").includes("bg-slate-50"));
    assert.ok(fieldStyle(markup, "活動量").includes("bg-amber-50"));
    assert.ok(fieldStyle(markup, "便").includes("bg-red-50"));
    assert.ok(fieldStyle(markup, "尿").includes("bg-slate-50"));
    assert.match(markup, /<li class="[^"]*rounded-full/);
  }
});

test("症状は全て既存ラベルのタグと実際の件数を表示し、0件は領域ごと隠す", () => {
  const symptoms = Object.keys(HEALTH_SYMPTOM_LABELS) as Array<keyof typeof HEALTH_SYMPTOM_LABELS>;
  const markup = render({ ...detail, symptoms });
  assert.ok(markup.includes("気になる症状（" + symptoms.length + "件）"));
  assert.equal((markup.match(/<li /g) ?? []).length, symptoms.length);
  for (const symptom of symptoms) assert.ok(markup.includes(HEALTH_SYMPTOM_LABELS[symptom]));
  assert.doesNotMatch(render({ ...detail, symptoms: [] }), /気になる症状|<ul/);
});

test("メモの空値は非表示、複数行と長文はそのまま一度だけ表示する", () => {
  for (const memo of [undefined, null, "", " \n\t　"]) {
    assert.doesNotMatch(render({ ...detail, symptoms: [] }, memo), />メモ</);
  }
  const memo = "一行目\n二行目" + "長文".repeat(100);
  const markup = render({ ...detail, symptoms: [] }, memo);
  assert.equal(markup.split(memo).length - 1, 1);
  assert.ok(markup.includes("whitespace-pre-wrap"));
  assert.ok(markup.includes("[overflow-wrap:anywhere]"));
  assert.ok(render(null, memo).includes(memo));
});

test("再描画は更新済みの値を表示し、総合状態と症状は別々に扱う", () => {
  const before = render({ ...detail, symptoms: [] }, "更新前");
  const after = render({ ...detail, appetite: "NONE", symptoms: ["ABNORMAL_BREATHING"] }, "更新後");
  assert.ok(before.includes("更新前"));
  assert.ok(after.includes("なし・ほとんどない"));
  assert.ok(fieldStyle(before, "食欲").includes("bg-slate-50"));
  assert.ok(fieldStyle(after, "食欲").includes("bg-red-50"));
  assert.ok(after.includes("呼吸の異常"));
  assert.ok(after.includes("更新後"));
  assert.doesNotMatch(after, /更新前|要注意|総合:/);
});

test("タイムラインは保存タイトルを変えず、体調タイトル・総合バッジと専用メモを接続する", () => {
  const timeline = readFileSync("src/components/record-timeline.tsx", "utf8");
  assert.match(timeline, /record.recordType === "HEALTH" \? <span[^>]*>体調記録/);
  assert.match(timeline, /<HealthStatusBadge condition=\{record.healthDetail.overallCondition\}/);
  assert.match(timeline, /<HealthRecordDetails detail=\{record.healthDetail\} memo=\{record.memo\}/);
  assert.match(timeline, /record.recordType === "MEMORY" && record.memo \? <p/);
  assert.match(timeline, /const hasSummaryHeader = record.recordType === "MEDICAL" \|\| record.recordType === "HEALTH"/);
  assert.doesNotMatch(timeline, /総合:<\/span>/);
});
