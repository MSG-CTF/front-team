import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";
import postcss from "postcss";

let server;
let main;
let guide;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-intro-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const [
    { default: IntroPage },
    { default: IntroGuidePage },
    { MotionProvider },
    { default: IntroHeader },
    { default: IntroFooter },
  ] = await Promise.all([
    server.ssrLoadModule("/src/features/intro/IntroPage.jsx"),
    server.ssrLoadModule("/src/features/intro/IntroGuidePage.jsx"),
    server.ssrLoadModule("/src/features/intro/components/MotionProvider.jsx"),
    server.ssrLoadModule("/src/features/intro/components/IntroHeader.jsx"),
    server.ssrLoadModule("/src/features/intro/components/IntroFooter.jsx"),
  ]);
  const render = (Page, isGuide) =>
    renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: isGuide ? "/guide" : "/" },
        createElement(
          MotionProvider,
          null,
          createElement(IntroHeader, { guide: isGuide }),
          createElement(Page),
          createElement(IntroFooter),
        ),
      ),
    );
  main = render(IntroPage, false);
  guide = render(IntroGuidePage, true);
});
after(async () => {
  await server?.close();
});

test("개요 다음에 참가 신청을 배치하고 현장 안내는 부스 뒤에 둔다", () => {
  const sections = [...main.matchAll(/<section id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(sections, [
    "about",
    "registration",
    "play",
    "prizes",
    "mileage",
    "booths",
    "onsite",
    "history",
    "organizers",
    "sponsors",
  ]);
});
test("신청과 현장 안내, 상세 안내와 FAQ에 무료 참가비를 표시한다", () => {
  assert.match(main, /참가비 무료/);
  assert.match(main, /<dt>참가비<\/dt><dd>무료<\/dd>/);
  assert.match(guide, /<dt>참가비<\/dt><dd>무료<\/dd>/);
  assert.match(guide, /참가비는 무료입니다/);
  assert.doesNotMatch(main + guide, /참가비[^<]*(?:추후|미정|접수 공지)/);
});
test("신청 자격과 내부, 외부 선발 기준을 유지한다", () => {
  for (const html of [main, guide]) {
    assert.match(html, /대회 당일 만 19세 이상인 학생/);
    assert.match(html, /동아리에 소속되지 않아도 신청 가능/);
    assert.match(html, /seKUrity/);
    assert.doesNotMatch(html, /SeKurity|KOTH|보드 활동/);
  }
  assert.match(main, /track-external[\s\S]*팀원 평균 학년이 낮은 팀 우선/);
});
test("올해 모집 인원과 작년 실적을 분리하고 원본 포스터를 연결한다", () => {
  assert.match(main, /75팀, 150명/);
  assert.match(
    main,
    /history-attendance[\s\S]*?100<span>명 참가<\/span><\/strong><span>50팀/,
  );
  assert.match(main, /\/assets\/intro\/msg-ctf-2025-poster.png/);
  assert.doesNotMatch(main, /192/);
});
test("메인과 상세 안내의 150만원 시상과 외부 3위 10만원이 일치한다", () => {
  assert.match(main, /150만원/);
  assert.match(guide, /150만원/);
  assert.match(
    guide,
    /외부 트랙<\/th><td>50만원<\/td><td>30만원<\/td><td>10만원<\/td>/,
  );
});
test("로그인은 기존 경로를 사용하고 참가 신청은 지정한 폼을 새 창으로 연다", () => {
  for (const html of [main, guide]) {
    assert.match(html, /class="header-login" href="\/login"[^>]*>LOGIN<\/a>/);
    assert.doesNotMatch(html, /aria-disabled="true"|LOGIN 준비 중/);
    for (const tag of html.match(/<a\b[^>]*>/g)) {
      if (tag.includes('target="_blank"'))
        assert.match(tag, /rel="noopener noreferrer"/);
      if (tag.includes('aria-label="참가 신청 새 창"'))
        assert.match(tag, /href="https:\/\/forms.gle\/mZQoNZkUM5mSj7XE6"/);
    }
    assert.doesNotMatch(html, /<form|<dialog|<iframe|javascript:/);
  }
});
test("화면에서 쓰는 모든 원본 이미지가 저장소 안에 있고 링크된 섹션이 존재한다", () => {
  const root = new URL("../../../", import.meta.url);
  for (const match of (main + guide).matchAll(
    /(?:src|href)="(\/assets\/[^"]+)"/g,
  )) {
    assert.ok(existsSync(new URL(`public${match[1]}`, root)), match[1]);
  }
  for (const html of [main, guide])
    for (const match of html.matchAll(/href="(\/guide|\/)#([^"]+)"/g)) {
      if (match[2] === "top") continue;
      assert.ok(
        (match[1] === "/guide" ? guide : main).includes(`id="${match[2]}"`),
        match[0],
      );
    }
});
test("인트로 CSS는 게임 페이지에 적용되는 전역 선택자를 추가하지 않는다", () => {
  const css = readFileSync(new URL("./intro.css", import.meta.url), "utf8");
  const parsed = postcss.parse(css);
  parsed.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name.endsWith("keyframes"))
      return;
    for (const selector of rule.selectors)
      assert.ok(selector.startsWith(".msg-intro"), selector);
  });
  parsed.walkAtRules("font-face", (rule) => {
    rule.walkDecls("font-family", (decl) =>
      assert.match(decl.value, /MSG Intro/),
    );
  });
  for (const match of css.matchAll(/url\("(\/assets\/[^"]+)"\)/g))
    assert.ok(
      existsSync(
        fileURLToPath(new URL(`../../../public${match[1]}`, import.meta.url)),
      ),
      match[1],
    );
});
test("모션 버튼은 텍스트 대신 아이콘을 쓰고 두 곳 모두 접근성 이름이 있다", () => {
  const buttons = main.match(
    /<button\b[^>]*class="[^"]*motion-control"[\s\S]*?<\/button>/g,
  );
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.match(button, /aria-label="화면 모션 일시정지"/);
    assert.match(button, /motion-pause/);
    assert.match(button, /motion-play/);
  }
});
