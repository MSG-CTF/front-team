import test from "node:test";
import assert from "node:assert/strict";
import { createChallengeReveal, CHALLENGE_REVEAL_DURATION, openChallengeWithReveal } from "./challengeReveal.js";

const opened = { challengeId: 302, openedAt: "2026-09-30T01:00:00Z", remainingSeconds: 900 };
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test("빠른 성공 응답도 클릭 후 800ms까지는 카드 효과를 보여주고 요청은 즉시 시작한다", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const reveal = createChallengeReveal();
  const calls = [];
  const task = openChallengeWithReveal({
    request: async () => { calls.push("request"); return opened; },
    beforeNavigate: reveal.wait,
    navigate: result => calls.push(result),
  });
  assert.deepEqual(calls, ["request"]);
  await flush();
  t.mock.timers.tick(CHALLENGE_REVEAL_DURATION - 1);
  await flush();
  assert.deepEqual(calls, ["request"]);
  t.mock.timers.tick(1);
  await task;
  assert.equal(CHALLENGE_REVEAL_DURATION, 800);
  assert.deepEqual(calls, ["request", opened]);
});

test("응답이 1400ms 걸리면 뒤에 800ms를 추가하지 않고 성공 시 바로 이동한다", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const reveal = createChallengeReveal();
  let respond;
  let result;
  const task = openChallengeWithReveal({
    request: () => new Promise(resolve => { respond = resolve; }), beforeNavigate: reveal.wait,
    navigate: value => { result = value; },
  });
  t.mock.timers.tick(1400);
  await flush();
  assert.equal(result, undefined);
  respond(opened);
  await task;
  assert.equal(result, opened);
});

test("서버 오류는 카드 연출을 기다리지 않고 즉시 반환한다", async () => {
  const error = new Error("CHALLENGE_LOCKED");
  await assert.rejects(openChallengeWithReveal({
    request: async () => { throw error; },
    beforeNavigate: () => assert.fail("실패 응답은 기다리면 안 됨"),
    navigate: () => assert.fail("실패 시 이동하면 안 됨"),
  }), error);
});

test("연출 도중 나가거나 연출 종료 뒤에 나가도 늦은 응답으로 상세에 끌려가지 않는다", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const elapsed of [100, 1000]) {
    const reveal = createChallengeReveal();
    let respond;
    const task = openChallengeWithReveal({
      request: () => new Promise(resolve => { respond = resolve; }), beforeNavigate: reveal.wait,
      navigate: () => assert.fail("떠난 화면의 응답으로 이동하면 안 됨"),
    });
    t.mock.timers.tick(elapsed);
    reveal.cancel();
    respond(opened);
    await task;
  }
});

test("연출 대기 중 취소하면 타이머를 기다리지 않고 종료한다", async () => {
  const reveal = createChallengeReveal();
  const wait = reveal.wait();
  reveal.cancel();
  reveal.cancel();
  assert.equal(await wait, false);
});

test("모션 축소와 이미 열린 문제의 상세 진입에는 연출 대기를 붙이지 않는다", async () => {
  for (const beforeNavigate of [createChallengeReveal(true).wait, undefined]) {
    let result;
    await openChallengeWithReveal({ request: async () => opened, beforeNavigate, navigate: value => { result = value; } });
    assert.equal(result, opened);
  }
});

test("중복 요청 잠금 등으로 결과가 없으면 화면 이동하지 않는다", async () => {
  await openChallengeWithReveal({
    request: async () => null,
    beforeNavigate: () => assert.fail("열린 문제가 없음"),
    navigate: () => assert.fail("열린 문제가 없음"),
  });
});
