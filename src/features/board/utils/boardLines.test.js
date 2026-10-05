import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareBoardLines, getBoardSolvedCellIndexes, getBoardLineAccent, getBoardLineBadgePosition, getBoardLineTileLabelPosition, getBoardLineStatus, formatBoardLineScore, formatBoardLineScoreValue, getBoardLineEarnedScore, getBoardLineScoreTotals } from "./boardLines.js";
import { BOARD_CELL_FACE_OUTLINES } from "./boardCellFaces.js";

const sample = (patch = {}) => ({ lineId: "line-a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3], isCompleted: false, bonusScore: null, ...patch });

test("개별 풀이 테두리는 CLEARED인 문제 칸에만 표시하고 방문이나 특수칸은 세지 않는다", () => {
  const cells = [2,3,4,5,6].map(cellIndex => ({ cellIndex, type: cellIndex === 5 ? "ROULETTE" : "CHALLENGE" }));
  const states = new Map([[2, { status: "CONSUMED" }], [3, { status: "OPENED" }], [4, { status: "CLEARED" }],
    [5, { status: "CLEARED" }], [6, { status: "cleared" }]]);
  assert.deepEqual(getBoardSolvedCellIndexes(cells, states), [4]);
});

test("라인 정보 없이 풀이 표시를 만들 때도 잘못된 칸과 중복 기록은 제외한다", () => {
  const states = new Map([0,2,36,37,"3"].map(index => [index, { status: "CLEARED" }]));
  const cells = [36,2,0,2,37,"3"].map(cellIndex => ({ cellIndex, type: "CHALLENGE" }));
  assert.deepEqual(getBoardSolvedCellIndexes(cells, states), [2,36]);
  assert.deepEqual(getBoardSolvedCellIndexes(undefined, states), []);
  assert.deepEqual(getBoardSolvedCellIndexes(cells, {}), []);
});

test("라인 데이터가 없으면 방문 상태로 가짜 독점이나 기본 라인을 만들지 않는다", () => {
  for (const data of [undefined, null, {}, []]) assert.deepEqual(prepareBoardLines(data), []);
  assert.deepEqual(prepareBoardLines([sample({ solvedCellIndexes: undefined })]), []);
});

test("실제 보드의 룰렛이나 카드 칸이 섞인 라인은 풀이와 독점에서 제외한다", () => {
  for (const type of ["ROULETTE", "CHANCE", "START", "AIRPORT"]) {
    const cells = [2,3,4,5,6].map(cellIndex => ({ cellIndex, type: cellIndex === 6 ? type : "CHALLENGE" }));
    assert.deepEqual(prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], isCompleted: true })], cells), []);
  }
  const cells = [2,3,4,5,6].map(cellIndex => ({ cellIndex, type: "CHALLENGE" }));
  assert.equal(prepareBoardLines([sample()], cells)[0].solvedCellIndexes.length, 2);
});

test("라인에 속한 칸의 종류가 없거나 중복 정의면 임의로 문제 칸이라 판단하지 않는다", () => {
  const cells = [2,3,4,5,6].map(cellIndex => ({ cellIndex, type: "CHALLENGE" }));
  for (const definition of [[], null, {}, cells.slice(1), [...cells, { cellIndex: 6, type: "ROULETTE" }]]) {
    assert.deepEqual(prepareBoardLines([sample()], definition), []);
  }
});

test("풀이 수를 세어도 완료 확정과 보너스를 임의로 만들지 않는다", () => {
  const [line] = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], bonusScore: 500 })]);
  assert.equal(line.isCompleted, false);
  assert.equal(line.awaitingConfirmation, true);
  assert.equal(line.bonusScore, null);
  assert.equal(getBoardLineStatus(line), "완료 확인 중");
});

test("모든 대상 칸 해결과 명시적인 완료 응답이 있어야 독점 완료로 표시한다", () => {
  assert.equal(prepareBoardLines([sample({ isCompleted: true })])[0].isCompleted, false);
  const [line] = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], isCompleted: true, bonusScore: 12.5 })]);
  assert.equal(line.isCompleted, true);
  assert.equal(line.bonusScore, 12.5);
  assert.equal(getBoardLineStatus(line), "독점 완료");
});

test("라인을 전부 방문하거나 문제를 열었어도 정답 처리가 없으면 독점이 아니다", () => {
  const indexes = [2,3,4,5,6];
  const [line] = prepareBoardLines([sample({
    solvedCellIndexes: [], isCompleted: true,
    consumedCellIndexes: indexes, visitedCellIndexes: indexes,
    cellStates: indexes.map(cellIndex => ({ cellIndex, status: "OPENED" })),
  })]);
  assert.equal(line.isCompleted, false);
  assert.equal(line.awaitingConfirmation, false);
  assert.equal(getBoardLineStatus(line), "0/5 해결");
});

