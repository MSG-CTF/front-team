import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./components/SignatureFestival.module.css", import.meta.url), "utf8");

test("축제 원화와 클릭 오버레이는 모든 너비에서 같은 3:2 좌표계를 사용한다", () => {
  assert.match(css, /\.festivalLayout\s*\{[^}]*width: 100%;/);
  assert.match(css, /\.sceneViewport\s*\{[^}]*container-type: size;/);
  assert.match(css, /\.scene\s*\{[^}]*width: max\(100cqw, 150cqh\);/);
  assert.match(css, /aspect-ratio: 3 \/ 2/);
  assert.doesNotMatch(css, /385%|290%|aspect-ratio: 0\.78|background-plaza/);
  const main = css.slice(0, css.indexOf(".clubPage"));
  assert.match(main, /\.boothPosition\s*\{[^}]*top: 20%;[^}]*left: 5\.5%;[^}]*width: 25\.5%;[^}]*height: 33%;/);
  assert.doesNotMatch(main, /club-festival-v1\.webp/, "반응형 그림과 CSS 배경을 중복해서 받지 않는다");
  assert.match(main, /\.sceneArtwork\s*\{[^}]*position: absolute;[^}]*inset: 0;[^}]*width: 100%;[^}]*height: 100%;/);
  assert.doesNotMatch(main, /blur\(/);
  assert.doesNotMatch(css.match(/\.scene\s*\{[^}]*\}/)?.[0] || "", /scale\(/);
  assert.match(css, /--art-height: clamp\(52vw, 100dvh, 74vw\)/);
  assert.match(css, /height: var\(--art-height\)/);
  assert.doesNotMatch(css, /sceneFooter|100dvh - 44px|var\(--art-height\) \+ 44px/);
});

test("모바일은 원화를 확대·분할하지 않고 읽을 수 있는 부스 안내 목록을 제공한다", () => {
  const mobile = css.slice(css.indexOf("@media (max-width: 600px)"), css.indexOf("/* 개별 동아리"));
  assert.match(mobile, /\.sceneViewport\s*\{[^}]*position: relative;/);
  assert.doesNotMatch(mobile, /background-size|background-position|\.boothPosition|scale\(/);
  assert.match(mobile, /\.mobileBoothList\s*\{[^}]*display: grid;/);
  assert.match(mobile, /\.mobileBoothLink\s*\{[^}]*min-height: 76px;/);
});

test("1440부터 768까지 줄였다 늘려도 원화 크기는 연속적이고 역방향 확대가 없다", () => {
  const widths = [1440, 1366, 1280, 1100, 1024, 901, 900, 899, 800, 768];
  const sceneWidth = (w, h) => Math.max(w, 1.5 * Math.min(h, .74 * w));
  for (const height of [700, 768, 800, 900]) {
    for (let i=1;i<widths.length;i++) {
      assert.ok(sceneWidth(widths[i], height) <= sceneWidth(widths[i-1], height));
      const imageWidth = sceneWidth(widths[i], height);
      assert.ok(imageWidth <= widths[i] / .9 + .01, "필수 부스 폭을 잘라내지 않는다");
    }
  }
});
