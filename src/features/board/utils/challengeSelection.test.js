import test from "node:test";
import assert from "node:assert/strict";
import { getChallengeSelectionKey, isChallengeSelectionEmpty } from "./challengeSelection.js";

const ready = { myBoard: {}, currentCell: { cellIndex: 14, type: "CHALLENGE", challengeCandidates: [{ challengeId: 301 }, { challengeId: 302 }] } };

test("문제 선택창은 실제 후보가 있는 CHALLENGE 칸에서만 열린다", () => {
  assert.ok(getChallengeSelectionKey(ready));
  assert.equal(getChallengeSelectionKey({ ...ready, currentCell: null }), null);
  for (const type of ["ROULETTE", "CHANCE", "AIRPORT", "START"]) {
    assert.equal(getChallengeSelectionKey({ ...ready, currentCell: { ...ready.currentCell, type } }), null);
  }
  assert.equal(getChallengeSelectionKey({ ...ready, currentCell: { ...ready.currentCell, challengeCandidates: [] } }), null);
});

test("다른 필수 보드 행동을 처리 중이면 원판을 숨기거나 후보 선택을 시작하지 않는다", () => {
  for (const blockers of [
    { myBoard: null }, { isLoading: true }, { showQuarantine: true }, { awaitingDiscard: true },
    { pendingRoll: {} }, { pendingChanceChoice: {} }, { blockedReason: "PENDING_CONFIRM" },
    { cellEvent: { type: "CHANCE" } }, { cellEvent: { type: "ROULETTE" } },
  ]) assert.equal(getChallengeSelectionKey({ ...ready, ...blockers }), null);
});

test("선택창을 닫아도 새 칸 또는 새 후보가 오면 다시 열린다", () => {
  const key = getChallengeSelectionKey(ready);
  assert.equal(key, getChallengeSelectionKey(structuredClone(ready)));
  assert.notEqual(key, getChallengeSelectionKey({ ...ready, currentCell: { ...ready.currentCell, cellIndex: 15 } }));
  assert.notEqual(key, getChallengeSelectionKey({ ...ready, currentCell: { ...ready.currentCell, challengeCandidates: [{ challengeId: 303 }] } }));
});

test("0개 후보는 선택 대기 상태에서만 재조회 안내를 표시한다", () => {
  const empty = { ...ready, blockedReason: "CHALLENGE_NOT_SELECTED", currentCell: { ...ready.currentCell, challengeCandidates: [] } };
  assert.equal(isChallengeSelectionEmpty(empty), true);
  for (const change of [
    { myBoard: null }, { myBoard: { boardCompleted: true } }, { blockedReason: null },
    { blockedReason: "TIMER_RUNNING" }, { currentCell: null },
    { currentCell: { type: "ROULETTE", challengeCandidates: [] } },
    { currentCell: ready.currentCell }, { currentCell: { type: "CHALLENGE" } },
  ]) assert.equal(isChallengeSelectionEmpty({ ...empty, ...change }), false);
});