test("마지막 문제 정답 전까지는 독점 완료로 표시하지 않는다", () => {
  const indexes = [2,3,4,5,6];
  for (let solvedCount = 0; solvedCount < indexes.length; solvedCount++) {
    const [line] = prepareBoardLines([sample({ solvedCellIndexes: indexes.slice(0, solvedCount), isCompleted: true })]);
    assert.equal(line.isCompleted, false);
    assert.equal(getBoardLineStatus(line), `${solvedCount}/5 해결`);
  }
  const [completed] = prepareBoardLines([sample({ solvedCellIndexes: indexes, isCompleted: true })]);
  assert.equal(completed.isCompleted, true);
});

test("잘못된 묶음과 중복 소속은 겹쳐 표시하지 않는다", () => {
  for (const cellIndexes of [[], [0,2], [2,37], [2,2], [2,"3"]]) assert.deepEqual(prepareBoardLines([sample({ cellIndexes })]), []);
  assert.deepEqual(prepareBoardLines([sample({ solvedCellIndexes: [2,7] })]), []);
  assert.deepEqual(prepareBoardLines([sample(), sample({ lineId: "line-b" })]), []);
  assert.deepEqual(prepareBoardLines([sample(), sample({ cellIndexes: [8,9], solvedCellIndexes: [] })]), []);
});

test("중복 풀이로 진행 수를 부풀리지 않고 원본 데이터는 수정하지 않는다", () => {
  const input = sample({ cellIndexes: [6,5,4,3,2], solvedCellIndexes: [3,3,2] });
  const original = structuredClone(input);
  const [line] = prepareBoardLines([input]);
  assert.deepEqual(line.solvedCellIndexes, [2,3]);
  assert.deepEqual(input, original);
  assert.equal(getBoardLineStatus(line), "2/5 해결");
});

test("0점과 점수 미제공을 구분하고 잘못된 보너스를 표시하지 않는다", () => {
  const completed = { solvedCellIndexes: [2,3,4,5,6], isCompleted: true };
  assert.equal(prepareBoardLines([sample({ ...completed, bonusScore: 0 })])[0].bonusScore, 0);
  for (const bonusScore of [null, undefined, -1, Infinity, "100"]) assert.equal(prepareBoardLines([sample({ ...completed, bonusScore })])[0].bonusScore, null);
});

test("독점 예정 배점이 있어도 해결 전에는 획득 점수로 바꾸지 않는다", () => {
  const [line] = prepareBoardLines([sample({ rewardScore: 150, bonusScore: 999 })]);
  assert.equal(line.rewardScore, 150);
  assert.equal(line.bonusScore, null);
  assert.equal(getBoardLineEarnedScore(line), 0);
  assert.deepEqual(getBoardLineScoreTotals([line]), { rewardScore: 150, earnedScore: 0 });
});

test("지급된 보너스가 현재 배점과 달라도 서버의 확정 지급값을 표시한다", () => {
  const [line] = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], isCompleted: true, rewardScore: 200, bonusScore: 150 })]);
  assert.equal(getBoardLineEarnedScore(line), 150);
  assert.deepEqual(getBoardLineScoreTotals([line]), { rewardScore: 200, earnedScore: 150 });
});

test("완료 확인 중과 지급 정보 미제공은 0점으로 숨기지 않는다", () => {
  const pending = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], rewardScore: 100 })])[0];
  const missing = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], isCompleted: true, rewardScore: 100 })])[0];
  for (const line of [pending, missing]) {
    assert.equal(getBoardLineEarnedScore(line), null);
    assert.deepEqual(getBoardLineScoreTotals([line]), { rewardScore: 100, earnedScore: null });
  }
  const zero = prepareBoardLines([sample({ solvedCellIndexes: [2,3,4,5,6], isCompleted: true, rewardScore: 0, bonusScore: 0 })])[0];
  assert.deepEqual(getBoardLineScoreTotals([zero]), { rewardScore: 0, earnedScore: 0 });
});

