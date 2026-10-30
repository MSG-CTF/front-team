import test from "node:test";
import assert from "node:assert/strict";
import { adaptBoardDefinition, adaptMyBoard } from "./boardData.js";
import { getBoardLineProgress, getBoardLineEarnedScore, getBoardLineScoreTotals, formatBoardLineScore } from "./boardLines.js";
import { parseScoreJson } from "../../../utils/scoreJson.js";

const cells = adaptBoardDefinition({ cells: [1, 2].flatMap((line_number) =>
  Array.from({ length: 5 }, (_, index) => ({ cell_index: (line_number - 1) * 6 + index + 2, type: "CHALLENGE", line_number })),
) }).cells;
const cleared = cells.map((cell) => ({ cell_index: cell.cellIndex, status: "CLEARED" }));
const payout = (score, patch = {}) => ({ line_number: 1, earned_score: score, is_category_bonus: false, ...patch });
const progress = (data) => {
  const board = adaptMyBoard({ cell_states: cleared, ...data });
  return getBoardLineProgress(cells, new Map(board.cellStates.map((cell) => [cell.cellIndex, cell])), board.lineMonopolies);
};

test("서버 지급 기록이 있는 라인만 완료하고 실제 소수 지급액과 분류를 보존한다", () => {
  const [paid, unpaid] = progress({ line_monopolies: [payout(135.5, { is_category_bonus: true })] });
  assert.equal(paid.isCompleted, true);
  assert.equal(paid.isCategoryBonus, true);
  assert.equal(formatBoardLineScore(getBoardLineEarnedScore(paid)), "135.5 pts");
  assert.equal(unpaid.isCompleted, false);
});

test("0점 지급도 완료로 표시하고 관리자 수정 후 새 지급액을 쓴다", () => {
  assert.equal(progress({ line_monopolies: [payout(0)] })[0].isCompleted, true);
  assert.equal(getBoardLineEarnedScore(progress({ line_monopolies: [payout(0)] })[0]), 0);
  assert.equal(getBoardLineEarnedScore(progress({ line_monopolies: [payout(777.25)] })[0]), 777.25);
});

test("정답 회수 뒤 빈 지급 목록과 OPENED 상태가 오면 레일과 획득 점수를 해제한다", () => {
  const [line] = progress({ line_monopolies: [], cell_states: cleared.map((cell) => cell.cell_index === 2 ? { ...cell, status: "OPENED" } : cell) });
  assert.equal(line.isCompleted, false);
  assert.equal(line.bonusScore, null);
  assert.equal(getBoardLineEarnedScore(line), 0);
});

test("모두 CLEARED여도 지급 기록이 없으면 지급 미확인으로 구분한다", () => {
  const lines = progress({ line_monopolies: [] });
  assert.ok(lines.every((line) => !line.isCompleted && line.awaitingConfirmation));
  assert.equal(getBoardLineScoreTotals(lines).earnedScore, null);
});

test("지급 기록과 풀이 상태가 충돌하면 완료나 0점을 확정하지 않는다", () => {
  const [line] = progress({ line_monopolies: [payout(135.5)], cell_states: [] });
  assert.equal(line.isCompleted, false);
  assert.equal(line.awaitingConfirmation, true);
  assert.equal(getBoardLineEarnedScore(line), null);
});

test("누락된 지급 필드와 잘못된 계약은 미확인으로 남기고 지급을 추정하지 않는다", () => {
  for (const line_monopolies of [undefined, null, {}, [payout(-1)], [payout("135.5")], [payout(1, { line_number: 7 })],
    [payout(1), payout(2)], [{ lineNumber: 1, earnedScore: 100, isCategoryBonus: true }], [payout(1, { is_category_bonus: "false" })]]) {
    const [line] = progress({ line_monopolies });
    assert.equal(line.payoutStatus, "unknown");
    assert.equal(line.isCompleted, false);
    assert.equal(getBoardLineEarnedScore(line), null);
  }
  assert.equal(adaptMyBoard({ line_monopolies: [] }).lineMonopolies.length, 0);
});

test("큰 정수 원문을 지급액·서식·합계에서 그대로 보존한다", () => {
  const data = parseScoreJson('{"line_monopolies":[{"line_number":1,"earned_score":999999999999999999,"is_category_bonus":false},{"line_number":2,"earned_score":135.5,"is_category_bonus":true}]}');
  const lines = progress(data);
  assert.equal(formatBoardLineScore(getBoardLineEarnedScore(lines[0])), "999,999,999,999,999,999 pts");
  assert.equal(formatBoardLineScore(getBoardLineScoreTotals(lines).earnedScore), "1,000,000,000,000,000,134.5 pts");
  assert.equal(data.line_monopolies[0].line_number, 1);
  assert.equal(data.line_monopolies[1].earned_score, 135.5);
});

test("일반 JSON 파싱으로 이미 손실된 큰 정수는 확정 점수로 표시하지 않는다", () => {
  const data = JSON.parse('{"line_monopolies":[{"line_number":1,"earned_score":999999999999999999,"is_category_bonus":false}]}');
  assert.equal(progress(data)[0].payoutStatus, "unknown");
});

test("개별 지급액이 안전한 숫자여도 합계가 범위를 넘으면 정밀도를 보존한다", () => {
  const lines = progress({ line_monopolies: [payout(9007199254740991), payout(2, { line_number: 2 })] });
  assert.equal(formatBoardLineScore(getBoardLineScoreTotals(lines).earnedScore), "9,007,199,254,740,993 pts");
});
