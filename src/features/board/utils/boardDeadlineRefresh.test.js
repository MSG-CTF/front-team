import test from "node:test";
import assert from "node:assert/strict";
import { scheduleBoardDeadlineRefresh } from "./boardDeadlineRefresh.js";

const status = { serverTime: "2026-10-01T10:00:00+09:00", receivedAt: 1000 };
const due = ["dice", "challenge"].map(key => ({ key, targetIso: status.serverTime }));
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function clock() {
  let current = 1000;
  let nextId = 0;
  const jobs = new Map();
  const completed = new Set();
  const errors = [];
  let recovered = 0;
  const visibility = new EventTarget();
  visibility.hidden = false;
  const options = {
    completed, visibility, now: () => current,
    setTimer(callback, delay) { const id = ++nextId; jobs.set(id, { callback, delay }); return id; },
    clearTimer(id) { jobs.delete(id); },
    onError(error, state) { errors.push({ error, ...state }); },
    onRecovered() { recovered++; },
  };
  return { options, jobs, completed, errors, visibility, recovered: () => recovered,
    fire() { const [id, job] = [...jobs][0] ?? []; if (job) { jobs.delete(id); current += job.delay; job.callback(); } },
    advance(ms) { current += ms; },
  };
}

test("충전과 문제 제한이 함께 끝나면 조회 하나가 성공한 뒤 둘 다 완료한다", async () => {
  const env = clock();
  let calls = 0;
  let finish;
  const dispose = scheduleBoardDeadlineRefresh(due, status, () => { calls++; return new Promise(resolve => { finish = resolve; }); }, env.options);
  await flush();
  assert.equal(calls, 1);
  assert.equal(env.completed.size, 0);
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(calls, 1);
  finish();
  await flush();
  assert.deepEqual([...env.completed], ["dice", "challenge"]);
  assert.equal(env.recovered(), 1);
  assert.equal(env.jobs.size, 0);
  dispose();
});

test("첫 조회 실패는 만료를 완료시키지 않고 재시도 성공 후 복구한다", async () => {
  const env = clock();
  let calls = 0;
  const dispose = scheduleBoardDeadlineRefresh(due, status, () => { if (++calls === 1) throw new Error("503"); }, env.options);
  await flush();
  assert.equal(env.completed.size, 0);
  assert.equal(env.errors.length, 1);
  assert.equal(env.errors[0].retrying, true);
  assert.equal([...env.jobs.values()][0].delay, 1000);
  env.fire();
  await flush();
  assert.equal(calls, 2);
  assert.equal(env.completed.size, 2);
  assert.equal(env.recovered(), 1);
  dispose();
});

test("계속 실패하면 재시도 3회 뒤 멈추고 새 수동 조회로 다시 시작할 수 있다", async () => {
  const env = clock();
  let calls = 0;
  const dispose = scheduleBoardDeadlineRefresh(due, status, () => { calls++; return Promise.reject(new Error("503")); }, env.options);
  await flush();
  for (let i = 0; i < 3; i++) { env.fire(); await flush(); }
  assert.equal(calls, 4);
  assert.equal(env.errors.at(-1).retrying, false);
  assert.equal(env.jobs.size, 0);
  assert.equal(env.completed.size, 0);
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(calls, 4);
  dispose();
  const nextDispose = scheduleBoardDeadlineRefresh(due, status, () => { calls++; }, env.options);
  await flush();
  assert.equal(calls, 5);
  assert.equal(env.completed.size, 2);
  nextDispose();
});

test("화면을 떠나면 예약과 늦은 응답을 버리고 완료 상태도 쓰지 않는다", async () => {
  const env = clock();
  let reject;
  const dispose = scheduleBoardDeadlineRefresh(due, status, () => new Promise((_, fail) => { reject = fail; }), env.options);
  await flush();
  dispose();
  reject(new Error("응답 지연"));
  await flush();
  assert.equal(env.errors.length, 0);
  assert.equal(env.completed.size, 0);
  assert.equal(env.jobs.size, 0);
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(env.recovered(), 0);
});

test("미래의 문제 제한은 충전 완료와 섞지 않고 해당 시점에만 조회한다", async () => {
  const env = clock();
  let calls = 0;
  const dispose = scheduleBoardDeadlineRefresh([due[0], { key: "challenge", targetIso: "2026-10-01T10:05:00+09:00" }], status, () => { calls++; }, env.options);
  await flush();
  assert.deepEqual([...env.completed], ["dice"]);
  assert.equal(calls, 1);
  assert.equal([...env.jobs.values()][0].delay, 300000);
  env.fire();
  await flush();
  assert.equal(calls, 2);
  assert.equal(env.completed.size, 2);
  dispose();
});

test("숨겨진 탭의 예약이 지연돼도 돌아온 시점에 한 번만 갱신한다", async () => {
  const env = clock();
  let calls = 0;
  const dispose = scheduleBoardDeadlineRefresh([{ key: "dice", targetIso: "2026-10-01T10:00:05+09:00" }], status, () => { calls++; }, env.options);
  env.visibility.hidden = true;
  env.advance(7000);
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(calls, 0);
  env.visibility.hidden = false;
  env.visibility.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(calls, 1);
  assert.equal(env.jobs.size, 0);
  dispose();
});
