import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const RING = /<span[^>]*aria-hidden="true"[^>]*data-loading-ring[^>]*><\/span>/;

let server;
const load = async (path) => (await server.ssrLoadModule(path)).default;
const components = {};
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-loading-ring-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  components.LoadingRing = await load("/src/components/common/LoadingRing.jsx");
  components.RankingTable = await load("/src/features/leaderboard/components/RankingTable.jsx");
  components.ScoreGraph = await load("/src/features/leaderboard/components/LeaderboardScoreGraph.jsx");
  components.MileageHistory = await load("/src/features/mypage/components/MileageHistoryTable.jsx");
  components.SolveHistory = await load("/src/features/mypage/components/SolveHistoryTable.jsx");
  components.Timer = await load("/src/features/timer/components/TimerScreen.jsx");
});
after(async () => server?.close());

const render = (component, props, children) => renderToStaticMarkup(createElement(component, props, children));

test("링은 스크린리더에 읽히지 않고 문구는 그대로 남는다", () => {
  const inline = render(components.LoadingRing, null, "순위를 불러오는 중");
  assert.match(inline, new RegExp(`${RING.source}순위를 불러오는 중</span>$`));
  const page = render(components.LoadingRing, { size: "page" }, "화면을 불러오는 중");
  assert.match(page, /^<span class="[^"]*_label_[^"]* [^"]*_page_[^"]*">/);
  assert.match(page, /화면을 불러오는 중<\/span>$/);
});

test("오래 걸릴 수 있는 로딩 상태에만 링이 붙는다", () => {
  const ranking = render(components.RankingTable, { rankings: [], status: "loading" });
  assert.match(ranking, new RegExp(`${RING.source}순위를 불러오는 중`));
  assert.doesNotMatch(render(components.RankingTable, { rankings: [], status: "error" }), RING);
  assert.match(render(components.ScoreGraph, { teams: [], status: "loading" }), new RegExp(`${RING.source}점수를 불러오는 중`));
  assert.doesNotMatch(render(components.ScoreGraph, { teams: [], status: "empty" }), RING);
  assert.match(render(components.MileageHistory, { state: { status: "loading", data: null } }), new RegExp(`${RING.source}LOADING\\.\\.\\.`));
  assert.doesNotMatch(render(components.MileageHistory, { state: { status: "empty", data: [] } }), RING);
  assert.match(render(components.SolveHistory, { state: { status: "loading", data: null } }), new RegExp(`${RING.source}LOADING\\.\\.\\.`));
  assert.match(render(components.Timer, { status: "loading", contest: null }), new RegExp(`role="status"[^>]*><span class="[^"]*_page_[^"]*">${RING.source}타이머 정보를 불러오는 중입니다`));
});

// 화면 전체 대기와 화면 안 로딩 문구가 모두 링을 쓰는지 소스에서 확인한다
const SITES = [
  ["../../routes/AppRoutes.jsx", '<LoadingRing size="page">{children}</LoadingRing>'],
  ["../../routes/AppRoutes.jsx", "<Suspense fallback={<RouteLoading>화면을 불러오는 중</RouteLoading>}>"],
  ["../../routes/AppRoutes.jsx", "<Suspense fallback={<RouteLoading>대회 안내를 불러오는 중</RouteLoading>}>"],
  ["../../routes/AppRoutes.jsx", "<Suspense fallback={<RouteLoading>부스 문제를 불러오는 중</RouteLoading>}>"],
  ["../../routes/AppRoutes.jsx", "<Suspense fallback={<RouteLoading>동아리 부스를 불러오는 중</RouteLoading>}>"],
  ["../../routes/ContestGate.jsx", '<LoadingRing size="page">대회 시간을 확인하는 중</LoadingRing>'],
  ["../../routes/ContestGate.jsx", '<LoadingRing size="page">화면을 불러오는 중</LoadingRing>'],
  ["../../routes/AuthenticatedRoute.jsx", '<LoadingRing size="page">로그인 확인 중</LoadingRing>'],
  ["../../features/board/components/BoardScreen.jsx", '<LoadingRing size="page">보드 정보를 불러오는 중입니다</LoadingRing>'],
  ["../../features/board/components/OpenChallengesSidePanel.jsx", "<LoadingRing>내 인스턴스 확인 중</LoadingRing>"],
  ["../../features/board/components/OpenChallengesSidePanel.jsx", "<LoadingRing>목록 확인 중</LoadingRing>"],
  ["../../features/challenges/components/ChallengeDetailSkeleton.jsx", "<LoadingRing>문제 정보를 불러오는 중입니다</LoadingRing>"],
  ["../../features/challenges/components/ChallengeAttachment.jsx", '{state.status === "loading" ? <LoadingRing>{state.message}</LoadingRing> : state.message}'],
  ["../../features/koth/components/KothFileButton.jsx", '{state.status === "loading" ? <LoadingRing>{state.message}</LoadingRing> : state.message}'],
  ["../../features/koth/components/KothScreen.jsx", "<LoadingRing>KoTH 정보를 불러오는 중</LoadingRing>"],
  ["../../features/koth/components/KothChallengeSheet.jsx", "<LoadingRing>순위 조회 중</LoadingRing>"],
  ["../../features/koth/components/KothChallengeSheet.jsx", "<LoadingRing>최신 문제 정보를 확인하는 중</LoadingRing>"],
  ["../../features/mypage/components/TeamInfoCard.jsx", "<LoadingRing>QR 발급 중</LoadingRing>"],
  ["../../features/mypage/components/TeamInfoCard.jsx", "<LoadingRing>개인 순위를 불러오는 중</LoadingRing>"],
  ["../../features/signatures/components/BoothMenuModal.jsx", "<LoadingRing>문제 안내를 불러오는 중입니다</LoadingRing>"],
];

test("오래 걸리는 로딩 문구 자리마다 링을 붙인다", () => {
  for (const [file, markup] of SITES) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.ok(source.includes(markup), `${file}: ${markup}`);
  }
  // 순위표 범례 칸은 좁아 링이 붙으면 문구가 두 줄로 깨진다 같은 화면의 그래프와 표 링으로 충분하다
  const legend = readFileSync(new URL("../../features/leaderboard/components/LeaderboardChart.jsx", import.meta.url), "utf8");
  assert.ok(!legend.includes("LoadingRing"));
});

test("링은 인스턴스 칸과 같은 속도로 돌고 0.3초 뒤에 나타나며 움직임 줄이기에서는 멈춘다", () => {
  const css = readFileSync(new URL("./LoadingRing.module.css", import.meta.url), "utf8");
  const instance = readFileSync(new URL("../../features/challenges/components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
  const speed = /animation: instance-spin ([\d.]+s) linear infinite;/.exec(instance)?.[1];
  assert.ok(speed);
  assert.match(css, new RegExp(`\\.ring::after \\{[^}]*animation: loading-ring-turn ${speed.replace(".", "\\.")} linear infinite;`));
  assert.match(css, /\.ring \{[^}]*opacity: 0;[^}]*animation: loading-ring-in 0\.2s ease-out 0\.3s forwards;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.ring::after \{\s*animation: none;/);
  // 색은 놓인 자리의 글자색을 따른다
  assert.match(css, /\.ring::before,\s*\.ring::after \{[^}]*solid currentColor;/);
});
