import test from "node:test";
import assert from "node:assert/strict";
import { createTrainChuffPlan, getTrainMotion, trainTimeAtDistance } from "./trainMotion.js";

test("출발은 정지에서 가속하고 정속 주행 후 목적지에서 다시 정지한다", () => {
  assert.deepEqual(getTrainMotion(0), { distanceRatio: 0, speedRatio: 0 });
  assert.deepEqual(getTrainMotion(1), { distanceRatio: 1, speedRatio: 0 });
  assert.ok(getTrainMotion(.1).speedRatio < getTrainMotion(.2).speedRatio);
  assert.ok(getTrainMotion(.2).speedRatio < getTrainMotion(.36).speedRatio);
  assert.equal(getTrainMotion(.5).speedRatio, 1);
  assert.equal(getTrainMotion(.7).speedRatio, 1);
  assert.ok(getTrainMotion(.8).speedRatio > getTrainMotion(.9).speedRatio);
  assert.ok(getTrainMotion(.1).distanceRatio < .01, "출발 직후 튀어나가면 안 됨");
  let previous = 0;
  for (let step = 0; step <= 1000; step++) {
    const { distanceRatio, speedRatio } = getTrainMotion(step / 1000);
    assert.ok(distanceRatio >= previous && distanceRatio <= 1);
    assert.ok(speedRatio >= 0 && speedRatio <= 1);
    previous = distanceRatio;
  }
});

test("가속과 감속 경계의 위치와 속도가 연속이고 속도는 거리 변화율에 비례한다", () => {
  for (const boundary of [.36, .74]) {
    const before = getTrainMotion(boundary - 1e-6);
    const after = getTrainMotion(boundary + 1e-6);
    assert.ok(Math.abs(after.distanceRatio - before.distanceRatio) < 4e-6);
    assert.ok(Math.abs(after.speedRatio - before.speedRatio) < 1e-6);
  }
  for (const t of [.05, .2, .5, .8, .95]) {
    const rate = (getTrainMotion(t + 1e-5).distanceRatio - getTrainMotion(t - 1e-5).distanceRatio) / 2e-5;
    assert.ok(Math.abs(rate * .69 - getTrainMotion(t).speedRatio) < 1e-6);
  }
});

test("소리와 연기의 예약 시각은 실제 이동 거리에서 역산한다", () => {
  for (const distance of [0, .003, .1, .25, .5, .8, .997, 1]) {
    assert.ok(Math.abs(getTrainMotion(trainTimeAtDistance(distance)).distanceRatio - distance) < 1e-6);
  }
  for (const duration of [2285, 3900, 4400]) {
    const plan = createTrainChuffPlan(duration);
    assert.ok(plan.length >= 8 && plan.length <= 22);
    const gaps = plan.slice(1).map((beat, index) => beat.at - plan[index].at);
    const middle = gaps[Math.floor(gaps.length / 2)];
    assert.ok(gaps[0] > middle * 2, "출발 때는 느린 칙칙 소리가 나야 함");
    assert.ok(gaps.at(-1) > middle * 1.7, "도착 전에 소리도 느려져야 함");
    assert.ok(middle >= 130, "고속 구간에서도 소리가 한꺼번에 쏟아지면 안 됨");
    plan.forEach((beat, index) => {
      assert.ok(beat.at > 0 && beat.at < duration);
      assert.equal(beat.accent, index % 4);
      assert.ok(Math.abs(getTrainMotion(beat.at / duration).distanceRatio - (.003 + index / (plan.length - 1) * .994)) < 1e-6);
    });
  }
});

test("잘못된 진행률과 지속 시간은 무한 이동이나 무한 재생을 만들지 않는다", () => {
  for (const value of [NaN, Infinity, -1]) assert.equal(getTrainMotion(value).distanceRatio, 0);
  assert.equal(getTrainMotion(2).distanceRatio, 1);
  for (const duration of [undefined, NaN, Infinity, -1, 0, 999999]) assert.deepEqual(createTrainChuffPlan(duration), []);
});
