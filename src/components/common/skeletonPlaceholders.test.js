import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";

const BAR = /<span class="[^"]*" aria-hidden="true" data-skeleton="true"><\/span>/;
const count = (html, pattern) => (html.match(new RegExp(pattern, "g")) ?? []).length;

let server;
const components = {};
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-skeleton-placeholder-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const paths = {
    SkeletonBar: "components/common/SkeletonBar",
    Dice: "features/board/components/DiceStatusPanel",
    Chance: "features/board/components/ChanceCardSummary",
    OpenList: "features/board/components/OpenChallengesSidePanel",
    TeamCard: "features/mypage/components/TeamInfoCard",
    MyPage: "features/mypage/components/MyPageScreen",
    Koth: "features/koth/components/KothScreen",
    Legend: "features/leaderboard/components/LeaderboardChart",
    Toolbar: "features/leaderboard/components/RankingToolbar",
  };
  for (const [name, path] of Object.entries(paths)) {
    components[name] = (await server.ssrLoadModule(`/src/${path}.jsx`)).default;
  }
});
after(async () => server?.close());

const render = (name, props = {}) => renderToStaticMarkup(
  createElement(StaticRouter, { location: "/" }, createElement(components[name], props)));

test("막대는 스크린리더에 읽히지 않고 놓인 자리의 글자색으로 빛이 지나가며 움직임 줄이기에서는 멈춘다", () => {
  assert.match(render("SkeletonBar"), BAR);
  const css = readFileSync(new URL("./SkeletonBar.module.css", import.meta.url), "utf8");
  assert.match(css, /color-mix\(in srgb, currentColor 18%, transparent\)/);
  assert.match(css, /animation: skeleton-bar-gleam 1\.6s ease-in-out infinite;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.bar \{\s*animation: none;/);
});

test("보드를 처음 받는 동안 주사위 0/3, 찬스카드 없음, 문제 0개처럼 보이지 않는다", () => {
  const dice = render("Dice", { rollsLeft: 0, maxRolls: 3, canRoll: false, loading: true });
  assert.doesNotMatch(dice, /0\/3/);
  assert.match(dice, /aria-label="주사위 보유 확인 중"/);
  assert.match(dice, BAR);
  assert.match(render("Dice", { rollsLeft: 2, maxRolls: 3, canRoll: true }), /주사위 <strong>2\/3<\/strong>/);

  const chanceProps = { cards: [], cells: [], consumedCellIndexes: [] };
  const chance = render("Chance", { ...chanceProps, loading: true });
  assert.doesNotMatch(chance, /찬스카드 없음/);
  assert.match(chance, BAR);
  assert.match(render("Chance", chanceProps), /찬스카드 없음/);

  const pending = render("OpenList", { challenges: [], loading: true });
  assert.equal(count(pending, "data-skeleton"), 3);
  assert.doesNotMatch(pending, /전체 <span>0<\/span>/);
  assert.match(render("OpenList", { challenges: [] }), /전체 <span>0<\/span>/);
});

test("마이페이지는 프로필을 받는 동안 LOADING을 팀 이름처럼 띄우지 않는다", () => {
  const props = { profile: { status: "loading", data: null }, memberRanking: null, qrState: { status: "idle" }, qrDisabled: false };
  const card = render("TeamCard", props);
  assert.doesNotMatch(card, /LOADING/);
  assert.match(card, /<h1 class="[^"]*">[^]*?data-skeleton[^]*?팀 정보를 불러오는 중<\/span><\/h1>/);
  // 카드 그림의 팀원 글머리표 두 줄 자리에 막대를 둔다
  assert.equal(count(card, '<li aria-hidden="true"><span'), 2);

  const page = render("MyPage", {
    ...props,
    mileageHistory: { status: "loading", data: null },
    solveHistory: { status: "loading", data: null },
  });
  assert.doesNotMatch(page, /…|>LOADING</);
  // 점수, 마일리지, 점수 내역 넷, 순위 자리
  assert.ok(count(page, "data-skeleton") >= 7);
});

test("KoTH 정보를 받는 동안 정해진 우표 카드를 제자리에 깔고 안내는 팀 점수 자리에 둔다", () => {
  const html = render("Koth", {
    requestStatus: "loading", challenges: [], clubDetail: { status: "idle" },
    problemRanking: { status: "idle" }, authenticated: true,
  });
  assert.equal(count(html, 'src="/assets/koth/challenge-'), 6);
  assert.match(html, /--card-left:5\.8333%/);
  assert.match(html, /<aside class="[^"]*" role="status">[^]*KoTH 정보를 불러오는 중/);
  const css = readFileSync(new URL("../../features/koth/components/KothScreen.module.css", import.meta.url), "utf8");
  assert.match(css, /\.challengePending \{[^}]*pointer-events: none;[^}]*opacity: 0\.55;/);
});

test("순위표는 처음 받는 동안 같은 안내를 두 번 띄우지 않고 페이지 표시를 감춘다", () => {
  assert.doesNotMatch(render("Legend", { teams: [], status: "loading" }), /불러오는 중/);
  assert.match(render("Legend", { teams: [], status: "error" }), /팀 점수를 불러오지 못했습니다/);
  assert.match(render("Toolbar", { page: 1, pageCount: 1, loading: true }), /<nav class="[^"]*" aria-label="순위 페이지" data-pending="true">/);
  assert.doesNotMatch(render("Toolbar", { page: 1, pageCount: 1 }), /data-pending/);
  const css = readFileSync(new URL("../../features/leaderboard/components/LeaderboardScreen.module.css", import.meta.url), "utf8");
  assert.match(css, /\.pagination\[data-pending\] \{ visibility: hidden; \}/);
});
