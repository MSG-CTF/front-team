import test from "node:test";
import assert from "node:assert/strict";
import { adaptBoardDefinition, adaptMyBoard } from "./boardData.js";
import { getBoardLineProgress, getBoardLineEarnedScore } from "./boardLines.js";

const definition = () => adaptBoardDefinition({ total_cell_count: 36, cells: [
  ...[2, 3, 4, 5, 6].map((cell_index) => ({ cell_index, type: "CHALLENGE", line_number: 1 })),
  { cell_index: 7, type: "CHANCE", line_number: null },
  { cell_index: 8, type: "CHALLENGE", line_number: 2 },
] });
const states = (cell_states) => new Map(adaptMyBoard({ cell_states }).cellStates.map((cell) => [cell.cellIndex, cell]));

test("서버의 line_number를 클라이언트 lineNumber로 보존한다", () => {
  assert.equal(definition().cells[0].lineNumber, 1);
  assert.equal(definition().cells[5].lineNumber, null);
  assert.equal(adaptBoardDefinition({ cells: [{ cell_index: 2, type: "CHALLENGE" }] }).cells[0].lineNumber, null);
});

test("서버 라인 묶음과 현재 팀의 CLEARED 상태를 연결한다", () => {
  const lines = getBoardLineProgress(definition().cells, states([
    { cell_index: 2, status: "CLEARED" }, { cell_index: 3, status: "OPENED" },
    { cell_index: 4, status: "CONSUMED" }, { cell_index: 7, status: "CLEARED" },
    { cell_index: 8, status: "CLEARED" },
  ]));
  assert.deepEqual(lines.map((line) => line.cellIndexes), [[2, 3, 4, 5, 6], [8]]);
  assert.deepEqual(lines.map((line) => line.solvedCellIndexes), [[2], [8]]);
  assert.ok(lines.every((line) => line.isCompleted === false && line.bonusScore === null));
});

test("모든 칸을 풀어도 서버 지급 확인 없이 독점 완료와 점수를 만들지 않는다", () => {
  const [line] = getBoardLineProgress(definition().cells, states([2, 3, 4, 5, 6].map((cell_index) => ({ cell_index, status: "CLEARED" }))));
  assert.equal(line.isCompleted, false);
  assert.equal(line.awaitingConfirmation, true);
  assert.equal(line.rewardScore, null);
  assert.equal(getBoardLineEarnedScore(line), null);
});

test("라인이 없는 구버전 응답과 잘못된 번호에서 기본 라인을 추정하지 않는다", () => {
  for (const lineNumber of [undefined, null, 0, 7, "1", 1.5]) {
    assert.deepEqual(getBoardLineProgress([{ cellIndex: 2, type: "CHALLENGE", lineNumber }], new Map()), []);
  }
  assert.deepEqual(getBoardLineProgress(null, new Map()), []);
  assert.deepEqual(getBoardLineProgress(definition().cells, null), []);
});

test("중복 칸이나 특수 칸을 포함한 라인은 표시하지 않는다", () => {
  for (const extra of [
    { cellIndex: 2, type: "CHALLENGE", lineNumber: 1 },
    { cellIndex: 7, type: "ROULETTE", lineNumber: 1 },
  ]) {
    const lines = getBoardLineProgress([...definition().cells, extra], new Map());
    assert.ok(lines.every((line) => line.lineId !== "line-1"));
  }
});

test("팀 상태를 바꾸거나 초기화하면 다른 팀의 풀이를 이어받지 않는다", () => {
  const cells = definition().cells;
  assert.deepEqual(getBoardLineProgress(cells, states([{ cell_index: 2, status: "CLEARED" }]))[0].solvedCellIndexes, [2]);
  assert.deepEqual(getBoardLineProgress(cells, states([{ cell_index: 3, status: "CLEARED" }]))[0].solvedCellIndexes, [3]);
  assert.deepEqual(getBoardLineProgress(cells, states([]))[0].solvedCellIndexes, []);
});
