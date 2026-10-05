import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { getBoardZoomScrollLeft } from "./boardViewport.js";

function mediaRule(path, condition, selector) {
  const root = postcss.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const values = {};
  root.walkAtRules("media", (media) => {
    if (media.params !== condition) return;
    media.walkRules(selector, (rule) => rule.walkDecls((decl) => { values[decl.prop] = decl.value; }));
  });
  return values;
}

test("모바일 두 후보는 데스크톱의 개별 left 좌표를 남기지 않는다", () => {
  const rule = mediaRule("../components/ChallengeSelection.module.css", "(max-width: 600px)",
    '.cards[data-count="2"] .card:first-child, .cards[data-count="2"] .card:nth-child(2)');
  assert.equal(rule.left, "auto");
});

test("데스크톱 바닥과 무대는 같은 크기와 중심을 사용하고 다른 화면에는 영향을 주지 않는다", () => {
  const path = "../components/BoardScreen.module.css";
  const condition = "(min-width: 1101px)";
  const frame = mediaRule(path, condition, ".frame");
  const scene = mediaRule(path, condition, ".frame > img, .frame > .stage");
  const background = mediaRule(path, condition, ".frame > img");
  assert.equal(frame["--board-scene-width"], "min(100vw, calc(100vh * 16 / 9))");
  assert.equal(frame["--board-scene-height"], "calc(var(--board-scene-width) * 9 / 16)");
  assert.deepEqual(scene, {
    position: "absolute", inset: "auto", left: "50%", top: "50%",
    width: "var(--board-scene-width)", height: "var(--board-scene-height)",
    transform: "translate(-50%, -50%)",
  });
  assert.equal(background["object-fit"], "contain");
  // 16:9 밖 여백은 같은 배경을 cover로 깔아 채운다(갈색 빈 여백 금지)
  const fill = mediaRule(path, condition, ".frame::before");
  assert.equal(fill.inset, "0");
  assert.match(fill.background, /bg-1920x1080\.webp.*cover/);
  assert.equal(background["mask-composite"], "intersect");
  const common = readFileSync(new URL("../../../components/common/FixedAspectStage.jsx", import.meta.url), "utf8");
  assert.match(common, /object-cover/);
});

test("16:9, 16:10, 세로로 긴 창과 울트라와이드에서 배경과 카드의 축척이 같다", () => {
  // 바로 위 테스트에서 이 계산과 실제 CSS 선언의 일치를 확인한다
  for (const [width, height] of [[1920, 1080], [1280, 720], [1440, 900], [1280, 1008], [2560, 1080], [1101, 900], [1600, 600]]) {
    const sceneWidth = Math.min(width, height * 16 / 9);
    const sceneHeight = sceneWidth * 9 / 16;
    const scale = sceneWidth / 1920;
    const left = (width - sceneWidth) / 2;
    const top = (height - sceneHeight) / 2;
    assert.ok(left >= -0.001 && top >= -0.001);
    assert.ok(Math.abs(sceneHeight / 1080 - scale) < 1e-10);
    for (const [x, y] of [[448, 289], [596, 482], [805, 460], [1038, 481]]) {
      const backgroundPoint = [left + x * scale, top + y * scale];
      const stagePoint = [left + sceneWidth * x / 1920, top + sceneHeight * y / 1080];
      assert.ok(Math.abs(backgroundPoint[0] - stagePoint[0]) < 1e-9);
      assert.ok(Math.abs(backgroundPoint[1] - stagePoint[1]) < 1e-9);
    }
  }
});

