import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_EVENT_TYPES,
  ADMIN_EVENT_TYPES_PENDING,
  formatCollectedValue,
  formatResourceAccountName,
  getAdminEventSeverity,
  getAdminEventTypeLabel,
  isLongEventMessage,
  parseBoardCellIndex,
  previewEventMessage,
  validateBoardCellUpdate,
  validateBoardPositionMove,
} from "./adminBoard.js";
import { getAdminRequestError } from "./adminValidation.js";

test("칸 번호는 1~36만 허용하고 0번 칸은 거부한다", () => {
  assert.equal(parseBoardCellIndex("1"), 1);
  assert.equal(parseBoardCellIndex(36), 36);
  for (const value of ["0", 0, "37", "1.5", "", null, "abc", -1]) assert.equal(parseBoardCellIndex(value), null);
});

test("칸 상태 변경과 말 이동은 칸 번호, 상태, 사유 1~500자를 검사한다", () => {
  assert.equal(validateBoardCellUpdate({ cellIndex: "36", status: "CLEARED", reason: "오류 복구" }), "");
  assert.notEqual(validateBoardCellUpdate({ cellIndex: "0", status: "CLEARED", reason: "x" }), "");
  assert.notEqual(validateBoardCellUpdate({ cellIndex: "3", status: "INVALID", reason: "x" }), "");
  assert.notEqual(validateBoardCellUpdate({ cellIndex: "3", status: "OPENED", reason: " " }), "");
  assert.notEqual(validateBoardCellUpdate({ cellIndex: "3", status: "OPENED", reason: "a".repeat(501) }), "");
  assert.equal(validateBoardPositionMove({ position: "1", reason: "START 복귀" }), "");
  assert.notEqual(validateBoardPositionMove({ position: "0", reason: "x" }), "");
});

test("이벤트 type 11종에 새 보드 조작 3종이 포함된다", () => {
  const values = ADMIN_EVENT_TYPES.map((item) => item.value);
  assert.equal(values.length, 11);
  assert.equal(new Set(values).size, 11);
  for (const value of ["DICE_ADJUSTED", "BOARD_POSITION_MOVED", "CELL_STATUS_CHANGED"]) assert.ok(values.includes(value));
  assert.equal(getAdminEventTypeLabel("UNKNOWN_TYPE"), "UNKNOWN_TYPE");
});

test("PR 대기 이벤트 5종은 확정 11종과 겹치지 않고 라벨이 있다", () => {
  const confirmed = new Set(ADMIN_EVENT_TYPES.map((item) => item.value));
  assert.equal(ADMIN_EVENT_TYPES_PENDING.length, 5);
  for (const item of ADMIN_EVENT_TYPES_PENDING) {
    assert.equal(confirmed.has(item.value), false);
    assert.equal(getAdminEventTypeLabel(item.value), item.label);
  }
});

test("severity는 4종을 매핑하고 모르는 값은 그대로 보여준다", () => {
  assert.equal(getAdminEventSeverity("CRITICAL").tone, "bad");
  assert.equal(getAdminEventSeverity("MANUAL_REVIEW").label, "수동 확인");
  assert.deepEqual(getAdminEventSeverity("ERROR"), { label: "ERROR", tone: "neutral" });
});

test("긴 이벤트 메시지는 줄여 보여주되 원문을 자르지 않는다", () => {
  const message = "가".repeat(600);
  assert.equal(isLongEventMessage(message), true);
  assert.equal(Array.from(previewEventMessage(message)).length, 121);
  assert.equal(previewEventMessage("짧은 사유"), "짧은 사유");
  assert.equal(isLongEventMessage(null), false);
});

test("리소스 null 값은 0이 아니라 미수집으로 표시하고 계정은 provider/scope_id로 식별한다", () => {
  assert.equal(formatCollectedValue(null, "%"), "미수집");
  assert.equal(formatCollectedValue(undefined), "미수집");
  assert.equal(formatCollectedValue(0, "%"), "0%");
  assert.equal(formatResourceAccountName({ account_id: "a1", provider: "GCP", scope_id: "example-project" }), "GCP / example-project");
  assert.equal(formatResourceAccountName({ account_id: "a1" }), "a1");
});

test("503 SCHEDULER_UNAVAILABLE은 리소스 브로커 연결 실패 문구로 바꾼다", () => {
  const result = getAdminRequestError({ response: { status: 503, data: { code: "SCHEDULER_UNAVAILABLE", message: "x" } } }, "fallback");
  assert.equal(result.status, "error");
  assert.match(result.error, /리소스 브로커/);
});
