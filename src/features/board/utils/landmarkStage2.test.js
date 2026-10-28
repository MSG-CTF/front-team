import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getVisibleStage2Landmarks, LANDMARK_STAGE2 } from "./landmarkStage2.js";

const special = { 7: "CHANCE", 16: "ROULETTE", 21: "AIRPORT", 25: "ROULETTE", 30: "CHANCE" };
const cells = LANDMARK_STAGE2.map(({ cellIndex }) => ({ cellIndex, type: special[cellIndex] ?? "CHALLENGE" }));
const visible = (states = [], consumed = []) => getVisibleStage2Landmarks(cells,
  new Map(states.map(([index, status]) => [index, { status }])), consumed).map((item) => item.cellIndex);

test("START를 제외한 35칸에 음식이 하나씩 매핑된다", () => {
  assert.deepEqual(LANDMARK_STAGE2.map((item) => item.cellIndex), Array.from({ length: 35 }, (_, index) => index + 2));
  assert.equal(new Set(LANDMARK_STAGE2.map((item) => item.food)).size, 35);
  for (const item of LANDMARK_STAGE2) {
    assert.ok(existsSync(fileURLToPath(new URL(`../../../../public/models/landmarks-stage2/${item.food}.glb`, import.meta.url))), item.food);
  }
});

test("일반 칸은 CLEARED에서만 표시하고 상태가 해제되면 사라진다", () => {
  assert.deepEqual(visible([[2, "CLEARED"]]), [2]);
  for (const status of ["OPENED", "CONSUMED", "UNVISITED"]) {
    assert.deepEqual(visible([[2, status]], [2]), []);
  }
  assert.deepEqual(visible(), []);
});

test("특수칸은 서버 소모 기록으로만 표시하고 현재 위치는 사용하지 않는다", () => {
  assert.deepEqual(visible([], [7, 16, 21, 25, 30]), [7, 16, 21, 25, 30]);
  assert.deepEqual(visible([[21, "CONSUMED"]]), [21]);
  assert.deepEqual(visible([[7, "OPENED"]]), []);
  assert.deepEqual(visible(), []);
});
