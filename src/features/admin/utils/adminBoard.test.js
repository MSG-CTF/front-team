import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_EVENT_TYPES,
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

test("이벤트 필터와 표시는 백엔드 이벤트 유형 30종을 중복 없이 한국어 이름으로 다룬다", async () => {
  const { readFileSync } = await import("node:fs");
  const values = ADMIN_EVENT_TYPES.map((item) => item.value);
  assert.equal(values.length, 30);
  assert.equal(new Set(values).size, 30);
  for (const value of ["SIGNATURE_SOLVED", "CHALLENGE_DELETED", "CHALLENGE_FLAG_REVEALED", "TEAM_DELETED", "CHALLENGE_RELEASE_APPROVED"]) assert.ok(values.includes(value), value);
  for (const item of ADMIN_EVENT_TYPES) assert.doesNotMatch(item.label, /^[A-Z_]+$/);
  assert.equal(getAdminEventTypeLabel("CHALLENGE_RELEASE_ACTIVATED"), "배포 버전 전환");
  assert.equal(getAdminEventTypeLabel("SIGNATURE_SOLVED"), "시그니처 정답");
  assert.equal(getAdminEventTypeLabel("UNKNOWN_TYPE"), "UNKNOWN_TYPE");
  // 필터 항목에는 영문 코드를 덧붙이지 않는다
  const page = readFileSync(new URL("../pages/AdminLogsPage.jsx", import.meta.url), "utf8");
  assert.match(page, /<option key=\{item\.value\} value=\{item\.value\}>\{item\.label\}<\/option>/);
  assert.doesNotMatch(page, /PR 대기/);
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
  // 다른 이유의 503은 백엔드 문구를 보인다
  const koth = getAdminRequestError({ response: { status: 503, data: { code: "KOTH_SOURCE_UNAVAILABLE", message: "GitHub 저장소를 읽지 못했습니다" } } }, "fallback");
  assert.equal(koth.error, "GitHub 저장소를 읽지 못했습니다");
  assert.match(getAdminRequestError({ response: { status: 503 } }, "fallback").error, /리소스 브로커/);
});

test("대시보드 실패 인스턴스 칸은 저장 확인을 기다리는 참가자 수를 함께 알린다", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync(new URL("../pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
  assert.match(page, /data\?\.instances\?\.write_review \?\? 0/);
  assert.match(page, /저장 확인 대기 \$\{count\(writeReview\)\}명/);
  assert.match(page, /recover_instance_writes --show/);
});
