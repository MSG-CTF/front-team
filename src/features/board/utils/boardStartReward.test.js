import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptMovementResult } from "./boardData.js";
import { createStartRewardRecorder, readConfirmedStartReward } from "./boardStartReward.js";

const response = (patch = {}) => adaptMovementResult({
  previous_position: 35, current_position: 3, movement_path: [36, 1, 2, 3], passed_start: true,
  start_reward: { mileage_gained: 100, roll_gained: 0 }, pending_confirm: false, ...patch,
});

test("출발칸을 다시 통과해도 새로 확정된 보상은 매번 표시한다", () => {
  const record = createStartRewardRecorder();
  const first = record(response(), "roll-1");
  const second = record(response(), "roll-2");
  assert.equal(first.mileageGained, 100);
  assert.equal(second.mileageGained, 100);
  assert.notEqual(first.token, second.token);
  assert.equal(second.kind, "lap");
});

test("지급 뒤 상태 조회가 실패해 같은 키로 재시도해도 보상 연출을 중복하지 않는다", () => {
  const record = createStartRewardRecorder();
  assert.ok(record(response(), "same-key"));
  assert.equal(record(response(), "same-key"), null);
  assert.ok(record(response(), "new-key"));
});

test("사후 카드 선택 중인 주사위의 예상 보상은 확정 전까지 표시하지 않는다", () => {
  const record = createStartRewardRecorder();
  assert.equal(record(response({ pending_confirm: true }), "pending"), null);
  assert.ok(record(response(), "pending"));
  assert.equal(record(response(), "pending"), null);
});

test("방문 기록과 이동 경로만으로 마일리지를 만들어내지 않는다", () => {
  for (const result of [null, {}, { passedStart: true }, response({ start_reward: undefined }), response({ passed_start: false })]) {
    assert.equal(readConfirmedStartReward(result, "key"), null);
  }
  assert.equal(readConfirmedStartReward(response({ start_reward: { mileage_gained: 0, roll_gained: 0 } }), "key"), null);
});

test("출발칸 도착과 통과를 구분하고 서버가 실제 충전한 주사위만 표시한다", () => {
  const landed = response({ current_position: 1, passed_start: false, start_reward: { mileage_gained: 100, roll_gained: 1 } });
  const reward = readConfirmedStartReward(landed, "start", "airport");
  assert.equal(reward.kind, "start");
  assert.equal(reward.rollGained, 1);
  assert.equal(readConfirmedStartReward(response(), "pass").rollGained, 0);
  assert.equal(readConfirmedStartReward(response({ current_position: 1 }), "full", "airport").rollGained, 0);
});

test("깨진 응답과 잘못된 요청 식별자는 보상으로 받아들이지 않는다", () => {
  for (const reward of [null, {}, { mileage_gained: -1, roll_gained: 0 }, { mileage_gained: "100", roll_gained: 0 },
    { mileage_gained: Infinity, roll_gained: 0 }, { mileage_gained: 0.5, roll_gained: 0 },
    { mileage_gained: 100, roll_gained: 4 }, { mileage_gained: 100, roll_gained: "1" }]) {
    assert.equal(readConfirmedStartReward(response({ start_reward: reward }), "key"), null);
  }
  for (const token of [null, "", 1]) assert.equal(readConfirmedStartReward(response(), token), null);
});

test("상태 재조회 전에 실제 보상을 보존하고 확정 대기 분기에서는 지급을 표시하지 않는다", () => {
  const source = readFileSync(new URL("../hooks/useBoardController.js", import.meta.url), "utf8");
  assert.match(source, /if \(rollResult.pendingConfirm\) \{[^}]+setPendingRoll\(rollResult\)/);
  for (const result of ["rollResult", "confirmResult", "moveResult"]) {
    assert.match(source, new RegExp(`showStartReward\\(${result}, idempotencyKey(?:, "airport")?\\);\\s+await syncProgress\\(\\);`));
  }
  assert.match(source, /if \(!mountedRef.current\) return;\s+const reward = startRewardRecorder.current/);
});
