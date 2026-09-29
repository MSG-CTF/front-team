import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareBoardLines, getBoardLineBadgePosition, getBoardLineStatus } from "./boardLines.js";

const sample = (patch = {}) => ({ lineId: "line-a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3], isCompleted: false, bonusScore: null, ...patch });

test("라인 데이터가 없으면 방문 상태로 가짜 독점이나 기본 라인을 만들지 않는다", () => {
  for (const data of [undefined, null, {}, []]) assert.deepEqual(prepareBoardLines(data), []);
  assert.deepEqual(prepareBoardLines([sample({ solvedCellIndexes: undefined })]), []);
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

test("칸 위의 색 막대와 체크 대신 면 조명만 사용한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/BoardLineOverlay.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(css + component, /lineCellBand|lineSolveMark|lineCellBevel|lineCellClaimed|lineCellSolved/);
  assert.match(css, /\.lineCell path \{ stroke: none; \}/);
  assert.match(component, /facePath: getBoardCellMaskPath\(cellIndex\)/);
});

test("완료 연출은 반복하지 않고 모션 줄이기 설정을 존중한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/BoardLineOverlay.jsx", import.meta.url), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.lineClaimFlash\s*\{\s*display: none; animation: none/);
  assert.doesNotMatch(css.match(/\.lineClaimFlash\s*\{([^}]+)/)[1], /infinite/);
  assert.match(component, /!previousComplete\.current && line\.isCompleted/);
  assert.match(component, /window\.setTimeout\(\(\) => setShowFlash\(false\), 850\)/);
  assert.match(component, /window\.clearTimeout\(clearFlash\)/);
  assert.match(css, /\.lineCrestArtwork, \.lineClaimCrest\[data-celebrating="true"\] \.lineCrestArtwork \{ animation: none/);
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