test("배점 누락과 잘못된 값은 미정으로 남기고 문자열을 숫자로 바꾸지 않는다", () => {
  for (const rewardScore of [undefined, null, -1, NaN, Infinity, -Infinity, "100", true]) {
    const [line] = prepareBoardLines([sample({ rewardScore })]);
    assert.equal(line.rewardScore, null);
    assert.equal(formatBoardLineScore(rewardScore), null);
    assert.deepEqual(getBoardLineScoreTotals([line]), { rewardScore: null, earnedScore: 0 });
  }
});

test("라인 합계는 예정 배점과 실제 지급 보너스를 따로 더한다", () => {
  const lines = prepareBoardLines([
    sample({ cellIndexes: [2,3], solvedCellIndexes: [2,3], isCompleted: true, rewardScore: 300, bonusScore: 200 }),
    sample({ lineId: "b", cellIndexes: [8,9], solvedCellIndexes: [8], rewardScore: 150, bonusScore: 999 }),
    sample({ lineId: "c", cellIndexes: [10,11], solvedCellIndexes: [10,11], isCompleted: true, rewardScore: 250, bonusScore: 100 }),
  ]);
  assert.deepEqual(getBoardLineScoreTotals(lines), { rewardScore: 700, earnedScore: 300 });
  assert.deepEqual(getBoardLineScoreTotals(lines.map((line, index) => index === 2 ? { ...line, bonusScore: null } : line)), { rewardScore: 700, earnedScore: null });
  for (const missing of [[], null, undefined, {}, [null], new Array(1)]) assert.deepEqual(getBoardLineScoreTotals(missing), { rewardScore: null, earnedScore: null });
});

test("소수 배점과 아주 작은 배점의 합계도 임의 반올림이나 0점 처리 없이 표시한다", () => {
  const totals = (values) => getBoardLineScoreTotals(values.map((score) => ({ rewardScore: score, isCompleted: true, bonusScore: score })));
  assert.deepEqual(totals([0.1, 0.2]), { rewardScore: 0.3, earnedScore: 0.3 });
  assert.equal(formatBoardLineScore(totals([0.1, 0.2]).earnedScore), "0.3 pts");
  assert.deepEqual(totals([1e-30, 2e-30]), { rewardScore: 3e-30, earnedScore: 3e-30 });
  assert.equal(formatBoardLineScore(1e-30), "1e-30 pts");
  assert.equal(formatBoardLineScore(1.2e-20), "1.2e-20 pts");
  assert.equal(formatBoardLineScore(0.000001234567890123456), "0.000001234567890123456 pts");
  assert.equal(formatBoardLineScore(1e21), "1,000,000,000,000,000,000,000 pts");
  assert.equal(formatBoardLineScore(-0), "0 pts");
  assert.equal(formatBoardLineScore(1234567.5), "1,234,567.5 pts");
  assert.deepEqual(totals([Number.MAX_VALUE, Number.MAX_VALUE]), { rewardScore: null, earnedScore: null });
});

test("숫자와 pts 단위를 분리해도 소수와 천 단위 표기는 동일하다", () => {
  for (const [value, expected] of [[0, "0"], [150, "150"], [12345.75, "12,345.75"], [1e-20, "1e-20"]]) {
    assert.equal(formatBoardLineScoreValue(value), expected);
    assert.equal(formatBoardLineScore(value), `${expected} pts`);
  }
  for (const value of [null, undefined, NaN, Infinity, -1, "150"]) assert.equal(formatBoardLineScoreValue(value), null);
});

