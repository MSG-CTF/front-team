import test from "node:test";
import assert from "node:assert/strict";
import { clampRange, zoomRange, rangeFromDrag, tooltipLeft, rankingPageWindow } from "./leaderboardViewport.js";

const full = [10000, 110000];
test("확대 범위는 전체 시간 안에 머물고 축소하면 전체 범위로 돌아온다", () => {
  assert.deepEqual(zoomRange(null, full, 0.5), [35000, 85000]);
  assert.deepEqual(zoomRange([35000, 85000], full, 2), full);
  assert.deepEqual(zoomRange(null, full, 5), full);
  assert.deepEqual(clampRange([0, 20000], full), [10000, 30000]);
  assert.deepEqual(clampRange([100000, 130000], full), [80000, 110000]);
});
test("우측에서 좌측으로 드래그해도 확대되며 짧은 클릭은 범위를 바꾸지 않는다", () => {
  assert.deepEqual(rangeFromDrag(800, 200, 1000, full), [30000, 90000]);
  assert.equal(rangeFromDrag(200, 204, 1000, full), null);
  assert.deepEqual(rangeFromDrag(-100, 1100, 1000, full), full);
});
test("반복 확대와 범위 밖 데이터 갱신에도 유효한 시간 간격을 유지한다", () => {
  let range = full;
  for (let i = 0; i < 30; i += 1) range = zoomRange(range, full, 0.5);
  assert.equal(range[1] - range[0], 1000);
  assert.deepEqual(clampRange(range, [200000, 400000]), [200000, 202000]);
  assert.equal(clampRange(null, [null, null]), null);
});
test("정보창은 양쪽 끝에서 그래프 안에 남고 오른쪽 범례를 덮지 않는다", () => {
  for (let anchor = 42; anchor <= 1276; anchor += 7) {
    const left = tooltipLeft(anchor, 42, 1276, 290);
    assert.ok(left >= 42);
    assert.ok(left + 290 <= 1276);
  }
  assert.ok(tooltipLeft(1276, 42, 1276, 290) < 1276 - 290);
});
test("페이지 숫자 선택은 시작과 끝에서 벗어나지 않는다", () => {
  assert.deepEqual(rankingPageWindow(1, 13), [1, 2, 3, 4, 5]);
  assert.deepEqual(rankingPageWindow(8, 13), [6, 7, 8, 9, 10]);
  assert.deepEqual(rankingPageWindow(13, 13), [9, 10, 11, 12, 13]);
  assert.deepEqual(rankingPageWindow(1, 1), [1]);
});
