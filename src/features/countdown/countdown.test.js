import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import {
  burstLeaves,
  clockParts,
  countdownPhase,
  FINAL_SECONDS,
  momentLabels,
} from "./utils/countdown.js";
import { LOGO_LEAVES } from "./utils/logoLeaves.js";
import { GATED_PREFIXES } from "../../routes/contestGate.js";
import { GATED_PAGE_IMPORTS } from "../../routes/gatedPagePreload.js";

let server;
let Countdown;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-countdown-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  Countdown = (await server.ssrLoadModule("/src/features/countdown/components/ContestCountdown.jsx")).default;
});

after(async () => server?.close());

const START = "2026-11-08T01:00:00Z";
const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Countdown, { targetTime: START, ...props })));

test("남은 초로 기다림, 마지막 10초, 마무리 연출을 가른다", () => {
  assert.equal(FINAL_SECONDS, 10);
  for (const value of [null, undefined, Number.NaN, 11, 3600]) assert.equal(countdownPhase(value), "waiting", String(value));
  for (const value of [10, 7, 1]) assert.equal(countdownPhase(value), "final", String(value));
  for (const value of [0, -3]) assert.equal(countdownPhase(value), "finale", String(value));
});

test("홍보 페이지처럼 시, 분, 초 칸으로 나누고 하루가 넘으면 일 칸을 붙인다", () => {
  assert.deepEqual(clockParts(3661).map(({ label, value }) => `${value} ${label}`), ["01 HOURS", "01 MINUTES", "01 SECONDS"]);
  assert.deepEqual(clockParts(93784).map(({ value }) => value), ["01", "02", "03", "04"]);
  assert.deepEqual(clockParts(-1), []);
  assert.deepEqual(clockParts(null), []);
});

test("시각은 서울 시간으로 날짜와 시작이나 종료 시각 두 줄을 만든다", () => {
  assert.deepEqual(momentLabels(START), { date: "11월 8일 일요일", time: "오전 10시 시작" });
  assert.deepEqual(momentLabels("2026-10-25T08:54:00Z"), { date: "10월 25일 일요일", time: "오후 5시 54분 시작" });
  assert.deepEqual(momentLabels("2026-11-08T13:00:00Z", "종료"), { date: "11월 8일 일요일", time: "오후 10시 종료" });
  assert.equal(momentLabels("nope"), null);
  assert.equal(momentLabels(null), null);
});

