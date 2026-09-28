import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";
import postcss from "postcss";

let server;
const components = {};
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-design-qa-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const paths = {
    Login: "auth/components/LoginScreen",
    Leaderboard: "leaderboard/components/LeaderboardScreen",
    Rules: "rules/components/RulesScreen",
    Koth: "koth/components/KothScreen",
    AdminLayout: "admin/components/AdminLayout",
    AdminDashboard: "admin/pages/AdminDashboardPage",
    AdminMileage: "admin/pages/AdminMileagePage",
  };
  for (const [name, path] of Object.entries(paths)) {
    components[name] = (await server.ssrLoadModule(`/src/features/${path}.jsx`)).default;
  }
  components.QuickAction = (await server.ssrLoadModule("/src/features/admin/pages/AdminDashboardPage.jsx")).QuickActionButton;
});
after(async () => server?.close());

function render(name, props = {}) {
  return renderToStaticMarkup(createElement(StaticRouter, { location: "/" },
    createElement(components[name], props)));
}
function css(path) {
  return postcss.parse(readFileSync(new URL(`./${path}`, import.meta.url), "utf8"));
}
function declarations(root, selector) {
  const result = [];
  root.walkRules(selector, (rule) => rule.walkDecls((decl) => result.push([decl.prop, decl.value])));
  return result;
}

test("반응형 로그인도 입력 라벨, 자동 완성, 요청 중 잠금과 오류 메시지를 유지한다", () => {
  const html = render("Login", { submitting: true, feedback: { type: "error", message: "입력 정보를 확인해 주세요" } });
  assert.match(html, /for="login-username"/);
  assert.match(html, /for="login-password"/);
  assert.match(html, /autoComplete="username"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
  assert.match(html, /role="alert"[^>]*>입력 정보를 확인해 주세요/);
});

test("리더보드 표는 가로 탐색이 가능하며 긴 팀명과 원래 1~3위 이미지를 유지한다", () => {
  const name = "아주긴팀이름".repeat(12);
  const html = render("Leaderboard", {
    teams: [], leaderboardStatus: "empty", rankingStatus: "success",
    rankings: [1, 2, 3].map((rank) => ({ key: `${rank}`, rank, teamName: name, teamScore: 100, solveCount: 2, categoryScores: [], signatureScore: 30 })),
  });
  assert.match(html, /tabindex="0" role="region" aria-label="팀 순위표 가로 스크롤"/);
  assert.match(html, new RegExp(`title="${name}"`));
  for (const rank of [1, 2, 3]) assert.match(html, new RegExp(`aria-label="${rank}위"`));
  assert.equal((html.match(/class="[^"]*rankArtwork/g) || []).length, 3);
  assert.match(html, />CLUB<\/th>/);
});

test("규칙 문단은 원문을 유지하고 한 줄 고정과 항목별 절대 좌표를 사용하지 않는다", () => {
  const description = "긴 규칙 안내 ".repeat(25) + "15분마다 1회씩 충전됩니다";
  const html = render("Rules", { rules: [{ title: "주사위", icon: "", description }] });
  assert.ok(html.includes(description));
  const root = css("features/rules/components/RulesScreen.module.css");
  assert.ok(!declarations(root, ".ruleDescription").some(([property, value]) => property === "white-space" && value === "nowrap"));
  assert.ok(declarations(root, ".rulesList").some(([property, value]) => property === "overflow-y" && value === "auto"));
  assert.ok(!root.toString().includes(".ruleItem:nth-child"));
});

test("KoTH 모바일 배치용 제목을 추가해도 비활성 문제는 접속할 수 없다", () => {
  const challenge = {
    kothChallengeId: "challenge-1", clubName: "seKUrity", title: "테스트 문제",
    status: "SCHEDULED", imageSrc: "/assets/koth/challenge-maple-pass.png",
    position: { left: "5%", top: "60%", width: "12%", height: "26%" },
    challengeUrl: "https://example.invalid",
  };
  const html = render("Koth", {
    requestStatus: "success", authenticated: false, challenges: [challenge],
    selectedChallenge: challenge, clubDetail: { status: "success" },
    problemRanking: { status: "unauthenticated" },
  });
  assert.match(html, /--card-left:5%/);
  assert.match(html, /aria-label="seKUrity 테스트 문제 KoTH [^"]*"/);
  assert.match(html, /현재 접속할 수 없는 문제입니다/);
  assert.doesNotMatch(html, /href="https:\/\/example.invalid"/);
  assert.match(html, /aria-label="선택한 문제 정보 닫기"/);
});

test("관리자 공통 틀은 결제 탭 여부와 관계없이 같은 메뉴와 제목을 렌더링한다", () => {
  const html = render("AdminLayout", { title: "마일리지 / 결제 관리" });
  const payment = render("AdminLayout", { title: "마일리지 / 결제 관리", variant: "payment" });
  const withoutClock = (value) => value.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, "CLOCK");
  assert.equal(withoutClock(html), withoutClock(payment));
  assert.match(html, /aria-expanded="false" aria-controls="admin-menu"/);
  assert.match(html, /id="admin-menu" aria-label="관리자 메뉴"/);
  assert.match(render("AdminMileage"), /지급 \/ 회수/);
});

test("관리자 빠른 작업에는 실제 동작 이름만 표시하고 다른 동작의 이미지 문구를 재사용하지 않는다", () => {
  for (const [variant, label] of [["restart", "강제 재시작"], ["stop", "강제 종료"], ["mileage", "마일리지 지급"], ["rollback", "롤백 실행"]]) {
    const html = render("QuickAction", { variant, label });
    assert.match(html, new RegExp(`data-action="${variant}">${label}<\/button>`));
    assert.doesNotMatch(html, /btn-(?:create|extend)\.png/);
  }
});

test("모바일 로그인과 리더보드는 전체 캔버스 축소를 해제하고 44px 조작 영역을 둔다", () => {
  for (const path of ["auth/components/LoginScreen", "leaderboard/components/LeaderboardScreen"]) {
    const root = css(`features/${path}.module.css`);
    let found = false;
    root.walkAtRules("media", (media) => {
      if (!media.params.includes("max-width")) return;
      media.walkDecls("transform", (decl) => { if (decl.value === "none") found = true; });
    });
    assert.ok(found, path);
  }
  const root = css("features/leaderboard/components/LeaderboardScreen.module.css");
  assert.ok(declarations(root, ".pagination button, .refreshControls button").some(([property, value]) => property === "height" && value === "44px"));
});
