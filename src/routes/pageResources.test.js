import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ensureGameFonts, preloadIntroResources, preloadGameArtwork, isIntroPath, GAME_FONT_STYLESHEETS } from "./pageResources.js";

function mockDocument() {
  const links = new Map();
  return {
    links,
    getElementById: id => links.get(id),
    createElement: () => ({ attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }),
    head: { appendChild(link) { links.set(link.id, link); } },
  };
}

test("홍보와 참가 안내에서는 외부 게임 글꼴을 요청하지 않는다", () => {
  for (const pathname of ["/", "/guide", "/guide/"]) {
    const document = mockDocument();
    ensureGameFonts(document, pathname);
    assert.equal(isIntroPath(pathname), true);
    assert.equal(document.links.size, 0);
  }
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/);
  assert.match(html, /\/assets\/intro\/favicon.png/);
});

test("게임 화면 진입과 재방문은 기존 글꼴 CSS를 한 번만 붙인다", () => {
  const document = mockDocument();
  for (const pathname of ["/login", "/board", "/admin", "/leaderboard", "/"]) {
    ensureGameFonts(document, pathname);
  }
  assert.equal(document.links.size, GAME_FONT_STYLESHEETS.length);
  assert.deepEqual([...document.links.values()].map(link => link.attributes.href), GAME_FONT_STYLESHEETS);
  assert.ok([...document.links.values()].every(link => link.attributes.rel === "stylesheet"));
});

test("로그인 화면만 열 때에는 외부 게임 글꼴을 요청하지 않는다", () => {
  const document = mockDocument();
  ensureGameFonts(document, "/login");
  ensureGameFonts(document, "/login/");
  assert.equal(document.links.size, 0);
  ensureGameFonts(document, "/board");
  assert.equal(document.links.size, GAME_FONT_STYLESHEETS.length);
  ensureGameFonts(document, "/login");
  ensureGameFonts(document, "/board");
  assert.equal(document.links.size, GAME_FONT_STYLESHEETS.length);
});

test("첫 화면 그림만 우선 받고 화면 폭과 픽셀 밀도에 맞춰 고른다", () => {
  const document = mockDocument();
  preloadIntroResources(document, "/");
  preloadIntroResources(document, "/");
  const links = [...document.links.values()].map(link => link.attributes);
  assert.equal(links.length, 3);
  assert.equal(document.links.get("msg-intro-cover-desktop").attributes.media, "(min-width: 681px)");
  assert.equal(document.links.get("msg-intro-cover-mobile").attributes.media, "(max-width: 680px)");
  assert.equal(links.filter(link => link.as === "font").length, 0);
  assert.match(document.links.get("msg-intro-cover-mobile").attributes.imagesrcset, /hero-plaza-mobile.webp 1x, .*hero-plaza.webp 2x/);
  for (const link of links) {
    assert.ok(existsSync(new URL(`../../public${link.href}`, import.meta.url)), link.href);
  }
});

test("상세 안내에는 첫 화면 배경을 미리 읽지 않고 게임에는 홍보 소재를 미리 읽지 않는다", () => {
  const guide = mockDocument();
  preloadIntroResources(guide, "/guide");
  assert.equal(guide.links.size, 0);
  const game = mockDocument();
  preloadIntroResources(game, "/login");
  assert.equal(game.links.size, 0);
});

test("화면 이동을 준비할 때 선택한 그림만 한 번 받고 API나 다른 화면은 미리 읽지 않는다", () => {
  const document = mockDocument();
  for (const path of ["/", "/login", "/board", "/admin", "/signatures-other"]) preloadGameArtwork(document, path);
  assert.equal(document.links.size, 0);
  preloadGameArtwork(document, "/rules");
  preloadGameArtwork(document, "/rules/");
  assert.equal(document.links.size, 1);
  const link = [...document.links.values()][0].attributes;
  assert.equal(link.href, "/assets/login/background-plaza.webp");
  assert.equal(link.as, "image");
  assert.ok(existsSync(new URL(`../../public${link.href}`, import.meta.url)));
});

test("부스의 미리 읽기와 화면 이미지는 같은 해상도 후보를 쓴다", () => {
  const document = mockDocument();
  document.defaultView = { matchMedia: () => ({ matches: true }) };
  preloadGameArtwork(document, "/signatures");
  preloadGameArtwork(document, "/signatures/clubs/club-1");
  assert.equal(document.links.size, 1);
  const link = [...document.links.values()][0].attributes;
  const page = readFileSync(new URL("../features/signatures/pages/SignaturesPage.jsx", import.meta.url), "utf8");
  assert.ok(page.includes(`srcSet="${link.imagesrcset}"`));
  assert.ok(page.includes(`sizes="${link.imagesizes}"`));
  assert.equal(link.type, "image/avif");
  document.defaultView.matchMedia = () => ({ matches: false });
  preloadGameArtwork(document, "/signatures");
  assert.equal([...document.links.values()].at(-1).attributes.href, "/assets/signatures/club-festival-v1.webp");
});
