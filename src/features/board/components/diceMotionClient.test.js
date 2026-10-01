import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { createDiceMotion } from "./diceMotion.js";
import { FACE_NORMALS } from "./diceOrientation.js";
import { restingDie, sampleDiceMotion } from "./dicePose.js";
import { packDiceMotions, unpackDiceMotions } from "./diceMotionCodec.js";
import { createDiceMotionClient } from "./diceMotionClient.js";

const poses = () => [restingDie(0), restingDie(1)];
function clientFixture() {
  const jobs = new Map();
  let nextId = 0;
  const worker = { messages: [], terminated: false, postMessage(message) { this.messages.push(message); }, terminate() { this.terminated = true; } };
  const client = createDiceMotionClient({ createWorker: () => worker,
    setTimer(callback) { const id = ++nextId; jobs.set(id, callback); return id; }, clearTimer(id) { jobs.delete(id); },
  });
  return { client, worker, jobs };
}
const assertFaces = (motions, result) => motions.forEach((motion, index) => {
  const pose = sampleDiceMotion(motion, 10);
  assert.ok(new Vector3(...FACE_NORMALS[index === 0 ? result.diceA : result.diceB]).applyQuaternion(pose.quaternion).distanceTo(new Vector3(0, 1, 0)) < 1e-8);
});

test("전송한 주사위 경로를 복원해도 모든 프레임과 서버 눈금은 같다", () => {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const result = { diceA: a, diceB: b };
    const original = createDiceMotion(poses(), result, () => 0.5);
    const packed = packDiceMotions(original);
    const restored = unpackDiceMotions(structuredClone(packed, { transfer: packed.map(motion => motion.frames.buffer) }));
    assert.deepEqual(restored, original);
    for (let index = 0; index < 2; index++) for (const time of [0, 0.1, 0.5, 1, 2, 10]) {
      assert.deepEqual(sampleDiceMotion(restored[index], time), sampleDiceMotion(original[index], time));
    }
    assertFaces(restored, result);
  }
});

test("비동기 계산은 결과를 받을 때만 끝나고 오래된 응답은 무시한다", async () => {
  const { client, worker, jobs } = clientFixture();
  const result = { diceA: 2, diceB: 6 };
  const promise = client.compute(poses(), result);
  const id = worker.messages[0].id;
  worker.onmessage({ data: { id: id + 100, failed: true } });
  assert.equal(jobs.size, 1);
  worker.onmessage({ data: { id, motions: packDiceMotions(createDiceMotion(poses(), result, () => 0.5)) } });
  assertFaces(await promise, result);
  assert.equal(jobs.size, 0);
  client.dispose();
});

test("worker 오류·시간 초과·깨진 응답에도 서버 눈금으로 끝나고 대기를 남기지 않는다", async () => {
  for (const failure of ["error", "timeout", "malformed", "postMessage"]) {
    const { client, worker, jobs } = clientFixture();
    if (failure === "postMessage") worker.postMessage = () => { throw new Error("전송 실패"); };
    const result = { diceA: 4, diceB: 1 };
    const promise = client.compute(poses(), result);
    if (failure === "error") worker.onerror({ preventDefault() {} });
    if (failure === "timeout") [...jobs.values()][0]();
    if (failure === "malformed") worker.onmessage({ data: { id: worker.messages[0].id, motions: [{}] } });
    assertFaces(await promise, result);
    assert.equal(worker.terminated, true);
    assert.equal(jobs.size, 0);
    assertFaces(await client.compute(poses(), { diceA: 5, diceB: 3 }), { diceA: 5, diceB: 3 });
    client.dispose();
  }
});

test("worker를 쓸 수 없거나 모션 줄이기를 선택하면 무거운 계산 없이 같은 결과를 보여준다", async () => {
  const client = createDiceMotionClient({ createWorker() { throw new Error("worker 제한"); } });
  assertFaces(await client.compute(poses(), { diceA: 3, diceB: 5 }), { diceA: 3, diceB: 5 });
  client.dispose();
  const { client: normal, worker, jobs } = clientFixture();
  const reduced = await normal.compute(poses(), { diceA: 6, diceB: 2 }, true);
  assertFaces(reduced, { diceA: 6, diceB: 2 });
  assert.equal(worker.messages.length, 0);
  assert.equal(jobs.size, 0);
  assert.equal(await normal.compute(poses(), { diceA: 7, diceB: 2 }, true), null);
  normal.dispose();
});

test("화면을 떠나면 계산 중인 Promise와 타이머를 정리한다", async () => {
  const { client, worker, jobs } = clientFixture();
  const pending = client.compute(poses(), { diceA: 2, diceB: 3 });
  const id = worker.messages[0].id;
  client.dispose();
  assert.equal(await pending, null);
  assert.equal(jobs.size, 0);
  assert.equal(worker.terminated, true);
  worker.onmessage({ data: { id, failed: true } });
  assert.equal(await client.compute(poses(), { diceA: 2, diceB: 3 }), null);
});
