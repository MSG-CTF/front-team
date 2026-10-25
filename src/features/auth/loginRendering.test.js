import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
let LoginScreen;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-login-rendering-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  LoginScreen = (await server.ssrLoadModule("/src/features/auth/components/LoginScreen.jsx")).default;
});
after(async () => server?.close());

const render = (props = {}) => renderToStaticMarkup(
  createElement(StaticRouter, { location: "/login" }, createElement(LoginScreen, { onLogin() {}, ...props })),
);

test("로그인은 원래 로고와 프레임, 입력 아이콘과 장식 버튼을 유지한다", () => {
  const html = render();
  assert.match(html, /<main/);
  assert.match(html, /<h1 id="login-title"[^>]*>로그인<\/h1>/);
  assert.match(html, /src="\/assets\/login\/logo-cutout.webp"/);
  assert.match(html, /width="1254" height="1254"/);
  assert.match(html, /fetchPriority="high"/i);
  assert.match(html, /href="\/#top"/);
  assert.match(html, /src="\/assets\/login\/login-button-cutout.webp"/);
  assert.equal((html.match(/href="\/assets\/login\/login-card-plate.webp"/g) || []).length, 15);
  assert.equal((html.match(/data-login-artwork="frame"/g) || []).length, 1);
  assert.equal((html.match(/data-login-artwork="field"/g) || []).length, 2);
  assert.match(html, /placeholder="USERNAME"/);
  assert.match(html, /placeholder="PASSWORD"/);
  assert.match(html, />LOGIN<\/span>/);
  assert.match(html, /autoCapitalize="none"/i);
  assert.match(html, /spellCheck="false"/i);
  assert.doesNotMatch(html, /disabled=""|role="alert"/);
});

test("계정 확인과 로그인 요청 중에는 같은 틀을 유지하면서 입력과 제출을 잠근다", () => {
  for (const props of [{ checkingSession: true }, { submitting: true }]) {
    const html = render(props);
    assert.match(html, /aria-busy="true"/);
    assert.equal((html.match(/disabled=""/g) || []).length, 3);
    assert.match(html, /aria-labelledby="login-title"/);
    assert.match(html, /for="login-username"/);
    assert.match(html, /for="login-password"/);
    assert.match(html, /autoComplete="current-password"/i);
  }
  assert.match(render({ checkingSession: true }), /src="\/assets\/login\/login-button-cutout.webp"/);
  assert.match(render({ checkingSession: true }), /role="status">로그인 상태를 확인하고 있어요<\/p>/);
  assert.match(render({ submitting: true }), /role="status">로그인 중<\/p>/);
});

