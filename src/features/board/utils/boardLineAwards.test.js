import test from "node:test";
import assert from "node:assert/strict";
import { adaptMyBoard } from "./boardData.js";
import { getBoardLineProgress, getBoardLineEarnedScore, getBoardLineStatus, getBoardLineAccentMap, getBoardLineCounts } from "./boardLines.js";
import { PREVIEW_BOARD_CELLS } from "../preview/lineRailPreviewData.js";

const cleared = new Map([2, 3, 4, 5, 6].map(index => [index, { status: "CLEARED" }]));
const snapshot = (rows = []) => adaptMyBoard({ line_monopolies: rows });
const award = (score = 225) => ({ line_number: 1, earned_score: score, is_category_bonus: true });
const progress = (data, states = cleared) => getBoardLineProgress(PREVIEW_BOARD_CELLS, states, data?.lineMonopolies);

test("미완료, 5/5 지급 미확인, 서버 확정 지급을 구분한다", () => {
  const [incomplete] = progress(snapshot(), new Map());
  assert.equal(getBoardLineStatus(incomplete), "0/5 해결");
  assert.equal(getBoardLineEarnedScore(incomplete), 0);
  const [pending] = progress(snapshot());
  assert.equal(getBoardLineStatus(pending), "풀이 완료 / 지급 미확인");
  assert.equal(pending.isCompleted, false);
  assert.equal(getBoardLineEarnedScore(pending), null);
  const [paid] = progress(snapshot([award(123.45)]));
  assert.equal(paid.payoutStatus, "paid");
  assert.equal(getBoardLineStatus(paid), "독점 완료");
  assert.equal(getBoardLineEarnedScore(paid), 123.45);
  const mixed = getBoardLineProgress(PREVIEW_BOARD_CELLS,
    new Map([...cleared, ...[8, 9, 10, 11, 12].map(index => [index, { status: "CLEARED" }])]),
    snapshot([award()]).lineMonopolies);
  assert.equal(getBoardLineCounts(mixed).done, 1);
  assert.equal(getBoardLineCounts(mixed).cleared, 2);
});

test("확정된 0점과 조회 정보 누락을 구분하고 새로고침 후 같은 결과를 표시한다", () => {
  const data = snapshot([award(0)]);
  assert.equal(progress(data)[0].isCompleted, true);
  assert.equal(getBoardLineEarnedScore(progress(data)[0]), 0);
  assert.deepEqual(progress(data), progress(JSON.parse(JSON.stringify(data))));
  for (const missing of [undefined, null, adaptMyBoard({}), adaptMyBoard({ team_id: "team-a", line_monopolies: {} })]) {
    assert.equal(progress(missing)[0].isCompleted, false);
    assert.equal(getBoardLineEarnedScore(progress(missing)[0]), null);
  }
});

test("잘못된 지급값, 중복 라인 기록으로 rail을 만들지 않는다", () => {
  for (const value of [null, undefined, "225.00", -1, Infinity, NaN, true]) {
    const [line] = progress(snapshot([{ ...award(), earned_score: value }]));
    assert.equal(line.isCompleted, false);
    assert.equal(getBoardLineEarnedScore(line), null);
  }
  assert.equal(progress(snapshot([award(), award()]))[0].isCompleted, false);
});

test("main의 지급·CLEARED 일치 검사와 6색·특수 칸 제외를 유지한다", () => {
  const paid = progress(snapshot([award()]), new Map());
  assert.equal(paid[0].isCompleted, false);
  assert.deepEqual(paid[0].solvedCellIndexes, []); // 풀지 않은 칸을 임의로 생성하지 않는다.
  assert.deepEqual(getBoardLineAccentMap(paid), getBoardLineAccentMap(progress(snapshot())));
  assert.equal(paid.length, 6);
  assert.equal(paid.flatMap(line => line.cellIndexes).length, 30);
  assert.ok(!paid.flatMap(line => line.cellIndexes).some(index => [1, 7, 16, 21, 25, 30].includes(index)));
});

test("다음 응답에서 기록이 삭제되거나 점수가 바뀌면 이전 완료값을 유지하지 않는다", () => {
  assert.equal(progress(snapshot([award(225)]))[0].isCompleted, true);
  assert.equal(getBoardLineEarnedScore(progress(snapshot([award(123.45)]))[0]), 123.45);
  const removed = progress(snapshot())[0];
  assert.equal(removed.isCompleted, false);
  assert.equal(removed.bonusScore, null);
  assert.equal(getBoardLineStatus(removed), "풀이 완료 / 지급 미확인");
  assert.equal(progress(adaptMyBoard({}))[0].isCompleted, false);
});
