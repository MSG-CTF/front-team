import test from "node:test";
import assert from "node:assert/strict";
import { signaturePayload, validateSignature } from "./adminSignature.js";

const form = { clubId: "club-1", title: " 시그니처 ", description: " 설명 ", flag: " LOCAL ", score: "300.25" };

test("시그니처 등록은 동아리와 필수 필드, 서버 점수 범위를 확인한다", () => {
  assert.equal(validateSignature(form), "");
  for (const change of [{ clubId: "" }, { title: " " }, { title: "가".repeat(201) }, { description: " " }, { flag: "" }, { flag: "x".repeat(513) }]) {
    assert.ok(validateSignature({ ...form, ...change }));
  }
  for (const score of ["", " ", "0", "-1", "1.234", "1e2", "Infinity", "10000000000"]) {
    assert.ok(validateSignature({ ...form, score }));
  }
  for (const score of ["0.01", "300", "9999999999.99"]) assert.equal(validateSignature({ ...form, score }), "");
});

test("수정에서 빈 플래그는 생략하고 새 플래그의 공백은 유지한다", () => {
  assert.deepEqual(signaturePayload(form), { clubId: "club-1", title: "시그니처", description: "설명", flag: " LOCAL ", score: 300.25 });
  assert.equal(validateSignature({ ...form, clubId: "", flag: "" }, true), "");
  const unchanged = signaturePayload({ ...form, flag: "" }, true);
  assert.equal(Object.hasOwn(unchanged, "flag"), false);
  assert.equal(Object.hasOwn(unchanged, "clubId"), false);
  assert.equal(signaturePayload(form, true).flag, " LOCAL ");
});