test("카드 선택은 보드를 없애지 않고 전체 화면을 반투명하게 어둡게 한다", () => {
  const path = "../components/ChallengeSelection.module.css";
  const root = postcss.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const properties = selector => {
    const rule = root.nodes.find(node => node.type === "rule" && node.selector === selector);
    return Object.fromEntries(rule.nodes.filter(node => node.type === "decl").map(node => [node.prop, node.value]));
  };
  const backdrop = properties(".backdrop");
  assert.equal(backdrop.position, "fixed");
  assert.equal(backdrop.inset, "0");
  assert.equal(backdrop.background, "rgb(8 6 4 / 68%)");
  assert.equal(backdrop["backdrop-filter"], undefined);
  assert.equal(backdrop["overflow-x"], "hidden");
  assert.equal(backdrop["overflow-y"], "auto");
  assert.ok(Number(backdrop["z-index"]) > 80);
  const scene = properties(".scene");
  assert.equal(scene["min-height"], "100%");
  assert.equal(scene["container-type"], "inline-size");
  assert.equal(properties(".selection").width, "var(--choice-width)");
  assert.equal(properties(".selection")["aspect-ratio"], "782 / 314");
  const source = readFileSync(new URL("../components/ChallengeSelection.jsx", import.meta.url), "utf8");
  assert.match(source, /createPortal\(content, document.body\)/);
  assert.doesNotMatch(source, /bg-1920x1080|sceneBackdrop/);
  const screen = readFileSync(new URL("../components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /isHidden=\{isChallengeSelectionOpen\}/);
});

test("카드 선택을 닫으면 배경 스크롤과 이전 포커스를 되돌린다", () => {
  const source = readFileSync(new URL("../components/ChallengeSelection.jsx", import.meta.url), "utf8");
  assert.match(source, /previousOverflow = document.body.style.overflow/);
  assert.match(source, /document.body.style.overflow = "hidden"/);
  assert.match(source, /document.body.style.overflow = previousOverflow/);
  assert.match(source, /element.inert = true/);
  assert.match(source, /element.inert = inert/);
  assert.match(source, /previous\?\.isConnected/);
  const reduced = mediaRule("../components/ChallengeSelection.module.css", "(prefers-reduced-motion: reduce)", ".backdrop");
  assert.equal(reduced.animation, "none");
});

test("검은 선택창에서도 후보 수와 화면 높이가 카드 비율을 바꾸지 않는다", () => {
  const path = "../components/ChallengeSelection.module.css";
  const portrait = mediaRule(path, "(max-width: 600px)", ".scene");
  assert.equal(portrait["--choice-width"], "min(100cqw, 410px)");
  assert.equal(portrait.padding, "84px 22px 32px");
  const tablet = mediaRule(path, "(max-width: 1100px)", ".scene");
  assert.equal(tablet["--choice-width"], "min(100cqw, 782px)");
  const close = mediaRule(path, "(max-width: 600px)", ".close");
  assert.ok(parseFloat(close.top) + parseFloat(close.height) <= -50);
  const root = postcss.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  root.walkRules((rule) => {
    if (rule.selector !== ".scene") return;
    rule.walkDecls((decl) => {
      if (decl.prop === "--choice-width") assert.doesNotMatch(decl.value, /(?:vh|svh|dvh|cqh)/);
    });
  });
  for (const width of [320, 390, 600, 768, 1024, 1440]) {
    const padding = width <= 600 ? 44 : width <= 1100 ? 48 : 64;
    const choiceWidth = Math.min(width - padding, width <= 600 ? 410 : width <= 1100 ? 782 : 1000);
    assert.ok(choiceWidth <= width - padding);
    assert.ok((choiceWidth - 18) / 2 >= 120);
  }
});

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
  assert.match(css, /\.lineOverlay\s*\{[^}]*inset: 0;[^}]*width: 100%; height: 100%; overflow: visible/);
});

test("모바일 기차 선택은 처음만 확대하고 이동이 끝나면 이전 보기로 복구한다", () => {
  const screen = readFileSync(new URL("../components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.match(screen, /zoomBeforeTrainSelection = useRef\(null\)/);
  assert.match(screen, /if \(zoomBeforeTrainSelection.current === null\)[\s\S]*zoomBeforeTrainSelection.current = isBoardZoomed/);
  assert.match(screen, /window.matchMedia\("\(max-width: 1100px\)"\).matches\) setIsBoardZoomed\(true\)/);
  assert.match(screen, /else if \(!trainTravel.journey && zoomBeforeTrainSelection.current !== null\)/);
  assert.match(screen, /zoomBeforeTrainSelection.current = null/);
  assert.match(screen, /else if \(zoomBeforeTrainSelection.current !== null\) setIsBoardZoomed\(true\)/);
});

test("모바일 목적지 안내는 상단 메뉴를 가리지 않고 상태 바로 다음에 놓인다", () => {
  const hint = mediaRule("../components/BoardScreen.module.css", "(max-width: 1100px)", ".stage .airportHint");
  assert.equal(hint.position, "static");
  assert.equal(hint.order, "-1");
  assert.equal(hint.background, "none");
  assert.equal(hint.border, "0");
  assert.equal(hint["white-space"], "normal");
});
