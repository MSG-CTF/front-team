import test from "node:test";
import assert from "node:assert/strict";
import { watchBoardLineSnapshot } from "./boardLineRefresh.js";

function harness(read, extra = {}) {
  const visibility = new EventTarget();
  const focusTarget = new EventTarget();
  let callback;
  const applied = [];
  const errors = [];
  const dispose = watchBoardLineSnapshot({
    teamId: "team-a", read, apply: data => applied.push(data), onError: () => errors.push(true),
    visibility, focusTarget, setTimer: fn => { callback = fn; return 1; }, clearTimer: () => {}, ...extra,
  });
  return { visibility, focusTarget, applied, errors, dispose, tick: () => callback() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("focus 및 정기 조회로 서버 기록을 다시 읽되 중복 요청하지 않는다", async () => {
  let resolve;
  let requests = 0;
  const h = harness(() => { requests++; return new Promise(done => { resolve = done; }); });
  h.focusTarget.dispatchEvent(new Event("focus"));
  h.focusTarget.dispatchEvent(new Event("focus"));
  assert.equal(requests, 1);
  resolve({ teamId: "team-a", lineMonopolies: [] });
  await flush();
  assert.equal(h.applied.length, 1);
  h.tick();
  assert.equal(requests, 2);
  h.dispose();
  resolve({ teamId: "team-a" });
  await flush();
  assert.equal(h.applied.length, 1);
});

test("팀 불일치·숨긴 화면·이동 중에는 적용하지 않고 해제 시 요청을 취소한다", async () => {
  let requests = 0;
  const h = harness(async () => { requests++; return { teamId: "team-b" }; });
  await h.tick();
  assert.equal(h.applied.length, 0);
  h.visibility.hidden = true;
  await h.tick();
  assert.equal(requests, 1);
  h.dispose();
  const moving = harness(async () => { throw Error("must not request"); }, { canRefresh: () => false });
  await moving.tick();
  assert.equal(moving.errors.length, 0);
  moving.dispose();
  let signal;
  const pending = harness(options => { signal = options.signal; return new Promise(() => {}); });
  pending.tick();
  pending.dispose();
  assert.equal(signal.aborted, true);
});

test("조회 실패는 미확인 상태로 전환하고 다음 조회로 복구할 수 있다", async () => {
  let fail = true;
  const h = harness(async () => { if (fail) throw Error("offline"); return { teamId: "team-a" }; });
  await h.tick();
  assert.equal(h.errors.length, 1);
  fail = false;
  await h.tick();
  assert.equal(h.applied.length, 1);
  h.dispose();
});

test("이동이 시작되거나 팀 컨텍스트가 해제된 뒤 도착한 응답은 적용하지 않는다", async () => {
  let active = true;
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }), { canRefresh: () => active });
  h.tick();
  active = false;
  resolve({ teamId: "team-a", snapshot: { lineMonopolies: [{ lineNumber: 1, earnedScore: 999 }] } });
  await flush();
  assert.equal(h.applied.length, 0);
  h.dispose();
});
