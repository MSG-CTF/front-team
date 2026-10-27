import assert from "node:assert/strict";
import test from "node:test";
import { validateSubmissionReason, submissionDeleteMessage, submissionDeleteError } from "./adminSubmissionDelete.js";
import { ADMIN_EVENT_TYPES, getAdminEventSeverity } from "./adminBoard.js";

test("deletion reason trims and validates 1–500 unicode characters", () => {
  for (const reason of ["", "   ", "x".repeat(501)]) assert.ok(validateSubmissionReason(reason));
  for (const reason of [" a ", "가".repeat(500), "😀".repeat(500)]) assert.equal(validateSubmissionReason(reason), "");
});
test("wrong and locked deletion do not invent revocation", () => {
  for (const result of ["INCORRECT", "TOO_MANY_ATTEMPTS"]) {
    assert.equal(submissionDeleteMessage({ result, revoked: null }), "제출 기록이 삭제되었습니다.");
  }
});
test("revocation displays actual zero and fractional score, mileage and optional line", () => {
  const message = submissionDeleteMessage({ revoked: { score: 0, mileage: 0, line_monopoly: { line_number: 2, earned_score: 123.45 } } });
  assert.match(message, /회수 점수: 0점/); assert.match(message, /회수 마일리지: 0/);
  assert.match(message, /2번 라인 \(123.45점\)/);
  assert.doesNotMatch(submissionDeleteMessage({ revoked: { score: 450, mileage: 30, line_monopoly: null } }), /라인/);
});
test("deletion errors distinguish input, missing row, authentication and permission", () => {
  for (const [status, text] of [[400, "사유"], [404, "다시 조회"], [401, "로그인"], [403, "권한"]]) {
    assert.ok(submissionDeleteError({ response: { status } }).includes(text));
  }
  assert.match(submissionDeleteError(new Error("timeout")), /상태를 확인/);
});
test("submission event filter supports server INFO and WARNING", () => {
  assert.equal(ADMIN_EVENT_TYPES.filter(item => item.value === "SUBMISSION_DELETED").length, 1);
  assert.equal(getAdminEventSeverity("INFO").label, "정보");
  assert.equal(getAdminEventSeverity("WARNING").label, "경고");
});
