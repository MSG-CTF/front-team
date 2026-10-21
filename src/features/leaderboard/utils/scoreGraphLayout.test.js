import test from "node:test";
import assert from "node:assert/strict";
import { getScoreGraphLayout } from "./scoreGraphLayout.js";

test("기본 데스크톱과 모바일 그래프의 눈금 배치를 유지한다", () => {
  const desktop = getScoreGraphLayout({ width: 1280, height: 392, compact: false });
  assert.deepEqual(desktop.plot, { left: 42, top: 30, right: 4, bottom: 48 });
  assert.equal(desktop.timeTicks, 5);
  const mobile = getScoreGraphLayout({ width: 334, height: 300, compact: true });
  assert.deepEqual(mobile.plot, { left: 54, top: 62, right: 24, bottom: 48 });
  assert.equal(mobile.timeTicks, 3);
  assert.equal(mobile.scoreTicks, 6);
});

test("글자 확대 시 점수와 시간 눈금을 그래프 안에 배치하고 서로 겹치지 않는다", () => {
  const labels = { scoreWidth: 90, scoreHeight: 34, timeWidth: 96, timeHeight: 34, controlsHeight: 54 };
  const layout = getScoreGraphLayout({ width: 334, height: 300, compact: true, labels });
  assert.ok(layout.plot.left >= labels.scoreWidth + 8);
  assert.ok(layout.plot.right >= labels.timeWidth / 2);
  assert.ok(layout.plot.bottom >= labels.timeHeight + 17);
  assert.ok(layout.plot.top >= labels.controlsHeight + 18);
  assert.ok(layout.plotWidth / (layout.timeTicks - 1) >= labels.timeWidth);
  assert.ok(layout.plotHeight / (layout.scoreTicks - 1) >= labels.scoreHeight + 8);
});

test("좁은 확대 화면에서는 시작과 끝 눈금만 표시하고 줄바꿈한 도구 아래에 그래프를 둔다", () => {
  const labels = { scoreWidth: 42, scoreHeight: 20, timeWidth: 42, timeHeight: 20, controlsHeight: 96 };
  const layout = getScoreGraphLayout({ width: 139, height: 300, compact: true, labels });
  assert.equal(layout.timeTicks, 2);
  assert.ok(layout.plotWidth >= labels.timeWidth);
  assert.ok(layout.plot.top > labels.controlsHeight);
  assert.ok(layout.plotHeight > 0);
});

test("200% 확대에서 초 단위 시작과 끝 시간이 겹치면 두 줄로 배치한다", () => {
  const labels = { scoreWidth: 42, scoreHeight: 20, timeWidth: 56, timeHeight: 20, controlsHeight: 96 };
  const layout = getScoreGraphLayout({ width: 139, height: 300, compact: true, labels });
  assert.equal(layout.timeTicks, 2);
  assert.ok(layout.plotWidth < labels.timeWidth);
  assert.ok(layout.timeLabelStep >= labels.timeHeight + 4);
  assert.ok(layout.plot.bottom >= 17 + layout.timeLabelStep + labels.timeHeight);
  assert.ok(layout.plotHeight > 0);

  const normal = getScoreGraphLayout({ width: 334, height: 300, compact: true, labels });
  const desktop = getScoreGraphLayout({ width: 1280, height: 392, compact: false, labels });
  assert.equal(normal.timeLabelStep, 0);
  assert.equal(desktop.timeLabelStep, 0);
});
