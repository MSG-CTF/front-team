import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openChallengeAccess } from "./openChallengeAccess.js";

const response = { data: { code: "SUCCESS", data: {
  cell_index: 14, challenge_id: 302, opened_at: "2026-09-29T01:00:00Z", remaining_seconds: 900,
} } };

test("상세로 이동할 때는 문제 열기 요청만 즉시 보내고 보드 재조회를 시작하지 않는다", async () => {
  const calls = [];
  let complete;
  const pending = openChallengeAccess({ challengeId: 302, idempotencyKey: "same-key", refreshBoard: false }, {
    openCell(options) { calls.push(options); return new Promise(resolve => { complete = resolve; }); },
    syncProgress() { assert.fail("상세 진입 전에 보드 재조회를 시작하면 안 됨"); },
  });
  assert.deepEqual(calls, [{ challengeId: 302, idempotencyKey: "same-key" }]);
  let settled = false;
  pending.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, "문제 열기 성공 전에는 상세 진입 정보를 반환하지 않는다");
  complete(response);
  assert.deepEqual(await pending, {
    cellIndex: 14, challengeId: 302, openedAt: "2026-09-29T01:00:00Z",
    solveDeadlineAt: "2026-09-29T01:15:00.000Z", remainingSeconds: 900,
  });
});

test("보드에 머무는 호출은 기존처럼 상태 재조회까지 완료한다", async () => {
  const calls = [];
  let finishSync;
  let synced = false;
  const task = openChallengeAccess({ challengeId: 302 }, {
    async openCell() { calls.push("open"); return response; },
    syncProgress() { calls.push("sync"); return new Promise(resolve => { finishSync = resolve; }); },
  });
  task.then(() => { synced = true; });
  await Promise.resolve();
  assert.deepEqual(calls, ["open", "sync"]);
  assert.equal(synced, false);
  finishSync();
  await task;
  assert.equal(synced, true);
});

test("문제 열기가 거절되거나 통신에 실패하면 상세 진입 정보를 만들지 않는다", async () => {
  for (const openCell of [
    async () => ({ data: { code: "CHALLENGE_LOCKED", message: "선택할 수 없는 문제입니다" } }),
    async () => { throw new Error("network unavailable"); },
  ]) {
    await assert.rejects(openChallengeAccess({ challengeId: 302, refreshBoard: false }, {
      openCell, syncProgress() { assert.fail("실패 뒤에 보드를 갱신하면 안 됨"); },
    }));
  }
});

test("문제 요청은 바로 보내고 성공 뒤의 카드 연출과 상세 이동만 연결한다", () => {
  const selection = readFileSync(new URL("../components/ChallengeSelection.jsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../pages/BoardPage.jsx", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../hooks/useBoardController.js", import.meta.url), "utf8");
  assert.doesNotMatch(selection, /await\s+animation(?:\?\.)?\.?(?:finished)/);
  assert.match(selection, /await onOpenChallenge\(challengeId, \{ beforeNavigate: presentation.wait \}\)/);
  assert.match(page, /request: \(\) => board.openChallenge\(challengeId, \{ refreshBoard: false \}\)/);
  assert.match(page, /await openChallengeWithReveal\(/);
  assert.match(controller, /\(challengeId, \{ refreshBoard = true \} = \{\}\)/);
});