test("로고 잎 10장은 10초부터 1초까지 한 장씩 맡고 로고 가지 그림 안에 있다", () => {
  assert.deepEqual(LOGO_LEAVES.map((leaf) => leaf.second), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  for (const leaf of LOGO_LEAVES) {
    assert.ok(existsSync(new URL(`../../../public${leaf.src}`, import.meta.url)), leaf.src);
    assert.ok(leaf.left >= 0 && leaf.left + leaf.width <= 100, leaf.src);
    assert.ok(leaf.top >= 0 && leaf.top + leaf.height <= (637 - 325) / 571 * 100 + 1, `${leaf.src} 은 윗줄 위 그림 띠 안`);
  }
  assert.ok(existsSync(new URL("../../../public/assets/countdown/logo-branch.webp", import.meta.url)));
  const burst = burstLeaves(2026);
  assert.equal(burst.length, 36);
  assert.ok(burst.some((leaf) => leaf.dx < 0) && burst.some((leaf) => leaf.dx > 0), "양쪽으로 퍼짐");
});

test("기다리는 동안은 홍보 페이지 첫 화면처럼 로고, 날짜, STARTS IN, 볼 수 있는 화면 링크를 둔다", () => {
  const html = render({ secondsLeft: 93784 });
  assert.match(html, /data-phase="waiting"/);
  assert.match(html, /11월 8일 일요일/);
  assert.match(html, /오전 10시 시작/);
  assert.match(html, /STARTS IN/);
  assert.match(html, /<small>DAYS<\/small>/);
  assert.match(html, /href="\/rules"[^>]*>게임 규칙/);
  assert.match(html, /href="\/mypage"[^>]*>마이페이지/);
  assert.match(html, /href="\/timer"[^>]*>대회 타이머/);
  // 장식 줄과 글자는 로고 원본을 쓰고, 위 그림은 잎을 뗀 가지와 잎 10장으로 다시 쌓는다
  assert.equal((html.match(/\/assets\/intro\/event-logo\.webp/g) || []).length, 2);
  assert.equal((html.match(/\/assets\/countdown\/logo-branch\.webp/g) || []).length, 1);
  assert.equal((html.match(/\/assets\/countdown\/logo-leaf-\d\d\.webp/g) || []).length, 10);
  assert.doesNotMatch(html, /data-urgent=/);
});

test("시작 시각을 모르면 시계 대신 정해지면 열린다고 적는다", () => {
  const html = render({ targetTime: null, secondsLeft: null });
  assert.match(html, /시작 시각이 정해지면 열립니다/);
  assert.doesNotMatch(html, /STARTS IN/);
});

test("마지막 10초는 MSG CTF 글자 자리에 숫자를 세우고 3초부터 더 밝힌다", () => {
  const seven = render({ secondsLeft: 7 });
  assert.match(seven, /data-phase="final"/);
  assert.match(seven, /data-urgent="false"[^>]*>7</);
  assert.match(seven, /대회 시작까지 7초/);
  assert.equal((seven.match(/data-rule=/g) || []).length, 4);
  assert.match(render({ secondsLeft: 3 }), /data-urgent="true"[^>]*>3</);
});

test("가지 잎은 남은 초에 맞춰 한 장씩 떨어지고, 중간에 열면 이미 떨어졌어야 할 잎은 비워 둔다", () => {
  const seven = render({ secondsLeft: 7 });
  // 7초를 처음 보면 6초부터 1초까지 맡은 잎 6장만 가지에 남고 7초 잎 한 장이 떨어진다
  assert.equal((seven.match(/logo-leaf-\d\d\.webp/g) || []).length, 6 + 1);
  assert.match(seven, /logo-leaf-07\.webp/);
  assert.doesNotMatch(seven, /logo-leaf-(?:08|09|10)\.webp/);
  const finale = render({ secondsLeft: 0, overlay: true });
  assert.equal((finale.match(/logo-leaf-\d\d\.webp/g) || []).length, 10, "0초에 잎이 모두 다시 돋는다");
});

test("시작 연출은 게임 화면 위에 덮이고 MSG CTF 글자와 퍼지는 잎을 보인다", () => {
  const html = render({ secondsLeft: 0, overlay: true });
  assert.match(html, /data-phase="finale"/);
  assert.match(html, /data-overlay="true"/);
  // 0초는 MSG CTF 글자가 돌아오는 연출만 두고 로고 아래 문구는 띄우지 않는다
  assert.doesNotMatch(html, />대회를 시작합니다<|>대회 시작까지</);
  assert.doesNotMatch(html, /role="main"/);
  assert.doesNotMatch(html, /data-urgent=/);
  const css = readFileSync(new URL("./components/ContestCountdown.module.css", import.meta.url), "utf8");
  // 시작 순간 게임 화면이 붙으며 바쁜 동안에도 끊기지 않게 시작 연출은 투명도와 이동만 움직인다
  for (const name of ["word-return", "center-exit", "digit-out", "curtain-lift", "burst-out", "leaf-return", "logo-leaf-fall"]) {
    const frames = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";
    assert.ok(frames, name);
    assert.doesNotMatch(frames, /filter/, name);
  }
});

test("대기 화면은 시작 시각에 게임 화면을 따로 기다리게 해 시작 연출이 멈추지 않는다", () => {
  const gate = readFileSync(new URL("../../routes/ContestGate.jsx", import.meta.url), "utf8");
  assert.match(gate, /<Suspense fallback=\{<div role="status" className=\{styles\.loading\}><LoadingRing size="page">화면을 불러오는 중<\/LoadingRing><\/div>\}>\{children\}<\/Suspense>/);
  assert.match(gate, /<ContestCountdown targetTime=/);
  assert.match(gate, /useStartFinale\(gate\.blocked, gated\)/);
  assert.match(gate, /preloadGatedPage\(pathname\)/);
});

test("대기 중에 미리 받는 화면은 막는 경로마다 있고 AppRoutes 와 같은 파일을 가리킨다", () => {
  const routes = readFileSync(new URL("../../routes/AppRoutes.jsx", import.meta.url), "utf8");
  const preload = readFileSync(new URL("../../routes/gatedPagePreload.js", import.meta.url), "utf8");
  for (const prefix of GATED_PREFIXES) {
    assert.ok(GATED_PAGE_IMPORTS.some(([pattern]) => pattern.test(prefix)), prefix);
  }
  for (const [, file] of preload.matchAll(/import\("(\.\.\/features\/[^"]+)"\)/g)) {
    assert.ok(routes.includes(`import("${file}")`), file);
  }
});
