import test from "node:test";
import assert from "node:assert/strict";
import { createTrainJourney, presentTrainJourney, sampleTrainJourney } from "./trainJourney.js";
import { getBoardCellPosition } from "./boardData.js";
import { TRAIN_CAR_OFFSETS } from "./trainLayout.js";

test("기차 출발과 도착은 서버 위치에 맞추고 연출용 경로는 응답을 수정하지 않는다", () => {
  const result = Object.freeze({ previousPosition: 21, currentPosition: 5, movementPath: Object.freeze([5]) });
  const journey = createTrainJourney(result);
  assert.deepEqual(journey.cells, [21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,1,2,3,4,5]);
  for (const [progress, cell] of [[0,21],[1,5]]) {
    const frame = sampleTrainJourney(journey, progress);
    const expected = getBoardCellPosition(cell);
    assert.ok(Math.abs(frame.x - expected.x) < .000001);
    assert.ok(Math.abs(frame.y - expected.y) < .000001);
  }
  assert.deepEqual(result.movementPath, [5]);
});

test("36개 출발점 모두 짧은 이동과 긴 이동을 곡선으로 연결한다", () => {
  for (let start = 1; start <= 36; start += 1) for (const step of [1, 8, 35]) {
    const end = (start - 1 + step) % 36 + 1;
    const journey = createTrainJourney({ previousPosition: start, currentPosition: end });
    assert.equal(journey.cells.length, step + 1);
    assert.ok(journey.duration >= 2200 && journey.duration <= 4400);
    let previous = 0;
    for (let t = 0; t <= 1; t += .025) {
      const pose = sampleTrainJourney(journey, t);
      assert.ok(pose.x >= 0 && pose.x <= 100 && pose.y >= 0 && pose.y <= 100);
      assert.ok(Number.isFinite(pose.heading));
      assert.ok(pose.speedRatio >= 0 && pose.speedRatio <= 1);
      assert.ok(pose.distance >= previous);
      previous = pose.distance;
    }
  }
});

test("잘못된 위치나 제자리 이동은 연출하지 않고 긴 응답의 연출 경로도 제한한다", () => {
  for (const data of [null, {}, { previousPosition: 0, currentPosition: 2 }, { previousPosition: 21, currentPosition: 37 }, { previousPosition: 21, currentPosition: 21 }]) assert.equal(createTrainJourney(data), null);
  const route = createTrainJourney({ previousPosition: 21, currentPosition: 5, movementPath: Array(1000).fill(2).flatMap(x => [x, 1]) });
  assert.equal(route.cells.at(-1), 5);
  assert.ok(route.cells.length <= 108);
});

test("서버 경유 순서는 유지하되 연속 중복 칸을 제거한다", () => {
  const route = createTrainJourney({ previousPosition: 21, currentPosition: 24, movementPath: [21,22,22,23,24] });
  assert.deepEqual(route.cells, [21,22,23,24]);
});

test("긴 기차의 뒤차도 같은 궤도를 따라가고 출발 시 한 점에 겹치지 않는다", () => {
  for (let start = 1; start <= 36; start += 1) {
    const journey = createTrainJourney({ previousPosition: start, currentPosition: start % 36 + 1 });
    for (const progress of [0, .25, .5, .75, 1]) {
      const pose = sampleTrainJourney(journey, progress);
      assert.equal(pose.cars.length, 3);
      pose.cars.forEach((car, index) => {
        assert.ok([car.x, car.z, car.heading].every(Number.isFinite));
        const distance = Math.hypot(car.x, car.z);
        assert.ok(distance > TRAIN_CAR_OFFSETS[index] * .68 && distance <= TRAIN_CAR_OFFSETS[index] + .01);
        if (index > 0) assert.ok(Math.hypot(car.x - pose.cars[index - 1].x, car.z - pose.cars[index - 1].z) > 1.7);
      });
    }
  }
});

test("기차 렌더러 실패는 서버가 성공한 이동 결과를 바꾸지 않는다", async () => {
  const result = { currentPosition: 5, movementPath: [5] };
  let count = 0;
  await presentTrainJourney(result, async data => { assert.equal(data, result); count += 1; throw new Error("WebGL lost"); }, () => assert.fail("이동을 두 번 재생하면 안 됨"));
  assert.equal(count, 1);
  await presentTrainJourney(result, undefined, async path => assert.deepEqual(path, [5]));
});
