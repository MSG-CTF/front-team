import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { FACE_NORMALS } from "./diceOrientation.js";
import { createDiceMotion, DICE_CAMERA, DICE_FLOOR_Y, DICE_HALF_EXTENT, DICE_LOOK_AT, dieSupportHeight, restingDie, sampleDiceMotion } from "./diceMotion.js";

const current = () => [restingDie(0), restingDie(1)];
const seeded = (initial) => {
  let seed = initial;
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
};
const camera = new PerspectiveCamera(DICE_CAMERA.fov, (951 / 714) * 0.6 / 0.48, DICE_CAMERA.near, DICE_CAMERA.far);
camera.position.set(...DICE_CAMERA.position);
camera.lookAt(...DICE_LOOK_AT);
camera.updateMatrixWorld();
const assertInside = (pose, scale, limitX, limitY) => {
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = new Vector3(x, y, z).multiplyScalar(DICE_HALF_EXTENT * scale).applyQuaternion(pose.quaternion).add(pose.position).project(camera);
    assert.ok(Math.abs(corner.x) < limitX && Math.abs(corner.y) < limitY, `모서리가 표시 영역을 벗어남: ${corner.x}, ${corner.y}`);
  }
};

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
test("투척과 충돌 중 바닥을 뚫거나 순간적으로 위치가 바뀌지 않는다", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const motions = createDiceMotion(current(), { diceA: 6, diceB: 1 }, seeded(seed));
    for (const motion of motions) {
      assert.ok(motion.frames?.length > 120);
      assert.ok(motion.impacts.length > 0);
      let previous = sampleDiceMotion(motion, 0);
      for (let t = 1 / 120; t <= motion.duration; t += 1 / 120) {
        const pose = sampleDiceMotion(motion, t);
        assert.ok(pose.position.y - dieSupportHeight(pose.quaternion, motion.scale) >= DICE_FLOOR_Y - 1e-8);
        assert.ok([...pose.position.toArray(), ...pose.quaternion.toArray()].every(Number.isFinite));
        assert.ok(pose.position.distanceTo(previous.position) < 0.45);
        assert.ok(pose.quaternion.angleTo(previous.quaternion) < 0.7);
        assertInside(pose, motion.scale, 1, 1);
        previous = pose;
      }
      const beforeSettle = motion.frames.at(-1).quaternion.clone().multiply(motion.correction);
      assert.ok(beforeSettle.angleTo(motion.target) < 0.035, "착지한 뒤 다른 면으로 돌려 맞추면 안 됨");
    }
  }
});
test("모션 줄이기는 중간 회전 없이 같은 결과로 끝나며 잘못된 눈금을 만들지 않는다", () => {
  const motion = createDiceMotion(current(), { diceA: 2, diceB: 5 }, () => 0.5)[0];
  const normal = sampleDiceMotion(motion, 10);
  const reduced = sampleDiceMotion(motion, 0, true);
  assert.ok(reduced.position.distanceTo(normal.position) < 1e-8);
  assert.deepEqual(reduced.quaternion.toArray(), normal.quaternion.toArray());
  assert.equal(reduced.done, true);
  const instant = createDiceMotion(current(), { diceA: 6, diceB: 2 }, () => { throw new Error("모션 줄이기는 물리 계산과 난수가 필요 없음"); }, true);
  instant.forEach((entry, index) => {
    const pose = sampleDiceMotion(entry, 0);
    assert.equal(pose.done, true);
    assert.ok(pose.position.distanceTo(current()[index].position) < 1e-8);
    assert.ok(new Vector3(...FACE_NORMALS[index === 0 ? 6 : 2]).applyQuaternion(pose.quaternion).distanceTo(new Vector3(0, 1, 0)) < 1e-8);
  });
  for (const value of [null, {}, { diceA: 0, diceB: 7 }, { diceA: "3", diceB: 2 }, { diceA: 1.5, diceB: 2 }]) assert.equal(createDiceMotion(current(), value), null);
});
test("200번 재굴림은 현재 위치에서 이어지고 두 눈금이 나란히 보인다", () => {
  let poses = current();
  const random = seeded(43);
  for (let i = 0; i < 200; i++) {
    const motions = createDiceMotion(poses, { diceA: i % 6 + 1, diceB: (i + 3) % 6 + 1 }, random);
    motions.forEach((motion, index) => {
      assert.ok(motion.duration > 0 && motion.duration < 3);
      const first = sampleDiceMotion(motion, 0);
      assert.ok(first.position.distanceTo(poses[index].position) < 1e-8);
      assert.ok(first.quaternion.angleTo(poses[index].quaternion) < 1e-7);
    });
    poses = motions.map((motion) => sampleDiceMotion(motion, 10));
    const width = poses.map((pose, index) => {
      const localX = new Vector3(1, 0, 0).applyQuaternion(pose.quaternion.clone().invert());
      assertInside(pose, motions[index].scale, 0.73333, 0.66667);
      return (Math.abs(localX.x) + Math.abs(localX.y) + Math.abs(localX.z)) * DICE_HALF_EXTENT * motions[index].scale;
    });
    assert.ok(Math.abs(poses[0].position.x - poses[1].position.x) > width[0] + width[1] + 0.1);
  }
});

test("같은 결과 눈금이라도 투척 방향과 회전·충돌 시점이 달라진다", () => {
  const paths = new Set();
  const results = { diceA: 3, diceB: 3 };
  for (let seed = 1; seed <= 20; seed++) {
    const motions = createDiceMotion(current(), results, seeded(seed));
    assert.notEqual(motions[0].launchAt, motions[1].launchAt);
    paths.add(JSON.stringify(motions.map((motion) => ({
      position: sampleDiceMotion(motion, 0.3).position.toArray(),
      rotation: sampleDiceMotion(motion, 0.3).quaternion.toArray(),
      impacts: motion.impacts,
    }))));
  }
  assert.equal(paths.size, 20);
  const one = createDiceMotion(current(), results, seeded(12));
  const two = createDiceMotion(current(), results, seeded(12));
  assert.deepEqual(one.map((motion) => sampleDiceMotion(motion, 0.3)), two.map((motion) => sampleDiceMotion(motion, 0.3)));
});

test("프레임 수와 무관하게 같은 시각에는 같은 자세를 재생한다", () => {
  const motion = createDiceMotion(current(), { diceA: 1, diceB: 6 }, seeded(9))[0];
  const expected = sampleDiceMotion(motion, 0.7);
  for (let t = 0; t < 0.7; t += 1 / 30) sampleDiceMotion(motion, t);
  assert.deepEqual(sampleDiceMotion(motion, 0.7), expected);
  assert.deepEqual(sampleDiceMotion(motion, 0.2), sampleDiceMotion(motion, 0.2));
});