test("로그인 오류는 입력창과 연결된 일반 문단으로 표시하고 서버 문자열을 HTML로 해석하지 않는다", () => {
  const html = render({ feedback: { type: "error", message: '<script>alert("test")</script> ' + "긴오류".repeat(40) } });
  assert.equal((html.match(/aria-describedby="login-feedback"/g) || []).length, 2);
  assert.match(html, /id="login-feedback"[^>]*role="alert"/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  assert.match(css, /overflow-wrap: anywhere/);
  const pageRules = css.match(/\.page \{[^}]+\}/g).join(" ");
  assert.doesNotMatch(pageRules, /overflow: hidden|100vw|scale\(|backdrop-filter|background-plaza\.png/);
});

test("자동채움은 유지하면서 브라우저 배경이 로그인 장식을 가리지 않게 한다", () => {
  const html = render();
  assert.match(html, /autoComplete="username"/i);
  assert.match(html, /autoComplete="current-password"/i);
  assert.doesNotMatch(html, /autoComplete="(?:off|new-password)"/i);

  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  const autofill = css.match(/\.field:is\(:autofill, :-webkit-autofill\) \{([^}]+)\}/);
  assert.ok(autofill, "표준 및 WebKit 자동채움 상태를 모두 처리해야 한다");
  assert.match(autofill[1], /appearance:\s*none\s*;/);
  assert.match(autofill[1], /-webkit-background-clip:\s*text\s*;/);
  assert.match(autofill[1], /\n\s*background-clip:\s*text\s*;/);
  assert.match(autofill[1], /-webkit-text-fill-color:\s*#613d15\s*;/);
  assert.match(autofill[1], /caret-color:\s*#613d15\s*;/);
  assert.doesNotMatch(autofill[1], /box-shadow|transition|animation|text-fill-color:\s*transparent/);
});

test("고대비 모드에서는 자동채움 글자와 커서에 시스템 색상을 적용한다", () => {
  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  const forcedColors = css.split("@media (forced-colors: active)")[1];
  const autofill = forcedColors.match(/\.field:is\(:autofill, :-webkit-autofill\) \{([^}]+)\}/);
  assert.ok(autofill, "고대비 모드에는 별도 자동채움 규칙이 있어야 한다");
  assert.match(autofill[1], /-webkit-background-clip:\s*border-box\s*;/);
  assert.match(autofill[1], /\n\s*background-clip:\s*border-box\s*;/);
  assert.match(autofill[1], /-webkit-text-fill-color:\s*CanvasText\s*;/);
  assert.match(autofill[1], /caret-color:\s*CanvasText\s*;/);
  assert.doesNotMatch(autofill[1], /forced-color-adjust:\s*none/);
});

test("원래 로그인 장식과 글꼴을 재사용하되 큰 PNG 배경과 외부 글꼴 요청은 되살리지 않는다", () => {
  const root = new URL("../../../", import.meta.url);
  const assets = {
    desktop: "public/assets/intro/hero-plaza.webp",
    mobile: "public/assets/intro/hero-plaza-mobile.webp",
    plate: "public/assets/login/login-card-plate.webp",
    logo: "public/assets/login/logo-cutout.webp",
    button: "public/assets/login/login-button-cutout.webp",
    englishFont: "public/assets/intro/fonts/IMFeENrm28P.woff2",
    font: "public/assets/fonts/ui/login-common.woff2",
  };
  const bytes = Object.fromEntries(Object.entries(assets).map(([name, path]) => {
    const url = new URL(path, root);
    assert.ok(existsSync(url), path);
    return [name, statSync(url).size];
  }));
  const common = bytes.plate + bytes.logo + bytes.button + bytes.englishFont + bytes.font;
  assert.ok(bytes.desktop + common < 1_800_000);
  assert.ok(bytes.mobile + common < 1_500_000);
  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  assert.match(css, /font-display: swap/);
  assert.match(css, /MSG Login English/);
  assert.doesNotMatch(css, /https?:|background-plaza\.png|assets\/challenge-detail/);
  const artwork = readFileSync(new URL("./components/LoginArtwork.jsx", import.meta.url), "utf8");
  assert.equal((artwork.match(/<image href=\{PLATE_SRC\}/g) || []).length, 1);
  assert.doesNotMatch(artwork, /canvas|filter|foreignObject|dangerouslySetInnerHTML/);
});

test("원본 로그인판의 반응형 규칙은 장식과 버튼을 숨기거나 다른 모바일 틀로 바꾸지 않는다", () => {
  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  const responsive = css.split("@media (forced-colors: active)")[0];
  assert.doesNotMatch(responsive, /display: none|border-image|assets\/challenge-detail/);
  assert.match(responsive, /\.frameArtwork[\s\S]*pointer-events: none/);
  assert.match(responsive, /\.frameArtwork svg,[\s\S]*overflow: hidden/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /background: Canvas/);
});

test("로그인판 조각은 WebKit에서도 판 전체가 아닌 각 격자 행 높이에 맞춘다", () => {
  const css = readFileSync(new URL("./components/LoginScreen.module.css", import.meta.url), "utf8");
  const sliceRule = css.match(/\.frameArtwork > svg \{([^}]+)\}/);
  assert.ok(sliceRule, "격자 안의 프레임 조각에 별도 높이 규칙이 있어야 한다");
  assert.match(sliceRule[1], /height:\s*auto\s*;/);
  assert.match(sliceRule[1], /align-self:\s*stretch\s*;/);
  assert.doesNotMatch(sliceRule[1], /height:\s*100%/);
  const sharedRule = css.match(/\.frameArtwork svg,\s*\.fieldArtwork svg \{([^}]+)\}/);
  assert.ok(sharedRule, "배경 종이와 입력창 장식의 공통 규칙은 유지한다");
  assert.match(sharedRule[1], /height:\s*100%\s*;/);
  assert.ok(sliceRule.index > sharedRule.index, "프레임 조각 높이가 공통 규칙보다 우선해야 한다");
});
