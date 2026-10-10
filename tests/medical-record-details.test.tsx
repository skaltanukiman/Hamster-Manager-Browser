import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MedicalRecordDetails } from "../src/components/medical-record-details";

type Props = ComponentProps<typeof MedicalRecordDetails>;
const full: Props = {
  title: "通院: はむ病院",
  memo: "経過を観察\n翌日は元気",
  detail: {
    hospitalName: "はむ病院",
    reason: "食欲が低下\n体重が減少",
    diagnosis: "胃腸の不調",
    examination: "血液検査",
    treatment: "点滴",
    medication: "お薬A",
    medicationInstructions: "朝夕1滴",
    nextVisitDate: "2026-10-04",
    consultationFee: "3000"
  }
};
const render = (props: Props) => renderToStaticMarkup(<MedicalRecordDetails {...props} />);

test("通院の全本文項目と日付・金額を編集フォームなしで表示する", () => {
  const markup = render(full);
  for (const value of ["食欲が低下\n体重が減少", "胃腸の不調", "血液検査", "点滴", "お薬A", "朝夕1滴", "経過を観察\n翌日は元気", "2026/10/04", "3,000円"]) {
    assert.ok(markup.includes(value), value);
  }
  assert.equal((markup.match(/経過を観察/g) ?? []).length, 1);
  assert.doesNotMatch(markup, /はむ病院|<form|<details|<textarea/);
});

test("null・undefined・空文字・空白だけの値では表示領域を作らない", () => {
  for (const empty of [null, undefined, "", " \t\n　"]) {
    const props: Props = {
      title: "通院記録",
      memo: empty,
      detail: {
        hospitalName: empty, reason: empty, diagnosis: empty, examination: empty,
        treatment: empty, medication: empty, medicationInstructions: empty,
        nextVisitDate: empty, consultationFee: empty
      }
    };
    assert.equal(render(props), "");
    const partial = render({ ...props, detail: { ...props.detail, reason: "受診理由のみ" } });
    assert.match(partial, /通院理由・症状[\s\S]*受診理由のみ/);
    assert.doesNotMatch(partial, /動物病院名|診断内容|検査内容|処置・治療内容|処方薬|投薬方法|メモ|次回通院予定|診察費/);
  }
});

test("数値文字列と数値の診察費を整形し、0円も表示する", () => {
  for (const fee of ["3000", 3000, " 3000 ", "0", 0]) {
    const markup = render({ title: "通院記録", memo: null, detail: { consultationFee: fee } });
    assert.ok(markup.includes(Number(fee) === 0 ? "0円" : "3,000円"));
  }
  for (const fee of ["NaN", "不正な金額", Number.NaN, Infinity]) {
    assert.equal(render({ title: "通院記録", memo: null, detail: { consultationFee: fee } }), "");
  }
});

test("タイトルに病院名がない保存済み記録は本文で病院名を補完する", () => {
  assert.match(render({ ...full, title: "通院記録" }), /動物病院名[\s\S]*はむ病院/);
});

test("長文と改行を省略せず保持し、HTMLをエスケープする", () => {
  const longText = "a".repeat(2000) + "\n次の行<script>";
  const markup = render({ ...full, detail: { reason: longText } });
  assert.ok(markup.includes("a".repeat(2000) + "\n次の行&lt;script&gt;"));
  assert.match(markup, /whitespace-pre-wrap \[overflow-wrap:anywhere\]/);
  assert.match(markup, /min-w-0/);
  assert.doesNotMatch(markup, /line-clamp|truncate/);
});

test("更新されたpropsで通常表示の各項目が更新される", () => {
  const before = render(full);
  const after = render({
    ...full,
    memo: "更新メモ",
    detail: { ...full.detail, examination: "再検査", treatment: null, consultationFee: "0" }
  });
  assert.match(before, /血液検査/);
  assert.match(after, /再検査/);
  assert.match(after, /更新メモ/);
  assert.match(after, /0円/);
  assert.doesNotMatch(after, /血液検査|点滴|経過を観察|3,000円/);
});

test("タイムラインの通院本文は編集権限・開閉から独立し、共通メモと重複しない", () => {
  const source = readFileSync("src/components/record-timeline.tsx", "utf8");
  assert.match(source, /record.recordType === "MEDICAL" && record.medicalDetail \? <MedicalRecordDetails detail=\{record.medicalDetail\} title=\{record.title\} memo=\{record.memo\}/);
  assert.match(source, /record.recordType === "MEMORY" && record.memo \? <p/);
  assert.match(source, /record.recordDate.replaceAll\("-", "\/"\)/);
  assert.match(source, /editable \? <details[\s\S]*<RecordEditForm/);
  assert.match(source, /action=\{updateMedicalRecord\}/);
  assert.match(source, /record.recordType === "HEALTH" && record.healthDetail/);
  assert.match(source, /record.recordType === "MEMORY" && record.memoryDetail/);
});

test("検査・治療とお薬・投薬を見出し付きセクションへ分ける", () => {
  const markup = render(full);
  assert.equal((markup.match(/<section /g) ?? []).length, 2);
  assert.match(markup, /<h4[^>]*>[\s\S]*検査・治療<\/h4>[\s\S]*検査内容[\s\S]*処置・治療内容/);
  assert.match(markup, /<h4[^>]*>[\s\S]*お薬・投薬<\/h4>[\s\S]*処方薬[\s\S]*投薬方法/);
  assert.match(markup, /bg-sky-50\/60/);
});

test("片方の項目だけでもセクションを表示し、空のセクションは作らない", () => {
  for (const detail of [{ examination: "検査のみ" }, { treatment: "治療のみ" }]) {
    const markup = render({ title: "通院記録", memo: null, detail });
    assert.match(markup, /検査・治療/);
    assert.doesNotMatch(markup, /お薬・投薬/);
    assert.equal((markup.match(/<section /g) ?? []).length, 1);
    assert.doesNotMatch(markup, /grid-cols-2/);
  }
  for (const detail of [{ medication: "薬のみ" }, { medicationInstructions: "方法のみ" }]) {
    const markup = render({ title: "通院記録", memo: null, detail });
    assert.match(markup, /お薬・投薬/);
    assert.doesNotMatch(markup, /検査・治療/);
  }
});