test("색 테두리는 곡면 윤곽 안쪽에만 넣고 칸 위에 막대나 체크를 덮지 않는다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/BoardLineOverlay.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(css + component, /lineCellBand|lineSolveMark|lineCellBevel|lineCellClaimed|lineCellSolved/);
  assert.match(css, /\.lineCellOutline \{ fill: none; stroke: var\(--line-accent\); stroke-width: 3px/);
  assert.match(css, /\.lineCellOutline\[data-outline-state="claimed"\] \{ stroke-width: 12px; opacity: 1/);
  assert.match(css, /\.lineCellFinish \{ fill: none; stroke: #f0cf8c; stroke-width: 4px/);
  assert.match(component, /facePath: getBoardCellMaskPath\(cellIndex\)/);
  assert.match(component, /clipPath=\{`url\(#\$\{clipPrefix\}-\$\{cellIndex\}\)`\}/);
  assert.match(component, /solved.has\(cellIndex\) && <path d=\{facePath\}/);
  assert.match(component, /line.isCompleted && <path d=\{facePath\} className=\{styles.lineCellFinish\}/);
  assert.match(component, /vectorEffect="non-scaling-stroke" strokeLinejoin="round"/);
});

test("라인 목록 순서나 선택 여부가 바뀌어도 완료 테두리의 색은 고정한다", () => {
  const ids = Array.from({ length: 6 }, (_, index) => `preview-line-${index + 1}`);
  const colors = ids.map(getBoardLineAccent);
  assert.equal(new Set(colors).size, 6);
  assert.deepEqual([...ids].reverse().map(getBoardLineAccent).reverse(), colors);
  assert.ok(colors.every((color) => /^#[0-9a-f]{6}$/i.test(color)));
});

test("완료 연출은 반복하지 않고 모션 줄이기 설정을 존중한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/BoardLineOverlay.jsx", import.meta.url), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.lineClaimFlash\s*\{\s*display: none; animation: none/);
  assert.doesNotMatch(css.match(/\.lineClaimFlash\s*\{([^}]+)/)[1], /infinite/);
  assert.match(component, /!previousComplete\.current && line\.isCompleted/);
  assert.match(component, /window\.setTimeout\(\(\) => setShowFlash\(false\), 850\)/);
  assert.match(component, /window\.clearTimeout\(clearFlash\)/);
  assert.doesNotMatch(css, /line-crest-reveal|lineCrestArtwork/);
});

test("완료 문장은 해당 구역 안쪽에 두고 흩어진 묶음은 하나의 영토처럼 만들지 않는다", () => {
  for (const indexes of [[], [0], [37], null]) assert.equal(getBoardLineBadgePosition(indexes), null);
  assert.equal(getBoardLineBadgePosition([1,10,19,28]), null);
  const bottomLeft = getBoardLineBadgePosition([2,3,4,5,6]);
  assert.ok(bottomLeft.x < 886 && bottomLeft.y > 665);
  const wrapped = getBoardLineBadgePosition([35,36,1,2]);
  assert.ok(wrapped.y > 900);
  const groups = [[2,3,4,5,6],[8,9,10,11,12],[13,14,15,17,18],[19,20,22,23,24],[26,27,28,29,31],[32,33,34,35,36]];
  const labels = groups.map(getBoardLineBadgePosition);
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    assert.ok(Math.abs(labels[i].x - labels[j].x) > 220 || Math.abs(labels[i].y - labels[j].y) > 148);
  }
});

test("완료 문장 이미지는 알파 채널과 2대1 비율을 가진 독립 PNG다", () => {
  const png = readFileSync(new URL("../../../../public/assets/board/line-complete-crest-v1.png", import.meta.url));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(png.readUInt32BE(16), png.readUInt32BE(20) * 2);
  assert.equal(png[25], 6);
});

test("점수 명판은 대표 칸 면 안에 기울기까지 맞추고 네 모서리가 금테를 넘지 않는다", () => {
  const groups = [[2,3,4,5,6],[8,9,10,11,12],[13,14,15,17,18],[19,20,22,23,24],[26,27,28,29,31],[32,33,34,35,36]];
  const positions = groups.map(getBoardLineTileLabelPosition);
  const isInside = (face, x, y) => {
    let inside = false;
    for (let index = 0, previous = face.length - 1; index < face.length; previous = index++) {
      const [ax, ay] = face[index];
      const [bx, by] = face[previous];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  };
  for (let index = 0; index < groups.length; index++) {
    const position = positions[index];
    assert.ok(groups[index].includes(position.cellIndex));
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
    assert.deepEqual(getBoardLineTileLabelPosition([...groups[index]].reverse()), position);
    const angle = position.rotation * Math.PI / 180;
    const face = BOARD_CELL_FACE_OUTLINES[position.cellIndex - 1];
    assert.ok(position.width >= 70 && position.height >= 45);
    assert.ok(Math.abs(position.rotation) <= 45);
    for (const dx of [-position.width / 2, position.width / 2]) for (const dy of [-position.height / 2, position.height / 2]) {
      assert.ok(isInside(face, position.x + dx * Math.cos(angle) - dy * Math.sin(angle), position.y + dx * Math.sin(angle) + dy * Math.cos(angle)));
    }
  }
  assert.ok(positions[1].x < 250);
  assert.ok(positions[4].x > 1500);
  assert.ok(positions[2].y < 310 && positions[3].y < 310);
  assert.ok(positions[0].y > 1000 && positions[5].y > 1000);
});

test("흩어진 묶음이나 잘못된 칸에는 임의로 점수 명판을 넣지 않는다", () => {
  for (const indexes of [null, [], [0], [37], [2,2], ["2"], [1,10,19,28]]) {
    assert.equal(getBoardLineTileLabelPosition(indexes), null);
  }
});
