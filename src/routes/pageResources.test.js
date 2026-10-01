import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ensureGameFonts, preloadIntroResources, isIntroPath, GAME_FONT_STYLESHEETS } from "./pageResources.js";

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
