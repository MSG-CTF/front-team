import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { FACE_NORMALS } from "./diceOrientation.js";
import { createDiceMotion, DICE_CAMERA, DICE_CANVAS_ASPECT, DICE_FLOOR_Y, DICE_HALF_EXTENT, DICE_LOOK_AT, dicePhysicalTime, dieSupportHeight, restingDie, sampleDiceMotion } from "./diceMotion.js";

const current = () => [restingDie(0), restingDie(1)];
const seeded = (initial) => {
  let seed = initial;
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
};
const camera = new PerspectiveCamera(DICE_CAMERA.fov, DICE_CANVAS_ASPECT, DICE_CAMERA.near, DICE_CAMERA.far);
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
        assertInside(pose, motion.scale, 0.89, 0.87);
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
test("200번 재굴림도 공중에서 던져지고 두 눈금이 클릭 영역 안에 보인다", () => {
  let poses = current();
  const random = seeded(43);
  for (let i = 0; i < 200; i++) {
    const motions = createDiceMotion(poses, { diceA: i % 6 + 1, diceB: (i + 3) % 6 + 1 }, random);
    motions.forEach((motion) => {
      assert.ok(motion.duration > 0 && motion.duration < 3.5);
      const first = sampleDiceMotion(motion, 0);
      assert.ok(first.position.y - motion.end.y > 3);
      // 서로 부딪힌 뒤 되튈 수 있으므로 최종 위치가 아닌 출발 방향을 확인한다
      assert.ok(first.position.x - sampleDiceMotion(motion, 0.15).position.x > 0.45);
      assert.ok(motion.groundImpacts[0] > 0.35);
    });
    poses = motions.map((motion) => sampleDiceMotion(motion, 10));
    const topBounds = poses.map((pose, index) => {
      assertInside(pose, motions[index].scale, 0.4, 0.22222);
      const points = [];
      const half = DICE_HALF_EXTENT * motions[index].scale;
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const point = new Vector3(x, y, z).multiplyScalar(half).applyQuaternion(pose.quaternion).add(pose.position);
        if (point.y > pose.position.y + half * 0.9) points.push(point.project(camera));
      }
      return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) };
    });
    const [a, b] = topBounds;
    assert.ok(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
  }
});

test("같은 결과 눈금이라도 투척 방향과 회전·충돌 시점이 달라진다", () => {
  const paths = new Set();
  const results = { diceA: 3, diceB: 3 };
  for (let seed = 1; seed <= 20; seed++) {
    const motions = createDiceMotion(current(), results, seeded(seed));
    assert.notEqual(motions[0].start.y, motions[1].start.y);
    paths.add(JSON.stringify(motions.map((motion) => ({
      position: sampleDiceMotion(motion, 1).position.toArray(),
      rotation: sampleDiceMotion(motion, 1).quaternion.toArray(),
      impacts: motion.impacts,
    }))));
  }
  assert.equal(paths.size, 20);
  const one = createDiceMotion(current(), results, seeded(12));
  const two = createDiceMotion(current(), results, seeded(12));
  assert.deepEqual(one.map((motion) => sampleDiceMotion(motion, 0.3)), two.map((motion) => sampleDiceMotion(motion, 0.3)));
});

test("눈금 회전은 처음부터 고정되어 비행 중 추가 보정이 없다", () => {
  for (const motion of createDiceMotion(current(), { diceA: 4, diceB: 2 }, seeded(15))) {
    for (let elapsed = 0; elapsed < motion.playbackDuration; elapsed += 1 / 120) {
      const frame = dicePhysicalTime(motion, elapsed) * 120;
      const index = Math.min(Math.floor(frame), motion.frames.length - 2);
      const expected = motion.frames[index].quaternion.clone().slerp(motion.frames[index + 1].quaternion, frame - index).multiply(motion.correction);
      const actual = sampleDiceMotion(motion, elapsed).quaternion;
      assert.ok(actual.angleTo(expected) < 1e-7);
    }
  }
});

