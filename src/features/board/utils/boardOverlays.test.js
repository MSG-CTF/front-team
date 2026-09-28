import test from "node:test";
import assert from "node:assert/strict";
import {
  ROULETTE_SEGMENTS,
  ROULETTE_VALUES,
  buildRouletteGradient,
  formatOpenChallengeNumber,
  getAirportSelectableCellIndexes,
  getRouletteRotation,
  getRouletteSegmentAt,
  isAirportSelectionMode,
} from "./boardOverlays.js";

test("룰렛 휠은 명세 값 50/100/150/200만 담는다", () => {
  assert.deepEqual([...new Set(ROULETTE_SEGMENTS)].sort((a, b) => a - b), [...ROULETTE_VALUES]);
  assert.match(buildRouletteGradient(), /^conic-gradient\(/);
});

test("룰렛은 서버가 준 마일리지 칸에 멈추고 항상 앞으로 여러 바퀴 돈다", () => {
  for (const value of ROULETTE_VALUES) {
    for (const pick of [0, 0.99]) {
      for (const current of [0, 725, 1800.5]) {
        const rotation = getRouletteRotation(value, current, () => pick);
        assert.equal(getRouletteSegmentAt(rotation), value);
        assert.ok(rotation - current >= 5 * 360);
      }
    }
  }
});

test("휠에 없는 마일리지는 회전각을 만들지 않는다", () => {
  assert.equal(getRouletteRotation(30, 0), null);
});

test("기차여행 선택 모드는 먼저 끝낼 단계가 없고 아직 쓰지 않았을 때만 켜진다", () => {
  const base = { currentCell: { type: "AIRPORT" }, myBoard: { airportMoveUsed: false } };
  assert.equal(isAirportSelectionMode(base), true);
  assert.equal(isAirportSelectionMode({ ...base, myBoard: { airportMoveUsed: true } }), false);
  assert.equal(isAirportSelectionMode({ ...base, pendingRoll: {} }), false);
  assert.equal(isAirportSelectionMode({ ...base, awaitingDiscard: true }), false);
  assert.equal(isAirportSelectionMode({ ...base, blockedReason: "PENDING_CONFIRM" }), false);
  assert.equal(isAirportSelectionMode({ ...base, currentCell: { type: "CHANCE" } }), false);
});

test("기차여행 목적지는 소모된 칸과 현재 칸을 제외한다", () => {
  const cells = [1, 2, 3, 21].map((cellIndex) => ({ cellIndex }));
  assert.deepEqual([...getAirportSelectableCellIndexes(cells, [1, 3], 21)], [2]);
});

test("열린 문제 번호는 두 자리로 표시한다", () => {
  assert.equal(formatOpenChallengeNumber(0), "01");
  assert.equal(formatOpenChallengeNumber(11), "12");
});
