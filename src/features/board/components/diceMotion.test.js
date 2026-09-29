import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { FACE_NORMALS } from "./diceOrientation.js";
import { createDiceMotion, DICE_FLOOR_Y, dieSupportHeight, restingDie, sampleDiceMotion } from "./diceMotion.js";

const current = () => [restingDie(0), restingDie(1)];
test("36가지 서버 눈금 조합이 회전과 반동 후 정확히 위를 향한다", () => {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const motions = createDiceMotion(current(), { diceA: a, diceB: b }, () => 0.5);
    motions.forEach((motion, index) => {
      const pose = sampleDiceMotion(motion, 10);
      const normal = new Vector3(...FACE_NORMALS[index === 0 ? a : b]).applyQuaternion(pose.quaternion);
      assert.ok(normal.distanceTo(new Vector3(0, 1, 0)) < 1e-8);
      assert.equal(pose.done, true);
      assert.equal(pose.phase, "rest");
      assert.ok(Math.abs(pose.position.y - DICE_FLOOR_Y - dieSupportHeight(pose.quaternion, motion.scale)) < 1e-8);
    });
  }
});
test("던지기, 두 번의 반동과 마무리 중 주사위가 바닥을 뚫지 않는다", () => {
  const motions = createDiceMotion(current(), { diceA: 6, diceB: 1 }, () => 0.35);
  for (const motion of motions) {
    for (let t = 0; t <= 2; t += 1 / 120) {
      const pose = sampleDiceMotion(motion, t);
      assert.ok(pose.position.y - dieSupportHeight(pose.quaternion, motion.scale) >= DICE_FLOOR_Y - 1e-8);
      assert.ok([...pose.position.toArray(), ...pose.quaternion.toArray()].every(Number.isFinite));
    }
    const liftAt = (progress) => {
      const pose = sampleDiceMotion(motion, motion.delay + motion.duration * progress);
      return pose.position.y - DICE_FLOOR_Y - dieSupportHeight(pose.quaternion, motion.scale);
    };
    assert.ok(liftAt(0.275) > liftAt(0.645));
    assert.ok(liftAt(0.645) > liftAt(0.8));
  }
});
test("모션 줄이기는 중간 회전 없이 같은 결과로 끝나며 잘못된 눈금을 만들지 않는다", () => {
  const motion = createDiceMotion(current(), { diceA: 2, diceB: 5 }, () => 0.5)[0];
  const normal = sampleDiceMotion(motion, 10);
  const reduced = sampleDiceMotion(motion, 0, true);
  assert.ok(reduced.position.distanceTo(normal.position) < 1e-8);
  assert.deepEqual(reduced.quaternion.toArray(), normal.quaternion.toArray());
  assert.equal(reduced.done, true);
  for (const value of [null, {}, { diceA: 0, diceB: 7 }, { diceA: "3", diceB: 2 }, { diceA: 1.5, diceB: 2 }]) assert.equal(createDiceMotion(current(), value), null);
});
test("재굴림은 현재 위치에서 이어지고 두 주사위의 최종 위치는 겹치지 않는다", () => {
  let poses = current();
  for (let i = 0; i < 30; i++) {
    const motions = createDiceMotion(poses, { diceA: i % 6 + 1, diceB: (i + 3) % 6 + 1 });
    motions.forEach((motion, index) => assert.ok(sampleDiceMotion(motion, 0).position.distanceTo(poses[index].position) < 1e-8));
    poses = motions.map((motion) => sampleDiceMotion(motion, 10));
    assert.ok(poses[0].position.distanceTo(poses[1].position) >= 5.1);
  }
});