test("바닥 충돌 뒤 두 주사위 모두 두 번 이상 면이 바뀌며 굴러간다", () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const motion of createDiceMotion(current(), { diceA: 1, diceB: 6 }, seeded(seed))) {
      let previousFace = null, changes = 0, lastChange = 0, distance = 0;
      const firstFrame = Math.ceil(motion.groundImpacts[0] * 120);
      for (let index = firstFrame; index < motion.frames.length; index++) {
        const pose = motion.frames[index];
        const [face, height] = Object.entries(FACE_NORMALS)
          .map(([face, normal]) => [face, new Vector3(...normal).applyQuaternion(pose.quaternion).y])
          .sort((a, b) => b[1] - a[1])[0];
        if (height > 0.9 && face !== previousFace) {
          if (previousFace !== null) { changes++; lastChange = index / 120; }
          previousFace = face;
        }
        if (index > firstFrame && pose.position.y - dieSupportHeight(pose.quaternion, motion.scale) < DICE_FLOOR_Y + 0.15) {
          distance += pose.position.distanceTo(motion.frames[index - 1].position);
        }
      }
      assert.ok(changes >= 2);
      assert.ok(lastChange - motion.groundImpacts[0] > 0.45);
      assert.ok(distance > 1.8, "제자리 회전이나 공중 체공만 길어지면 안 됨");
    }
  }
});

test("공중 투척은 원래 속도를 유지하고 바닥 구간만 같은 시계로 감속한다", () => {
  const [one, two] = createDiceMotion(current(), { diceA: 2, diceB: 5 }, seeded(43));
  assert.equal(one.groundAt, two.groundAt);
  assert.equal(one.groundRate, two.groundRate);
  assert.equal(dicePhysicalTime(one, one.groundAt), one.groundAt);
  assert.equal(dicePhysicalTime(one, 0.3), 0.3);
  assert.ok(dicePhysicalTime(one, one.groundAt + 0.6) < one.groundAt + 0.6);
  assert.ok(Math.abs(dicePhysicalTime(one, one.playbackDuration) - one.physicalDuration) < 1e-8);
  const epsilon = 0.00001;
  const contactSpeed = (dicePhysicalTime(one, one.groundAt + epsilon) - one.groundAt) / epsilon;
  assert.ok(Math.abs(contactSpeed - 1) < 0.001);
});

test("검증 경로를 사용할 때도 직전과 같은 투척을 연속으로 반복하지 않는다", () => {
  const previous = createDiceMotion(current(), { diceA: 3, diceB: 3 }, () => 0.75);
  const next = createDiceMotion(previous.map(motion => sampleDiceMotion(motion, 10)), { diceA: 3, diceB: 3 }, () => 0.75);
  assert.ok(previous.some((motion, index) => motion.end.distanceTo(next[index].end) > 0.03));
});

test("재시도 한도에 도달해도 검증된 물리 경로로 굴림을 유지한다", () => {
  const motions = createDiceMotion(current(), { diceA: 2, diceB: 5 }, () => 0.75);
  motions.forEach((motion, index) => {
    assert.equal(motion.usedReferenceThrow, true);
    assert.ok(motion.frames.length > 120 && motion.duration > 1);
    const pose = sampleDiceMotion(motion, 10);
    assert.ok(new Vector3(...FACE_NORMALS[index === 0 ? 2 : 5]).applyQuaternion(pose.quaternion).distanceTo(new Vector3(0, 1, 0)) < 1e-8);
    assertInside(pose, motion.scale, 0.4, 0.22222);
  });
});

test("프레임 수와 무관하게 같은 시각에는 같은 자세를 재생한다", () => {
  const motion = createDiceMotion(current(), { diceA: 1, diceB: 6 }, seeded(9))[0];
  const expected = sampleDiceMotion(motion, 0.7);
  for (let t = 0; t < 0.7; t += 1 / 30) sampleDiceMotion(motion, t);
  assert.deepEqual(sampleDiceMotion(motion, 0.7), expected);
  assert.deepEqual(sampleDiceMotion(motion, 0.2), sampleDiceMotion(motion, 0.2));
});
