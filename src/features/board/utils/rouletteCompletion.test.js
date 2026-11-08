import test from "node:test";
import assert from "node:assert/strict";
import { findRouletteReceipt } from "./rouletteCompletion.js";

test("룰렛 지급 내역은 해당 칸의 지급 기록으로만 복구한다", () => {
  const data = { mileage: 730, history: [
    { type: "ROULETTE", reason: "ROULETTE_CELL:16", amount: 150 },
    { type: "CHALLENGE_SOLVE", reason: "ROULETTE_CELL:25", amount: 200 },
    { type: "ROULETTE", reason: "ROULETTE_CELL:25", amount: 200 },
  ] };
  assert.deepEqual(findRouletteReceipt(data, 25), {
    label: "마일리지 200", mileageGained: 200, totalMileage: 730, restored: true,
  });
  assert.equal(findRouletteReceipt(data, 7), null);
});

test("방문 기록이나 잘못된 지급 값은 룰렛 완료로 취급하지 않는다", () => {
  assert.equal(findRouletteReceipt({ consumed_cell_indexes: [25] }, 25), null);
  for (const amount of [0, -200, 30, "200", null]) {
    assert.equal(findRouletteReceipt({ history: [{ type: "ROULETTE", reason: "ROULETTE_CELL:25", amount }] }, 25), null);
  }
  for (const cell of [0, 37, "25", null]) assert.equal(findRouletteReceipt({ history: [] }, cell), null);
  assert.equal(findRouletteReceipt(null, 25), null);
});

test("복구 화면은 과거 지급 직후 잔액이 아닌 현재 조회 잔액을 표시한다", () => {
  const row = { type: "ROULETTE", reason: "ROULETTE_CELL:25", amount: 50, balance_after: 500 };
  assert.equal(findRouletteReceipt({ mileage: 230, history: [row] }, 25).totalMileage, 230);
  assert.equal(findRouletteReceipt({ history: [row] }, 25).totalMileage, null);
});
