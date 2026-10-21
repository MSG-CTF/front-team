import test from "node:test";
import assert from "node:assert/strict";
import { adaptDiceStatus, adaptMovementResult } from "./boardData.js";

test("다른 브라우저와 새로고침에서도 서버가 발급한 같은 이동 확정 키를 보존한다", () => {
  const key = "dice-confirm-request-40000000-0000-4000-8000-000000000001";
  const rolled = adaptMovementResult({ pending_confirm: true, pending_confirm_request_key: key });
  const reloaded = adaptDiceStatus({ blocked_reason: "PENDING_CONFIRM", pending_confirm_request_key: key });
  assert.equal(rolled.confirmRequestKey, key);
  assert.equal(reloaded.pendingConfirmRequestKey, key);
  const next = adaptDiceStatus({ pending_confirm_request_key: key.replace(/1$/, "2") });
  assert.notEqual(next.pendingConfirmRequestKey, rolled.confirmRequestKey);
});

test("이동 확정 키가 없는 이전 백엔드 응답에 새 키를 만들어 끼우지 않는다", () => {
  assert.equal(adaptMovementResult({ pending_confirm: true }).confirmRequestKey, undefined);
  assert.equal(adaptDiceStatus({ blocked_reason: "PENDING_CONFIRM" }).pendingConfirmRequestKey, undefined);
  assert.equal(adaptDiceStatus({ pendingConfirmRequestKey: "camelCase" }).pendingConfirmRequestKey, undefined);
});
