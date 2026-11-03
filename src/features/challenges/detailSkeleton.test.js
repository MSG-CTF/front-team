import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let Screen;
let styles;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-detail-skeleton-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  Screen = (await server.ssrLoadModule("/src/features/challenges/components/ChallengeDetailScreen.jsx")).default;
  styles = (await server.ssrLoadModule("/src/features/challenges/components/ChallengeDetailScene.module.css")).default;
});

after(async () => server?.close());

function renderLoading() {
  return renderToStaticMarkup(createElement(Screen, {
    loading: true,
    pageError: null,
    challenge: null,
    submission: { remainingSeconds: null, blocked: false },
    controls: {},
    flagValue: "",
    retrySeconds: 0,
  }));
}

test("문제 정보를 받는 동안 머리글·설명·플래그 칸을 실제 자리에 먼저 깐다", () => {
  const html = renderLoading();
  for (const panel of ["header", "descriptionPanel", "flagPanel"]) {
    assert.match(html, new RegExp(`<div class="${styles[panel]} [^"]*" aria-hidden="true">`), panel);
  }
  // 예전의 가운데 상자와 막대 두 개는 쓰지 않는다
  assert.doesNotMatch(html, new RegExp(styles.stateBox));
  assert.equal((html.match(/data-loading-ring/g) ?? []).length, 1);
  assert.match(html, /<p class="[^"]*" role="status"><span[^>]*><span[^>]*data-loading-ring[^>]*><\/span>문제 정보를 불러오는 중입니다<\/span><\/p>/);
  // 칸 제목은 실제 화면과 같은 이름을 쓰고, 막대는 스크린리더에 읽히지 않는다
  assert.match(html, />문제 설명</);
  assert.match(html, />첨부파일</);
  assert.match(html, />플래그 제출</);
  assert.equal((html.match(new RegExp(styles.skeletonBar, "g")) ?? []).length, 15);
});

test("데스크톱에서는 판 그림 위 실제 글자 좌표에 막대를 두고 안내는 오른쪽 위 칸 자리에 둔다", () => {
  const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
  const desktop = css.slice(css.indexOf("@media (min-width: 1101px) and (min-height: 620px)"));
  const rule = (selector) => new RegExp(`${selector.replace(/[.[\]"=]/g, (c) => `\\${c}`)} \\{([^}]*)\\}`).exec(desktop)?.[1] ?? "";
  // 제목·설명 본문·플래그 안내는 실제 글자와 같은 왼쪽 시작점을 쓴다
  assert.match(rule(".title"), /left: calc\(var\(--u\) \* 29\)/);
  assert.match(rule('.skeletonHeader [data-part="title"]'), /left: calc\(var\(--u\) \* 29\)/);
  assert.match(rule(".descriptionBody"), /left: calc\(var\(--u\) \* 46\)/);
  assert.match(rule(".skeletonLines"), /left: calc\(var\(--u\) \* 46\)/);
  assert.match(rule(".flagHint"), /left: calc\(var\(--u\) \* 36\)/);
  assert.match(rule('.skeletonFlag [data-part="hint"]'), /left: calc\(var\(--u\) \* 36\)/);
  // 안내 문구는 인스턴스·마스코트 칸과 같은 자리
  assert.match(rule(".skeletonStatus"), /left: calc\(var\(--u\) \* 1146\);[^}]*top: calc\(var\(--u\) \* 333\)/);
  // 입력칸은 플래그 판 그림에 그려져 있어 데스크톱에서는 따로 두지 않는다
  assert.match(rule('.skeletonFlag [data-part="input"]'), /display: none/);
});

test("막대의 빛은 은은하게 지나가고 움직임 줄이기에서는 멈춘다", () => {
  const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
  assert.match(css, /\.skeletonBar \{[^}]*animation: skeleton-gleam 1\.6s ease-in-out infinite;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.skeletonBar \{\s*animation: none;/);
  assert.doesNotMatch(css, /\.skeletonTitle|\.skeletonBody/);
});
