import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getBoardZoomScrollLeft } from "./boardViewport.js";

test("모바일 보드의 기본 너비는 화면에 맞추고 확대한 상태에만 최소 너비를 둔다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const trackRule = css.match(/\.stage \.track\s*\{([^}]+)\}/)?.[1];
  assert.match(trackRule, /width:\s*100%\s*;/);
  assert.doesNotMatch(trackRule, /min-width|max\(/);
  assert.match(css, /\.boardViewport\[data-zoomed="true"\] \.boardScene\s*\{\s*width: max\(150%, 620px\)/);
  assert.doesNotMatch(css, /\.boardViewport\[data-zoomed="true"\] \.track/);
  const viewportRule = css.match(/\.boardViewport\s*\{\s*display: block;([^}]+)\}/)?.[1];
  assert.doesNotMatch(viewportRule, /background:|overflow-x:\s*auto/);
});

test("모바일의 바닥 배경을 고정하지 않고 원판과 같은 장면에 배치한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../components/BoardScreen.jsx", import.meta.url), "utf8");
  const scene = readFileSync(new URL("../components/BoardScene.jsx", import.meta.url), "utf8");
  assert.match(css, /\.frame > img\s*\{\s*display: none/);
  assert.doesNotMatch(css, /\.frame > img\s*\{\s*position: fixed/);
  assert.match(css, /\.sceneBackdrop\s*\{[^}]*position: absolute/);
  assert.match(css, /\.boardScene\s*\{[^}]*position: relative/);
  assert.match(screen, /<BoardScene[^>]*>\s*<BoardTrack[\s\S]*?\/>\s*<\/BoardScene>/);
  assert.match(scene, /data-board-layer="scene"[\s\S]*data-board-layer="background"[\s\S]*\{children\}/);
});

test("모바일 보드에는 좌우 액자 여백을 두지 않고 열린 문제와 확대를 한 줄에 배치한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../components/BoardScreen.jsx", import.meta.url), "utf8");
  const stageRule = css.match(/\.frame \.stage\s*\{([^}]+)\}/)?.[1];
  assert.match(stageRule, /padding: 0 0 24px;/);
  assert.match(css, /\.boardTools\s*\{\s*display: flex;[^}]*justify-content: space-between/);
  assert.match(screen, /className=\{styles\.boardTools\}[\s\S]*<OpenChallengesToggle[\s\S]*className=\{styles\.boardControls\}/);
  const statusRule = css.match(/\.stage \.diceStatus\s*\{([^}]+)\}/)?.[1];
  assert.doesNotMatch(statusRule, /background:|border:\s*1px/);
});

test("모바일 풍경을 짧게 잘라도 바닥과 원판의 원본 좌표는 유지한다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  const sceneRule = css.match(/\.boardScene\s*\{\s*display: block;([^}]+)\}/)?.[1];
  const backdropRule = css.match(/\.sceneBackdrop\s*\{\s*display: block;([^}]+)\}/)?.[1];
  const trackRule = css.match(/\.stage \.track\s*\{([^}]+)\}/)?.[1];
  const [, cropWidth, cropHeight] = sceneRule.match(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/).map(Number);
  const percent = (rule, property) => Number(rule.match(new RegExp(`(?:^|;)\\s*${property}:\\s*(-?[\\d.]+)%`))[1]) / 100;
  assert.equal(cropWidth, 951);
  assert.equal(cropHeight, 960);
  assert.equal(percent(backdropRule, "height") * cropHeight, 1080);
  assert.equal(-percent(backdropRule, "top") * cropHeight, 120);
  assert.ok(Math.abs((percent(trackRule, "top") - percent(backdropRule, "top")) * cropHeight - 289) < 0.001);
  assert.ok(Math.abs(-percent(backdropRule, "left") * cropWidth - 448) < 0.001);
});

test("확대하면 현재 말 위치를 중심으로 보되 맵 양끝을 벗어나지 않는다", () => {
  assert.equal(getBoardZoomScrollLeft(366, 620, 9), 0);
  assert.equal(getBoardZoomScrollLeft(366, 620, 29), 254);
  assert.equal(getBoardZoomScrollLeft(366, 620, 1), 127);
  for (let cellIndex = 1; cellIndex <= 36; cellIndex++) {
    for (const viewportWidth of [296, 366, 744]) {
      const left = getBoardZoomScrollLeft(viewportWidth, 800, cellIndex);
      assert.ok(left >= 0 && left <= 800 - viewportWidth);
    }
  }
});

test("전체 보기가 가능한 폭이거나 측정 전이면 가로 이동하지 않는다", () => {
  for (const [viewportWidth, boardWidth] of [[366, 366], [744, 620], [0, 620], [NaN, 620], [366, NaN]]) {
    assert.equal(getBoardZoomScrollLeft(viewportWidth, boardWidth, 14), 0);
  }
});

test("원판 여백이 있어도 확대 중심은 실제 말 위치를 따른다", () => {
  assert.equal(getBoardZoomScrollLeft(320, 620, 1, { left: 20, width: 500 }), 110);
  assert.equal(getBoardZoomScrollLeft(320, 620, 1, { left: -1, width: 540 }), 150);
  assert.equal(getBoardZoomScrollLeft(320, 620, 29, { left: 40, width: 540 }), 300);
});

test("라인 완성 장식 때문에 원판 너비나 배경 기준점을 바꾸지 않는다", () => {
  const css = readFileSync(new URL("../components/BoardScreen.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.boardScene\[data-has-lines/);
  assert.doesNotMatch(css, /\.boardViewport\[data-has-lines/);
  assert.match(css, /\.lineOverlay\s*\{[^}]*inset: 0;[^}]*width: 100%; height: 100%; overflow: hidden/);
});
