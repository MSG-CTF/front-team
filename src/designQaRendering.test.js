import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";
import postcss from "postcss";
import { prepareBoardLines } from "./features/board/utils/boardLines.js";
import { getBoardCellMaskPath } from "./features/board/utils/boardVisited.js";
import { getBoardCellPosition } from "./features/board/utils/boardData.js";

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
    BoardNav: "board/components/BoardNav",
    DiceStatusPanel: "board/components/DiceStatusPanel",
    ChanceCardSummary: "board/components/ChanceCardSummary",
    BoardVisitedOverlay: "board/components/BoardVisitedOverlay",
    BoardSurface: "board/components/BoardSurface",
    BoardCellTarget: "board/components/BoardCellTarget",
    MileageRoulette: "board/components/MileageRouletteModal",
    BoardArtwork: "board/components/BoardArtwork",
    BoardPiece: "board/components/BoardPiece",
    BoardTrain: "board/components/BoardTrain",
    AirportTravelOverlay: "board/components/AirportTravelOverlay",
    Dice3D: "board/components/Dice3D",
    BoardEventPanel: "board/components/BoardEventPanel",
    ChallengeSelection: "board/components/ChallengeSelection",
    BoardLineOverlay: "board/components/BoardLineOverlay",
    BoardStartReward: "board/components/BoardStartReward",
    BoardLineSummary: "board/components/BoardLineSummary",
    OpenChallengesPanel: "board/components/OpenChallengesSidePanel",
    AdminLayout: "admin/components/AdminLayout",
    AdminDashboard: "admin/pages/AdminDashboardPage",
    AdminMileage: "admin/pages/AdminMileagePage",
  };
  for (const [name, path] of Object.entries(paths)) {
    components[name] = (await server.ssrLoadModule(`/src/features/${path}.jsx`)).default;
  }
  components.QuickAction = (await server.ssrLoadModule("/src/features/admin/components/AdminWidgets.jsx")).ActionTile;
  components.DiceFallback = (await server.ssrLoadModule("/src/features/board/components/DiceFallback.jsx")).DiceFallback;
  components.LiveDiceStatus = (await server.ssrLoadModule("/src/features/board/components/BoardCountdownPanels.jsx")).BoardDiceStatusPanel;
  components.RouteLoadBoundary = (await server.ssrLoadModule("/src/routes/RouteLoadBoundary.jsx")).default;
});
after(async () => server?.close());

test("충전과 제한시간 숫자는 서버 기준 시간을 유지하면서 작은 패널에서만 갱신한다", () => {
  const now = Date.now();
  const diceStatus = { serverTime: new Date(now).toISOString(), receivedAt: now, nextDiceResetAt: new Date(now + 600000).toISOString() };
  const renderStatus = (status, activeChallenge) => renderToStaticMarkup(createElement(components.LiveDiceStatus, { diceStatus: status, activeChallenge, rollsLeft: 2, canRoll: true }));
  assert.match(renderStatus(diceStatus), /충전까지 10:00/);
  assert.match(renderStatus({ ...diceStatus, timerRunning: true }, { solveDeadlineAt: new Date(now + 300000).toISOString() }), /문제 제한 05:00/);
  assert.match(renderStatus({ ...diceStatus, timerRunning: true }, { solveDeadlineAt: new Date(now + 300000).toISOString() }), /충전까지 10:00/);
  assert.match(renderStatus(diceStatus, { solveDeadlineAt: new Date(now + 300000).toISOString() }), /충전까지 10:00/);
  assert.doesNotMatch(renderStatus({ ...diceStatus, nextDiceResetAt: null }), /충전까지|문제 제한/);
  assert.doesNotMatch(renderStatus({ ...diceStatus, receivedAt: undefined }), /NaN/);
  for (const file of ["BoardScreen.jsx", "../hooks/useBoardController.js"]) {
    const source = readFileSync(new URL(`./features/board/components/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /setNow|setInterval/);
  }
});

test("주사위가 가득 차면 충전 표시를 숨기되 문제 제한 시간은 유지한다", () => {
  const html = renderToStaticMarkup(createElement(components.DiceStatusPanel, { rollsLeft: 3, resetInSeconds: 300, challengeRemainingSeconds: 600 }));
  assert.match(html, /문제 제한.*10:00/);
  assert.doesNotMatch(html, /충전까지/);
});

test("화면 코드가 실패하면 내부 오류 대신 재시도 안내를 보여준다", () => {
  const boundary = new components.RouteLoadBoundary({ children: "정상 화면" });
  boundary.state = components.RouteLoadBoundary.getDerivedStateFromError(new Error("내부 오류"));
  const html = renderToStaticMarkup(boundary.render());
  assert.match(html, /role="alert"/);
  assert.match(html, /화면을 불러오지 못했습니다/);
  assert.match(html, /다시 불러오기/);
  assert.doesNotMatch(html, /내부 오류/);
  const routes = readFileSync(new URL("./routes/AppRoutes.jsx", import.meta.url), "utf8");
  assert.match(routes, /<RouteLoadBoundary>\s*<Suspense/);
});

test("보드의 큰 이미지는 원본 해상도를 유지하는 더 작은 WebP를 읽는다", () => {
  for (const name of ["bg-1920x1080", "board-grid", "roulette-panel", "open-challenges-panel"]) {
    const image = new URL(`../public/assets/board/${name}.webp`, import.meta.url);
    const source = new URL(`../public/assets/board/${name}.png`, import.meta.url);
    const buffer = readFileSync(image);
    assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
    assert.ok(statSync(image).size < statSync(source).size);
  }
});

test("참가자 초기 코드에 관리자 페이지를 합치지 않고 3D는 모델 로더만 가져온다", () => {
  const routes = readFileSync(new URL("./routes/AppRoutes.jsx", import.meta.url), "utf8");
  for (const name of ["BoardPage", "LoginPage", "LeaderboardPage", "MyPage", "KothPage", "ChallengeDetailPage", "AdminDashboardPage", "AdminMileagePage", "AdminAccountsPage"]) {
    assert.match(routes, new RegExp(`const ${name} = lazy\\(`));
    assert.doesNotMatch(routes, new RegExp(`import ${name} from`));
  }
  assert.match(routes, /<AdminRoute>/);
  assert.match(routes, /void import\("\.\.\/features\/board\/components\/Dice3D.jsx"\)\.catch/);
  const dice = readFileSync(new URL("./features/board/components/Dice3D.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(dice, /@react-three\/drei/);
  assert.match(dice, /useLoader\(GLTFLoader, "\/models\/dice-display.glb"\)/);
  assert.match(dice, /frameloop="demand"/);
});

test("기차 확인창의 효과음 버튼은 켜짐과 꺼짐을 구분하고 이동 버튼을 유지한다", () => {
  for (const enabled of [true, false]) {
    const html = renderToStaticMarkup(createElement(components.AirportTravelOverlay, {
      destination: { cellIndex: 22, name: "문제" }, soundEnabled: enabled, onToggleSound() {}, onConfirm() {}, onCancel() {},
    }));
    assert.match(html, new RegExp(`aria-label="기차 효과음 ${enabled ? "끄기" : "켜기"}"`));
    assert.match(html, new RegExp(`aria-pressed="${enabled}"`));
    assert.match(html, /이동하기/);
  }
});

test("기차 효과음은 출발 준비와 실제 재생을 분리하고 화면을 떠날 때 정리한다", () => {
  const screen = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  const train = readFileSync(new URL("./features/board/components/BoardTrain.jsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./features/board/hooks/useTrainWhistle.js", import.meta.url), "utf8");
  assert.match(screen, /trainWhistle.prepare\(\);\s+return onMoveAirport/);
  assert.match(screen, /onStart: trainWhistle.play, onStop: trainWhistle.stop/);
  assert.ok(train.indexOf("renderer.render(sampleTrainJourney") < train.indexOf("callbacks.current.onStart?.(journey)"));
  assert.match(train, /callbacks.current.onStop\?\.\(\)/);
  assert.match(hook, /if \(document.hidden\) stop\(\)/);
  assert.match(hook, /player.current\?\.dispose\(\)/);
});

function render(name, props = {}) {
  const view = createElement(components[name], props);
  return renderToStaticMarkup(createElement(StaticRouter, { location: "/" },
    ["BoardArtwork", "BoardVisitedOverlay"].includes(name) ? createElement("svg", null, view) : view));
}
function css(path) {
  return postcss.parse(readFileSync(new URL(`./${path}`, import.meta.url), "utf8"));
}
function declarations(root, selector) {
  const result = [];
  root.walkRules(selector, (rule) => rule.walkDecls((decl) => result.push([decl.prop, decl.value])));
  return result;
}

test("출발칸 보상은 게임 화면을 막지 않고 실제 금액과 실제 충전량만 보여준다", () => {
  assert.equal(render("BoardStartReward"), "");
  const mileage = render("BoardStartReward", { reward: { token: "lap-1", kind: "lap", mileageGained: 100, rollGained: 0 } });
  assert.match(mileage, /한 바퀴 완주/);
  assert.match(mileage, /100 마일리지 적립/);
  assert.match(mileage, /\+100/);
  assert.doesNotMatch(mileage, /주사위.*충전|role="dialog"|<button/);
  assert.match(mileage, /aria-live="polite"/);
  const start = render("BoardStartReward", { reward: { token: "land-1", kind: "start", mileageGained: 100, rollGained: 1 } });
  assert.match(start, /출발칸 보상/);
  assert.match(start, /주사위 1개 충전/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.ok(declarations(root, ".startReward").some(([key, value]) => key === "pointer-events" && value === "none"));
  const reduced = root.nodes.find(node => node.type === "atrule" && node.params === "(prefers-reduced-motion: reduce)" && declarations(node, ".startRewardVisual").length > 0);
  assert.ok(declarations(reduced, ".startRewardVisual").some(([key, value]) => key === "animation" && value === "none"));
});

test("일반 칸 클릭 정보 패널은 제거하고 게임용 문제 선택은 유지한다", () => {
  const props = { myBoard: {}, ownedChanceCards: [], selectedCell: { cellIndex: 2, name: "정보 모달 제거 확인", type: "CHALLENGE", difficulty: "HARD" } };
  assert.equal(render("BoardEventPanel", props), "");
  const html = render("BoardEventPanel", { ...props, currentCell: { cellIndex: 2, type: "CHALLENGE", challengeCandidates: [{ challengeId: "challenge-2", title: "게임 문제", category: "WEB" }] } });
  assert.match(html, /게임 문제/);
  assert.doesNotMatch(html, /정보 모달 제거 확인|2번 칸/);
  for (const path of ["hooks/useBoardController.js", "pages/BoardPage.jsx", "components/BoardScreen.jsx", "components/BoardEventPanel.jsx"]) {
    assert.doesNotMatch(readFileSync(new URL(`./features/board/${path}`, import.meta.url), "utf8"), /selectedCell|SelectedCell/);
  }
});

test("좌측 보드 UI는 타이머를 분리하고 열린 문제 패널을 열어도 카드 위치를 보존한다", () => {
  const html = render("DiceStatusPanel", { rollsLeft: 0, canRoll: false, blockedMessage: "남은 주사위가 없습니다.", resetInSeconds: 260, challengeRemainingSeconds: 303 });
  assert.match(html, /right-\[10%\].*top-\[25%\]/);
  assert.match(html, /top-\[70%\]/);
  assert.doesNotMatch(html, /truncate/);
  const screen = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /!isOpenListVisible && <ChanceCardSummary/);
  const cards = {
    cards: [{ cardId: "card_move_offset", name: "추가 이동", usableNow: true }],
    cells: [], consumedCellIndexes: [], isMutating: false,
  };
  const obscured = render("ChanceCardSummary", { ...cards, isObscured: true });
  assert.match(obscured, /aria-hidden="true" inert=""/);
  assert.match(obscured, /추가 이동 칸 수/);
  assert.doesNotMatch(render("ChanceCardSummary", cards), /aria-hidden="true"|inert=""/);
  const panel = readFileSync(new URL("./features/board/components/OpenChallengesSidePanel.jsx", import.meta.url), "utf8");
  // 데스크톱에서는 주사위 상태·찬스카드·열린 문제 버튼이 leftPanelCard 한 패널 안에 모인다
  assert.match(panel, /placement === "panel"/);
  assert.match(screen, /className=\{styles\.leftPanelCard\}[\s\S]*<BoardDiceStatusPanel[\s\S]*<ChanceCardSummary[\s\S]*placement="panel"/);
  // 통합 패널과 열린 문제 패널은 왼쪽 위 여백선에서 같은 폭으로 쌓이고, 열린 문제 패널은 아래 여백선까지 채운다
  const css = readFileSync(new URL("./features/board/components/BoardScreen.module.css", import.meta.url), "utf8");
  assert.match(css, /\.stage \.leftPanel \{[^}]*left: calc\(2\.5% - var\(--hud-extra-x\)\); top: var\(--hud-top\); width: var\(--left-width\)/);
  assert.match(css, /\.stage \.leftPanel \{[^}]*height: calc\(100% \+ 2 \* var\(--hud-extra-y\) - 2 \* var\(--hud-margin-y\)\)/);
  assert.match(css, /\.stage \.leftPanel \.openPanel \{[^}]*width: 100%;[^}]*flex: 1 1 auto/);
  // KoTH 배너 위 끝은 통합 패널(찬스카드 목록을 뺀 높이) 아래 간격, 곧 열린 문제 패널 위선에 놓인다
  assert.match(screen, /frame\.style\.setProperty\("--left-card-height"/);
  assert.match(css, /--koth-top: calc\(var\(--hud-top\) \+ var\(--left-card-height, [^)]+\) \+ var\(--hud-gap\)\)/);
  assert.match(css, /\.stage \.kothBanner \{[^}]*top: calc\(var\(--koth-top\)/);
});

test("문제 후보가 0개면 재조회 안내를 띄우고 다음 칸으로 넘기지 않는다", () => {
  const props = { myBoard: {}, currentCell: { type: "CHALLENGE", challengeCandidates: [] }, blockedReason: "CHALLENGE_NOT_SELECTED", ownedChanceCards: [] };
  const html = render("BoardEventPanel", props);
  assert.match(html, /선택할 수 있는 문제가 없어요/);
  assert.match(html, /운영진에 문의하고 잠시 후 다시 조회해주세요/);
  assert.match(html, /문제 다시 불러오기/);
  assert.doesNotMatch(html, /다음 칸|이동 확정/);
  assert.match(render("BoardEventPanel", { ...props, isLoading: true }), /disabled=""/);
  assert.doesNotMatch(render("BoardEventPanel", { ...props, blockedReason: null }), /문제 다시 불러오기/);
});

test("3D를 쓸 수 없어도 대체 주사위는 전달받은 두 눈만 표시한다", () => {
  const idle = render("DiceFallback");
  assert.match(idle, /\/assets\/board\/dice.webp/);
  const rolled = render("DiceFallback", { result: { diceA: 2, diceB: 6 } });
  assert.equal((rolled.match(/<circle /g) || []).length, 8);
  assert.equal((rolled.match(/<rect /g) || []).length, 2);
  assert.doesNotMatch(rolled, /<img/);
  assert.match(render("DiceFallback", { result: { diceA: 0, diceB: 8 } }), /\/assets\/board\/dice.webp/);
});

test("넓어진 주사위 3D 캔버스는 주변 보드 칸의 클릭을 가로채지 않는다", () => {
  const html = render("Dice3D");
  assert.match(html, /data-dice-visual="true"/);
  assert.match(html, /<canvas/);
  // R3F Canvas의 기본 pointer-events:auto가 실제 렌더링 결과에서 사라져야 한다
  assert.match(html, /pointer-events:none/);
  assert.doesNotMatch(html, /pointer-events:auto/);
});

test("기차는 보드 안의 장식 캔버스로 분리하고 화면 좌표나 별도 UI를 덮지 않는다", () => {
  const journey = { samples: [{ x: 886, y: 1210, distance: 0, cellIndex: 1 }, { x: 655, y: 1187, distance: 232, cellIndex: 2 }], cells: [1,2], distance: 232, duration: 1315 };
  const html = render("BoardTrain", { journey });
  assert.match(html, /data-board-train="moving"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /<canvas/);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /data-board-piece="2"/);
  const root = css("features/board/components/BoardTrain.module.css");
  assert.ok(declarations(root, ".actor").some(([key, value]) => key === "pointer-events" && value === "none"));
  assert.ok(declarations(root, ".arrival").some(([key, value]) => key === "pointer-events" && value === "none"));
  assert.ok(root.nodes.some(node => node.type === "atrule" && node.params === "(prefers-reduced-motion: reduce)"));
});

test("카드 조각은 작은 경계만 그리고 모션 축소와 고대비에서는 원래 내용을 남긴다", () => {
  const root = css("features/board/components/ChallengeSelection.module.css");
  assert.ok(declarations(root, ".fragment").some(([key, value]) => key === "background-image" && value === "var(--card-artwork)"));
  assert.ok(!declarations(root, ".fragment").some(([key]) => key === "inset"));
  const crumbleFrames = root.nodes.find(node => node.type === "atrule" && node.params === "card-crumble");
  crumbleFrames.walkDecls(declaration => assert.ok(["transform", "opacity"].includes(declaration.prop)));
  assert.ok(declarations(root, ".crumble").some(([key, value]) => key === "pointer-events" && value === "none"));
  root.walkRules(rule => {
    if (rule.selector?.includes(".cardFace")) {
      rule.walkDecls("filter", () => assert.fail("움직이는 카드 전체에 필터를 적용하면 조각까지 매 프레임 다시 그린다"));
    }
  });
  for (const query of ["(prefers-reduced-motion: reduce)", "(forced-colors: active)"]) {
    const media = root.nodes.find(node => node.type === "atrule" && node.params === query);
    assert.ok(declarations(media, '.crumble, .card[data-crumbling="true"] .crumble').some(([key, value]) => key === "display" && value === "none"));
    assert.ok(declarations(media, '.card[data-crumbling="true"] .cardSurface').some(([key, value]) => key === "opacity" && Number(value) > 0));
  }
});

test("반응형 로그인도 입력 라벨, 자동 완성, 요청 중 잠금과 오류 메시지를 유지한다", () => {
  const html = render("Login", { submitting: true, feedback: { type: "error", message: "입력 정보를 확인해 주세요" } });
  assert.match(html, /for="login-username"/);
  assert.match(html, /for="login-password"/);
  assert.match(html, /autoComplete="username"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
  assert.match(html, /role="alert"[^>]*>입력 정보를 확인해 주세요/);
});

test("리더보드 표는 모든 열과 긴 팀명, 원래 1~3위 이미지를 유지한다", () => {
  const name = "아주긴팀이름".repeat(12);
  const html = render("Leaderboard", {
    teams: [], leaderboardStatus: "empty", rankingStatus: "success",
    rankings: [1, 2, 3].map((rank) => ({ key: `${rank}`, rank, teamName: name, teamScore: 100, solveCount: 2, categoryScores: [], signatureScore: 30 })),
  });
  assert.match(html, /tabindex="0" role="region" aria-label="팀 순위표"/);
  assert.match(html, new RegExp(`title="${name}"`));
  for (const rank of [1, 2, 3]) assert.match(html, new RegExp(`aria-label="${rank}위"`));
  assert.equal((html.match(/class="[^"]*rankArtwork/g) || []).length, 3);
  assert.match(html, />CLUB<\/th>/);
  for (const label of ["Point", "Solves", "MISC", "WEB", "FOR", "REV", "PWN", "CRY", "OSINT", "WEB3", "KoTH", "CLUB"]) {
    assert.ok(html.includes(`aria-hidden="true">${label}</span>`));
  }
  assert.equal((html.match(/scope="col"/g) || []).length, 14);
});

test("순위표는 폰에서 팀마다 카드로 쌓이고 태블릿에서는 모든 열을 유지한 채 표 안에서만 가로 이동한다", () => {
  const root = css("features/leaderboard/components/LeaderboardScreen.module.css");
  assert.ok(declarations(root, ".rankingGrid").some(([key, value]) => key === "width" && value === "100%"));
  assert.ok(declarations(root, ".tableContainer").some(([key, value]) => key === "overflow-x" && value === "auto"));
  // 폰 구간에서만 줄이 격자 카드가 되고, 밀어서 보라는 안내는 사라지며, 분야 이름이 값 위에 붙는다
  const phone = root.nodes.find((node) => node.type === "atrule" && node.params === "(max-width: 767px)"
    && declarations(node, ".rankingGrid tbody tr").length > 0);
  assert.ok(declarations(phone, ".rankingGrid tbody tr").some(([key]) => key === "grid-template-columns"));
  assert.ok(declarations(phone, ".mobileTableHint").some(([key, value]) => key === "display" && value === "none"));
  assert.ok(declarations(phone, ".mobileCellLabel").some(([key, value]) => key === "display" && value === "block"));
  const tablet = root.nodes.filter((node) => node.type === "atrule" && node.params === "(max-width: 1100px)");
  assert.ok(tablet.some((node) => declarations(node, ".rankingGrid").some(([key, value]) => key === "min-width" && value === "960px")));
  assert.ok(!tablet.some((node) => declarations(node, ".rankingGrid tbody tr").some(([key]) => key === "grid-template-columns")));
  assert.ok(!declarations(root, ".rankingGrid thead").some(([key]) => key === "clip-path"));
  const html = render("Leaderboard", {
    teams: [], leaderboardStatus: "empty", rankingStatus: "success",
    rankings: [{ key: "all-fields", rank: 1, teamName: "전체 점수 확인", teamScore: 1234567.89,
      solveCount: 123, categoryScores: [11, 22, 33, 44, 55, 66, 77, 88], kothScore: 999.99, signatureScore: 1234.56 }],
  });
  for (const value of ["11", "22", "33", "44", "55", "66", "77", "88", "999.99", "1,234.56", "1,234,567.89"]) {
    assert.ok(html.includes(`>${value}</span>`));
  }
  assert.equal((html.match(/scope="col"/g) || []).length, 14);
  assert.match(html, /id="leaderboard-viewport"/);
  assert.doesNotMatch(html, /스코어보드 읽기 크기로 확대/);
  assert.match(html, /좌우로 밀어 모든 분야의 점수를 확인하세요/);
  assert.match(html, /<h1[^>]*>[\s\S]*SCOREBOARD[\s\S]*?<\/h1>/);
  assert.doesNotMatch(html, />LEADERBOARD<|background-plaza|panel-board/);
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
    status: "SCHEDULED", imageSrc: "/assets/koth/challenge-maple-pass.webp",
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
    const html = render("QuickAction", { glyph: variant, label });
    assert.match(html, new RegExp(`data-action="${variant}"[^>]*>[\\s\\S]*?<span[^>]*>${label}<\\/span><\\/button>`));
    assert.doesNotMatch(html, /btn-(?:create|extend)\.png/);
  }
});

test("모바일 로그인과 순위 페이지 이동 버튼은 충분한 조작 영역을 둔다", () => {
  const loginCss = css("features/auth/components/LoginScreen.module.css");
  assert.doesNotMatch(loginCss.toString(), /--scale|1920px|scale\(/);
  assert.ok(declarations(loginCss, ".panel").some(([property, value]) => property === "width" && value === "min(100%, 560px)"));
  assert.ok(declarations(loginCss, ".field").some(([property, value]) => property === "height" && value === "52px"));
  assert.ok(declarations(loginCss, ".loginButton").some(([property, value]) => property === "min-height" && value === "52px"));
  for (const path of ["leaderboard/components/LeaderboardScreen"]) {
    const root = css(`features/${path}.module.css`);
    let found = false;
    root.walkAtRules("media", (media) => {
      if (!media.params.includes("max-width")) return;
      media.walkDecls("transform", (decl) => { if (decl.value === "none") found = true; });
    });
    assert.ok(found, path);
  }
  const root = css("features/leaderboard/components/LeaderboardScreen.module.css");
  assert.ok(declarations(root, ".pagination button, .refreshControls button").some(([property, value]) => property === "min-height" && value === "44px"));
  assert.ok(declarations(root, ".pagination button, .refreshControls button").some(([property, value]) => property === "min-width" && parseInt(value, 10) >= 44));
});

test("모바일 보드 메뉴는 기존 금색 아이콘과 여섯 이동 기능을 유지한다", () => {
  const html = render("BoardNav");
  const mobileNav = html.match(/<nav[^>]*aria-label="대회 메뉴"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(mobileNav);
  assert.match(mobileNav, /<details[^>]*>[\s\S]*?<summary[^>]*aria-label="대회 전체 메뉴"/);
  for (const image of ["nav-rules.webp", "nav-mypage.webp", "nav-scoreboard.webp", "nav-logout.webp"]) {
    assert.ok(mobileNav.includes(`/assets/board/${image}`));
  }
  for (const path of ["/rules", "/mypage", "/leaderboard", "/koth", "/signatures"]) {
    assert.ok(mobileNav.includes(`href="${path}"`));
  }
  assert.match(mobileNav, /<button[^>]*>[\s\S]*?nav-logout\.webp[\s\S]*?<span>로그아웃<\/span><\/button>/);
  // 데스크톱 로그아웃은 우상단 원형 아이콘 줄의 맨 오른쪽 동전으로만 둔다
  assert.match(html, /aria-label="로그아웃"/);
  assert.doesNotMatch(html, /top-\[17\.5%\]/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.ok(declarations(root, ".mobileNav a, .mobileNav button").some(([property, value]) => property === "min-height" && value === "44px"));
});

test("방문한 칸은 중복 없이 각자의 곡선 윤곽으로 표시하고 잘못된 번호를 무시한다", () => {
  const html = render("BoardVisitedOverlay", { visitedCellIndexes: [0, 2, 2, 21, 37] });
  assert.equal((html.match(/data-visited-cell=/g) || []).length, 2);
  assert.match(html, /data-visited-cell="2"/);
  assert.match(html, /data-visited-cell="21"/);
  assert.match(html, /<path[^>]*d="M[^"]* Q/);
  assert.match(html, /fill="#170e0a" fill-opacity="0.62"/);
  assert.equal((html.match(/data-visited-surface=/g) || []).length, 2);
  assert.match(html, /<radialGradient/);
  assert.match(html, /<linearGradient/);
  assert.doesNotMatch(html, /visitedInset|stroke=/);
  assert.doesNotMatch(html, /<polygon/);
  assert.equal(render("BoardVisitedOverlay", { visitedCellIndexes: [] }), "<svg></svg>");
});

test("황금열쇠 문양은 서버 칸 종류를 확인하고 방문 음영에도 동일하게 쓴다", () => {
  const cells = [{ cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }];
  const artwork = render("BoardArtwork", { cells });
  const visited = render("BoardSurface", { cells, visitedCellIndexes: [7, 16] });
  for (const html of [artwork, visited]) {
    // 16번 룰렛 면은 board-grid 원본에 합성되어 있어 별도 오버레이가 없다
    assert.doesNotMatch(html, /data-cell-artwork="16-/);
    assert.match(html, /data-cell-artwork="7-chance"/);
    assert.ok(html.includes(getBoardCellMaskPath(7)));
  }
  assert.doesNotMatch(render("BoardArtwork", { cells: [{ cellIndex: 7, type: "ROULETTE" }] }), /data-cell-artwork/);
});

test("방문 음영과 보드 원판은 한 SVG 좌표계를 공유하고 보드 이미지를 복제하지 않는다", () => {
  const html = render("BoardSurface", { cells: [], visitedCellIndexes: [2, 7, 16, 21, 25, 30] });
  assert.equal((html.match(/<svg/g) || []).length, 1);
  assert.equal((html.match(/board-grid.webp/g) || []).length, 1);
  assert.equal((html.match(/data-visited-cell=/g) || []).length, 6);
  assert.match(html, /viewBox="0 0 1772 1330"/);
  assert.match(html, /data-board-visited="true"/);
  assert.doesNotMatch(html, /filter=|<filter|visitedArtwork/);
});

test("방문한 카드와 룰렛은 문양을 남기고 일반 문제의 방문 음영은 그대로 둔다", () => {
  const cells = [2, 7, 16, 25, 30].map((cellIndex) => ({ cellIndex, type: cellIndex === 2 ? "CHALLENGE" : [7, 30].includes(cellIndex) ? "CHANCE" : "ROULETTE" }));
  const html = render("BoardSurface", { cells, visitedCellIndexes: [2, 7, 16, 25, 30] });
  assert.match(html, /data-visited-surface="2"><path[^>]*fill-opacity="0.62"/);
  for (const index of [7, 16, 25, 30]) {
    assert.match(html, new RegExp(`data-visited-surface="${index}" data-visited-special="true"><path[^>]*fill-opacity="0.44"`));
  }
  assert.equal((html.match(/data-visited-special="true"/g) || []).length, 4);
  assert.doesNotMatch(html, /data-cell-artwork="16-/);
  assert.match(html, /data-cell-artwork="7-chance"/);
});

test("기차 목적지 선택선은 36칸 모두 원본 면에 붙고 금테 밖으로 퍼지지 않는다", () => {
  for (let cellIndex = 1; cellIndex <= 36; cellIndex++) {
    const html = render("BoardCellTarget", { cellIndex });
    assert.match(html, new RegExp(`data-cell-target="${cellIndex}"`));
    assert.ok(html.includes(`d="${getBoardCellMaskPath(cellIndex)}"`));
    assert.match(html, /clipPathUnits="userSpaceOnUse"/);
    assert.match(html, /clip-path="url\(#[^\"]+\)"/);
    assert.match(html, /vector-effect="non-scaling-stroke"/);
    assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /<ellipse|<circle|<filter|<image|role="button"/);
  }
  assert.equal(render("BoardCellTarget", { cellIndex: 0 }), "");
  const track = readFileSync(new URL("./features/board/components/BoardTrack.jsx", import.meta.url), "utf8");
  assert.match(track, /if \(!isSelecting \|\| isSelectable\) onSelectCell\(cell.cellIndex\)/);
  assert.match(track, /tabIndex=\{isSelecting && !isSelectable \? -1 : undefined\}/);
  assert.doesNotMatch(track, /selectionClass|transition-shadow|hover:shadow|focus-visible:outline/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.ok(declarations(root, ".cellTargetLayer").some(([property, value]) => property === "pointer-events" && value === "none"));
  assert.ok(declarations(root, ".cellTargetOutline").some(([property, value]) => property === "stroke-width" && value === "3px"));
});

test("룰렛의 숫자는 SVG 원판 안에 있고 회전하지 않는 포인터는 밖에 있다", () => {
  const html = render("MileageRoulette", { event: { token: "25:ROULETTE", status: "ready" }, onSpin() {}, onClose() {} });
  assert.equal((html.match(/data-roulette-segment=/g) || []).length, 8);
  assert.equal((html.match(/data-roulette-value=/g) || []).length, 8);
  assert.match(html, /viewBox="0 0 320 320"/);
  assert.match(html, /text-anchor="middle"/);
  assert.match(html, /남은 기회 1 \/ 1/);
  assert.match(html, /aria-label="룰렛 닫기"/);
  assert.match(html, /aria-label="룰렛 돌리기\(SPIN\)"/);
  assert.match(html, /<svg[^>]+viewBox="0 0 36 48"/);
  assert.doesNotMatch(html, /conic-gradient|roulette-idle-spin/);
  const busy = render("MileageRoulette", { event: { token: "25:ROULETTE", status: "ready" }, isMutating: true });
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /aria-label="룰렛 돌리는 중"/);
  assert.match(busy, /돌아가는 중입니다/);
  const received = render("MileageRoulette", { event: { token: "25:ROULETTE", status: "success", result: { mileageGained: 50, totalMileage: 1250 } } });
  assert.match(received, /aria-busy="false"/);
  assert.match(received, /\+50 M/);
  assert.match(received, /보유 마일리지 1250 M/);
  assert.match(received, />확인<\/button>/);
  assert.doesNotMatch(received, /aria-label="룰렛 돌리는 중"|aria-label="룰렛 돌리기\(SPIN\)"/);
  assert.doesNotMatch(received, /룰렛을 돌려 마일리지를 받아보세요/);
});

test("룰렛 닫기는 시작 전과 응답 대기 중에도 열려 있고 완료 결과는 즉시 다시 볼 수 있다", () => {
  for (const props of [
    { event: { token: "roulette-ready", status: "ready" } },
    { event: { token: "roulette-pending", status: "ready" }, isMutating: true },
    { event: { token: "roulette-error", status: "ready" }, errorMessage: "잠시 후 다시 시도해주세요" },
    { event: { token: "roulette-done", status: "success", result: { mileageGained: 200, totalMileage: 1400 } } },
  ]) {
    const html = render("MileageRoulette", props);
    const close = html.match(/<button\b[^>]*aria-label="룰렛 닫기"[^>]*>/)?.[0];
    assert.ok(close);
    assert.doesNotMatch(close, /disabled/);
    assert.match(close, /title="닫기"/);
  }
  const source = readFileSync(new URL("./features/board/components/MileageRouletteModal.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(keyEvent.key === "Escape"\) \{ keyEvent.preventDefault\(\); onClose\(\); \}/);
});

test("닫은 룰렛은 대기와 결과 도착 후에도 숨겨두고 중복 요청 없이 다시 보기만 제공한다", () => {
  for (const event of [
    { type: "ROULETTE", token: "same-visit", status: "ready" },
    { type: "ROULETTE", token: "same-visit", status: "success", result: { mileageGained: 100, totalMileage: 1300 } },
  ]) {
    const html = render("BoardEventPanel", {
      myBoard: { position: 25 }, cellEvent: event, isRouletteOpen: false, isMutating: true,
      ownedChanceCards: [], onReopenRoulette() {},
    });
    assert.match(html, />룰렛 다시 보기<\/button>/);
    assert.doesNotMatch(html, /role="dialog"|aria-label="룰렛 돌리기\(SPIN\)"|disabled/);
  }
  const source = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.match(source, /dismissedRouletteToken !== cellEvent.token/);
  assert.match(source, /if \(cellEvent\?\.type === "ROULETTE"\) \{[\s\S]*?setDismissedRouletteToken\(cellEvent.token\);\s+return;\s+\}\s+onCloseCellEvent\?\.\(\);/);
});

test("보드 말은 36칸의 기존 좌표를 따르며 고해상도 투명 이미지를 사용한다", () => {
  for (let position = 1; position <= 36; position++) {
    const { x, y } = getBoardCellPosition(position);
    const html = render("BoardPiece", { position });
    assert.match(html, /src="\/assets\/board\/selection-squirrel-refined\.webp"/);
    assert.ok(html.includes(`내 팀 말 (현재 ${position}번 칸)`));
    assert.ok(html.includes(`left:${x}%;top:${y}%`));
    assert.match(html, /draggable="false"/);
    assert.doesNotMatch(html, /piece-squirrel\.png/);
  }
  assert.equal(render("BoardPiece", { position: null }), "");
  const track = readFileSync(new URL("./features/board/components/BoardTrack.jsx", import.meta.url), "utf8");
  assert.match(track, /<BoardPiece position=\{renderedPiecePosition\}/);
});

test("보드 말의 투명 여백을 보정해 칸 중심과 실제 윤곽 중심이 일치한다", () => {
  const root = css("features/board/components/BoardScreen.module.css");
  const piece = Object.fromEntries(declarations(root, ".boardPiece"));
  assert.equal(piece.width, "6%");
  assert.equal(piece.transform, "translate(-47.02725%, -48.113934%) scaleX(-1)");
  assert.equal(piece["pointer-events"], "none");
  assert.equal(piece["object-fit"], "contain");
  const visibleCenter = { x: (208 + 1075) / 2 / 1211, y: (48 + 1202) / 2 / 1299 };
  for (const trackWidth of [320, 390, 620, 951, 1772]) {
    const width = trackWidth * .06;
    const height = width * 1299 / 1211;
    assert.ok(Math.abs((1 - visibleCenter.x - .4702725) * width) < .001);
    assert.ok(Math.abs((visibleCenter.y - .48113934) * height) < .001);
    const oldVisibleWidth = trackWidth * .12 * 58 / 165;
    const newVisibleWidth = width * 867 / 1211;
    assert.ok(Math.abs(newVisibleWidth / oldVisibleWidth - 1) < .03);
  }
});

test("문제 선택은 실제 후보 수만큼 표시하며 긴 제목, 0점, 동아리명을 유지한다", () => {
  const candidates = [1, 2, 3].map((id) => ({ challengeId: id, title: "긴문제제목".repeat(30), category: "WEB", clubName: "seKUrity", score: 0 }));
  for (const count of [1, 2, 3]) {
    const html = render("ChallengeSelection", { candidates: candidates.slice(0, count), isMutating: false });
    assert.match(html, /role="dialog" aria-modal="true"/);
    assert.equal((html.match(/data-tone=/g) || []).length, count);
    assert.equal((html.match(/data-opening="false"/g) || []).length, count);
    assert.ok(html.includes(candidates[0].title));
    assert.match(html, /seKUrity/);
    assert.match(html, /0점 /);
    assert.equal((html.match(/src="\/assets\/board\/challenge-card-(?:brown|slate|olive)-refined\.webp/g) || []).length, count);
    assert.match(html, /data-choice-layer="scene"/);
    assert.doesNotMatch(html, /data-choice-layer="background"|bg-1920x1080/);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
});

test("문제 선택은 피그마 기반 보정 에셋과 로컬 Alegreya Medium을 사용하고 원본도 보존한다", () => {
  const root = css("features/board/components/ChallengeSelection.module.css");
  const fontFaces = [];
  root.walkAtRules("font-face", (face) => {
    const values = {};
    face.walkDecls((decl) => { values[decl.prop] = decl.value; });
    fontFaces.push(values);
  });
  const alegreya = fontFaces.find((face) => face["font-family"] === '"Alegreya"');
  assert.equal(alegreya["font-weight"], "500");
  assert.match(alegreya.src, /\/assets\/fonts\/alegreya\/Alegreya-Medium\.woff2/);
  const html = render("ChallengeSelection", { candidates: [{ challengeId: 1, title: "AFTERIMAGE", category: "WEB" }] });
  assert.doesNotMatch(html, /selection-squirrel-refined\.webp/);
  assert.doesNotMatch(html, /piece-squirrel\.png/);
  assert.doesNotMatch(html, /<svg|floorMark|cardFrame/);
  for (const tone of ["brown", "slate", "olive"]) {
    const asset = readFileSync(new URL(`../public/assets/board/challenge-card-${tone}.png`, import.meta.url));
    assert.equal(asset.subarray(1, 4).toString(), "PNG");
  }
});

test("보정 카드와 다람쥐는 투명도를 가진 고해상도 WebP로 제공한다", () => {
  for (const name of ["challenge-card-brown", "challenge-card-slate", "challenge-card-olive", "selection-squirrel"]) {
    const asset = readFileSync(new URL(`../public/assets/board/${name}-refined.webp`, import.meta.url));
    assert.equal(asset.subarray(0, 4).toString(), "RIFF");
    assert.equal(asset.subarray(8, 12).toString(), "WEBP");
    assert.equal(asset.subarray(12, 16).toString(), "VP8X");
    assert.ok(asset[20] & 0x10, `${name}: alpha channel must be retained`);
    assert.ok(asset.readUIntLE(24, 3) + 1 >= 1000, `${name}: keep high-resolution artwork`);
    assert.ok(asset.length < 800_000, `${name}: web asset must stay below 800 KB`);
  }
});

test("문제 선택 카드는 장식용 다람쥐 예약 공간 없이 같은 크기와 간격으로 중앙 정렬한다", () => {
  const root = css("features/board/components/ChallengeSelection.module.css");
  const cards = Object.fromEntries(declarations(root, ".cards"));
  assert.equal(cards.width, "100%");
  assert.equal(cards.display, "flex");
  assert.equal(cards["justify-content"], "center");
  assert.equal(cards.gap, "3cqw");
  const card = Object.fromEntries(declarations(root, ".card"));
  assert.equal(card.position, "relative");
  assert.equal(card["aspect-ratio"], "188 / 253");
  assert.equal(declarations(root, ".squirrel").length, 0);
  const mobile = root.nodes.find(node => node.type === "atrule" && node.params === "(max-width: 600px)");
  assert.match(mobile.toString(), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("카드 색상에 따라 제목 너비를 더 줄이지 않아 보통 길이의 단어가 잘리지 않는다", () => {
  const root = css("features/board/components/ChallengeSelection.module.css");
  for (const selector of ['.card[data-tone="1"] .title', '.card[data-tone="2"] .title']) {
    const widths = declarations(root, selector).filter(([property]) => property === "max-width");
    assert.ok(widths.length > 0);
    assert.ok(widths.every(([, value]) => value === "100%"));
  }
});

test("문제를 여는 중에는 세 후보와 닫기를 모두 잠그고 서버 오류도 선택창 안에 보여준다", () => {
  const html = render("ChallengeSelection", { candidates: [1, 2, 3].map((challengeId) => ({ challengeId, title: `문제${challengeId}` })), isMutating: true, errorMessage: "이미 열린 문제입니다" });
  assert.equal((html.match(/disabled=""/g) || []).length, 4);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="alert">이미 열린 문제입니다/);
  assert.doesNotMatch(html, /undefined|NaN|>null</);
});

test("카드와 광택은 같은 투명 윤곽을 쓰고 눌림과 뽑기 레이어를 분리한다", () => {
  const html = render("ChallengeSelection", { candidates: [1, 2, 3].map((challengeId) => ({ challengeId, title: `문제${challengeId}` })) });
  assert.equal((html.match(/data-card-layer="face"/g) || []).length, 3);
  assert.equal((html.match(/data-pressed="false"/g) || []).length, 3);
  for (const delay of [0, 80, 160]) assert.ok(html.includes(`--deal-delay:${delay}ms`));
  const root = css("features/board/components/ChallengeSelection.module.css");
  assert.ok(declarations(root, ".cardSurface").some(([property, value]) => property === "mask-image" && value === "var(--card-artwork)"));
  assert.ok(declarations(root, ".cardSurface").some(([property, value]) => property === "mask-size" && value === "100% 100%"));
  assert.ok(!declarations(root, ".cardSurface").some(([property]) => property === "clip-path"));
  assert.equal((html.match(/--card-artwork:url/g) || []).length, 3);
  assert.ok(declarations(root, ".card:focus").some(([property, value]) => property === "outline" && value === "none"));
  assert.ok(declarations(root, ".card:focus-visible .title").some(([property, value]) => property === "text-decoration" && value === "underline"));
});

test("모션 축소 설정에서는 카드 등장과 이동을 끄고 고대비 모드에는 키보드 외곽선을 남긴다", () => {
  const root = css("features/board/components/ChallengeSelection.module.css");
  const reduced = root.nodes.find((node) => node.type === "atrule" && node.params === "(prefers-reduced-motion: reduce)");
  assert.ok(reduced);
  assert.deepEqual(declarations(reduced, ".cardDeal"), [["animation", "none"]]);
  assert.deepEqual(declarations(reduced, ".cardFace"), [["transition", "none"]]);
  assert.deepEqual(declarations(reduced, '.pickEffects, .card[data-opening="true"] .cardSurface::after'), [["display", "none"]]);
  assert.match(reduced.toString(), /transform: none/);
  const contrast = root.nodes.find((node) => node.type === "atrule" && node.params === "(forced-colors: active)");
  assert.ok(declarations(contrast, ".card:focus-visible").some(([property, value]) => property === "outline" && value === "3px solid Highlight"));
  assert.ok(declarations(contrast, ".cardSurface").some(([property, value]) => property === "mask-image" && value === "none"));
  assert.ok(declarations(root, ".pickEffects").some(([property, value]) => property === "pointer-events" && value === "none"));
  for (const selector of [".pickAura", ".pickRays", ".pickSpark"]) {
    assert.ok(!declarations(root, selector).some(([property, value]) => property === "animation" && value.includes("infinite")));
  }
});

test("모바일에서 반복 안내를 줄여도 주사위 상태와 제한 시간은 접근성 정보에 남는다", () => {
  const ready = render("DiceStatusPanel", { rollsLeft: 3, canRoll: true });
  assert.match(ready, /data-roll-ready="true"/);
  assert.match(ready, /aria-label="주사위 보유 3\/3\. 주사위를 굴릴 수 있습니다/);
  const waiting = render("DiceStatusPanel", {
    rollsLeft: 2, canRoll: false, blockedMessage: "문제 풀이 제한 시간이 끝나면 다시 이동할 수 있습니다", challengeRemainingSeconds: 900,
  });
  assert.match(waiting, /data-roll-ready="false"/);
  assert.match(waiting, /문제 제한 15:00/);
  assert.match(waiting, /title="문제 풀이 제한 시간이 끝나면 다시 이동할 수 있습니다"/);
  assert.match(waiting, /<span[^>]*>문제 풀이 제한 시간이 끝나면 다시 이동할 수 있습니다<\/span>/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.deepEqual(declarations(root, '.diceStatus[data-roll-ready="true"] > p'), [["display", "none"]]);
});

test("라인 데이터가 없으면 표시하지 않고 풀이 진행과 완료를 별도로 렌더링한다", () => {
  assert.equal(render("BoardLineOverlay"), "");
  const lines = prepareBoardLines([
    { lineId: "a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3], isCompleted: false },
    { lineId: "b", label: "2번 라인", cellIndexes: [8,9,10,11,12], solvedCellIndexes: [8,9,10,11,12], isCompleted: true, bonusScore: 200 },
  ]);
  const html = render("BoardLineOverlay", { lines });
  assert.match(html, /1번 라인, 2\/5 해결/);
  assert.match(html, /2번 라인, 독점 완료, 상세 보기/);
  assert.equal((html.match(/data-solved="true"/g) || []).length, 7);
  assert.equal((html.match(/data-line-cell=/g) || []).length, 10);
  assert.equal((html.match(/data-line-accent=/g) || []).length, 1);
  assert.equal((html.match(/<clipPath /g) || []).length, 2); // 보석 면과 구역 경계, 칸별 clip 아님
  assert.equal((html.match(/data-rail-boundary=/g) || []).length, 1);
  assert.equal((html.match(/data-line-outline=/g) || []).length, 0);
  assert.doesNotMatch(html, /data-line-outline="8"/);
  assert.doesNotMatch(html, /data-line-outline="4"/);
  assert.equal((html.match(/data-outline-state="solved"/g) || []).length, 0);
  assert.equal((html.match(/vector-effect="non-scaling-stroke"/g) || []).length, 0);
  assert.match(html, /data-line-segment="8,9,10,11,12"/);
  assert.doesNotMatch(html, /<image|line-complete-crest-v1/);
  assert.doesNotMatch(html, /data-line-badge=|data-line-region-caption=|data-line-finish=|data-outline-state="claimed"|<text|lineClaimFlash|lineSweep|lineRail|lineClaimRibbon|lineCellBand|lineSolveMark|lineCellSelected/);
  const selected = render("BoardLineOverlay", { lines, selectedLineId: "a" });
  assert.doesNotMatch(selected, /lineCellSelected|radialGradient|<text/);
  for (const index of lines.flatMap((line) => line.cellIndexes)) {
    assert.ok(html.includes(`data-line-cell="${index}"`));
  }
});

test("방문하거나 일부 문제만 푼 라인에는 배점이나 점수 표식을 만들지 않는다", () => {
  const lines = prepareBoardLines([
    { lineId: "a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3], consumedCellIndexes: [2,3,4,5,6], rewardScore: 150 },
    { lineId: "b", label: "2번 라인", cellIndexes: [8,9,10,11,12], solvedCellIndexes: [], rewardScore: 200 },
  ]);
  const html = render("BoardLineOverlay", { lines });
  assert.doesNotMatch(html, /data-line-region=|data-line-region-score=|data-line-anchor-cell=|data-line-tile-plate=|150 pts|200 pts|미정/);
  assert.equal((html.match(/data-line-outline=/g) || []).length, 0);
  assert.doesNotMatch(html, /data-line-outline="8"|data-line-badge=|line-complete-crest-v1/);
  assert.doesNotMatch(html, /<rect|<foreignObject|>\+ 150 pts/);
  assert.match(html, /2번 라인, 0\/5 해결/);
});

test("독점 완료 외곽선은 점수 유무와 별개이며 보드에 명패나 점수를 올리지 않는다", () => {
  const create = (isCompleted, bonusScore) => prepareBoardLines([
    { lineId: "a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3,4,5,6], rewardScore: 200, isCompleted, bonusScore },
  ]);
  const completed = render("BoardLineOverlay", { lines: create(true, 150) });
  assert.match(completed, /aria-label="1번 라인, 독점 완료, 상세 보기"/);
  assert.match(completed, /data-line-accent="a" role="button" tabindex="0"/);
  assert.match(completed, /data-line-segment="2,3,4,5,6"/);
  assert.match(completed, /lineAccentHitArea/);
  assert.doesNotMatch(completed, /<text|<image|<ellipse|data-line-badge=|data-line-region=|150 pts|200 pts|data-line-outline=/);
  const pending = render("BoardLineOverlay", { lines: create(false, 150) });
  assert.match(pending, /완료 확인 중/);
  assert.doesNotMatch(pending, /data-line-accent=|data-line-region=|data-line-badge=|150 pts|200 pts/);
  for (const score of [0, null, undefined, -1, NaN, Infinity]) {
    const missing = render("BoardLineOverlay", { lines: create(true, score) });
    assert.match(missing, /독점 완료/);
    assert.match(missing, /data-line-accent="a"/);
    assert.doesNotMatch(missing, /<text|data-line-region=|200 pts|확인 중/);
  }
});

test("기존 6개 예시 라인 중 0개, 1개, 떨어진 2개, 전체 완료일 때 독립 rail만 해당 개수로 렌더링한다", () => {
  const groups = [[2,3,4,5,6], [8,9,10,11,12], [13,14,15,17,18], [19,20,22,23,24], [26,27,28,29,31], [32,33,34,35,36]];
  const special = { 1: "START", 7: "CHANCE", 16: "ROULETTE", 21: "AIRPORT", 25: "ROULETTE", 30: "CHANCE" };
  const boardCells = Array.from({ length: 36 }, (_, index) => ({ cellIndex: index + 1, type: special[index + 1] ?? "CHALLENGE" }));
  for (const completed of [[], [0], [0,3], [0,1,2,3,4,5]]) {
    const lines = prepareBoardLines(groups.map((cellIndexes, index) => ({ lineId: `preview-line-${index + 1}`, label: `예시 ${index + 1}`, cellIndexes,
      solvedCellIndexes: cellIndexes, isCompleted: completed.includes(index) })), boardCells);
    const html = render("BoardLineOverlay", { lines, boardCells });
    assert.equal((html.match(/data-line-accent=/g) || []).length, completed.length);
    const meshCount = completed.reduce((count, index) => count + ([2,3,4].includes(index) ? 2 : 1), 0);
    assert.equal((html.match(/data-line-segment=/g) || []).length, meshCount);
    assert.equal((html.match(/data-solved="true"/g) || []).length, 30);
    assert.doesNotMatch(html, /data-line-outline=|<text|data-line-badge=/);
    for (const index of completed) assert.ok(html.includes(`data-line-accent="preview-line-${index + 1}"`));
    const colors = [...html.matchAll(/style="--line-accent:(#[0-9a-f]+)"/g)].map(match => match[1]);
    assert.deepEqual(colors, ["#8e3e48", "#355677", "#3a6955", "#67477c", "#376f77", "#98502f"]);
    assert.equal((html.match(/data-gem-rail=/g) || []).length, meshCount);
    assert.equal((html.match(/data-rail-core=/g) || []).length, meshCount);
    assert.equal((html.match(/data-rail-bloom=/g) || []).length, meshCount);
    assert.equal((html.match(/data-rail-reflection=/g) || []).length, meshCount);
  }
});

test("흩어진 완료 라인에는 임의 점수 표식을 만들지 않고 긴 라인 이름은 보존한다", () => {
  const scattered = prepareBoardLines([{ lineId: "s", label: "흩어진 라인", cellIndexes: [1,10,19,28], solvedCellIndexes: [1,10,19,28], isCompleted: true, bonusScore: 100 }]);
  assert.doesNotMatch(render("BoardLineOverlay", { lines: scattered }), /data-line-region=/);
  const fullName = "매우긴라인이름이원판이나다른라인영역을침범하지않아야함";
  const lines = prepareBoardLines([{ lineId: "a", label: fullName, cellIndexes: [2,3,4,5,6], solvedCellIndexes: [] }]);
  const html = render("BoardLineOverlay", { lines });
  assert.match(html, new RegExp(`${fullName}, 0/5 해결`));
  assert.doesNotMatch(html, /data-line-region=|data-line-region-score=|data-line-outline=|data-line-badge=|미정/);
});

test("독점 보석 rail은 보드와 함께 확대되며 fill 기반 면과 받침을 사용한다", () => {
  const root = css("features/board/components/BoardScreen.module.css");
  assert.ok(declarations(root, ".lineAccent").some(([property, value]) => property === "pointer-events" && value === "none"));
  assert.equal(declarations(root, ".lineAccentMetal").length, 0);
  assert.equal(declarations(root, ".lineAccentColor").length, 0);
  assert.ok(declarations(root, ".lineAccentHitArea").some(([property, value]) => property === "pointer-events" && value === "fill"));
  for (const selector of [".lineRegion", ".lineRegionScore", ".lineScoreShade", ".lineCellSelected", ".lineClaimFlash"]) assert.equal(declarations(root, selector).length, 0);
  assert.ok(declarations(root, ".lineOverlay").some(([property, value]) => property === "z-index" && value === "12"));
});

test("기차 목적지 선택과 이동 중에는 독점 외곽선이 칸 클릭이나 키보드 입력을 가로채지 않는다", () => {
  const lines = prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3,4,5,6], isCompleted: true, rewardScore: 200, bonusScore: 150 }]);
  const html = render("BoardLineOverlay", { lines, isInteractive: false });
  assert.match(html, /data-line-accent="a"/);
  assert.doesNotMatch(html, /role="button"|tabindex=|lineAccentHitArea|aria-controls=|상세 보기/);
  const source = readFileSync(new URL("./features/board/components/BoardTrack.jsx", import.meta.url), "utf8");
  assert.match(source, /isInteractive=\{!isRolling && !rolling && !trainTravel\?\.journey && selectableCellIndexes == null\}/);
});

test("라인 독점 탭은 시안 배점과 실제 지급값을 구분하고 0점과 미제공을 따로 표시한다", () => {
  const make = (bonusScore) => prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2,3], solvedCellIndexes: [2,3], isCompleted: true, rewardScore: 600, bonusScore }]);
  const preview = render("BoardLineSummary", { lines: make(500), isPreview: true });
  assert.match(preview, /시안 배점 · 실제 총점 반영 없음/);
  assert.match(preview, /시안 배점 600 pts, 시안 획득 500 pts/);
  assert.match(preview, /data-line-reward-score="a">시안 배점 600 pts/);
  assert.match(preview, /data-line-earned-score="a">시안 획득 500 pts/);
  const actual = render("BoardLineSummary", { lines: make(0) });
  assert.match(actual, /독점 배점 600 pts, 획득 점수 0 pts/);
  assert.match(actual, /data-line-earned-score="a">획득 0 pts/);
  assert.match(actual, /data-line-earned-total="true">0 pts/);
  assert.doesNotMatch(actual, /시안 배점|시안 획득/);
  const missing = render("BoardLineSummary", { lines: make(null) });
  assert.match(missing, /독점 배점 600 pts, 획득 점수 확인 중/);
  assert.doesNotMatch(missing, /data-line-earned-score=/);
  assert.match(missing, /data-line-earned-total="true" data-pending="true">확인 중/);
  assert.match(preview, /<div id="board-line-progress"/);
  assert.doesNotMatch(preview, /<details|<summary|<button/);
});

test("라인 독점 탭은 라인마다 대상 칸과 푼 칸, 상태를 보이고 합계를 요약한다", () => {
  const lines = prepareBoardLines([
    { lineId: "a", label: "긴이름이라도테두리밖으로나가지않아야하는첫번째라인", cellIndexes: [2,3], solvedCellIndexes: [2,3], isCompleted: true, rewardScore: 300, bonusScore: 200 },
    { lineId: "b", label: "2번 라인", cellIndexes: [4,5], solvedCellIndexes: [4], rewardScore: 150 },
  ]);
  const html = render("BoardLineSummary", { lines, selectedLineId: "b" });
  assert.match(html, /<dt>독점한 라인<\/dt><dd>1<small>\/2<\/small><\/dd>/);
  assert.match(html, /data-line-reward-total="true">450 pts/);
  assert.match(html, /data-line-earned-total="true">200 pts/);
  assert.match(html, /data-line-row="b" data-selected="true"/);
  assert.doesNotMatch(html, /data-line-row="a" data-selected/);
  assert.match(html, /data-tone="won">독점 완료/);
  assert.match(html, /data-tone="count">1\/2/);
  assert.match(html, /칸 <span data-solved="true">4<\/span><span>5<\/span>/);
  assert.match(html, /2번 라인, 1\/2 해결, 대상 칸 4, 5, 독점 배점 150 pts, 획득 점수 0 pts/);
  assert.match(html, /data-line-reward-score="b">배점 150 pts/);
  assert.doesNotMatch(html, /data-line-earned-score="b"/);
  assert.doesNotMatch(html, /<a |NaN|Infinity/);
  assert.equal(render("BoardLineSummary", { lines: [] }), "");
});

test("라인 완료 대기, 배점 미정, 지급 미확인은 숫자로 확정하지 않고 상태로 남긴다", () => {
  const lines = prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2,3], solvedCellIndexes: [2,3], rewardScore: null, bonusScore: 500 }]);
  const html = render("BoardLineSummary", { lines });
  assert.match(html, /1번 라인, 완료 확인 중, 대상 칸 2, 3, 독점 배점 미정, 획득 점수 확인 중/);
  assert.match(html, /data-tone="wait">확인 중/);
  assert.match(html, /data-line-earned-total="true" data-pending="true">확인 중/);
  assert.doesNotMatch(html, /data-line-reward-total|data-line-reward-score|pts/);
  const unknown = render("BoardLineSummary", { lines: lines.map(line => ({ ...line, payoutStatus: "unknown", allProblemsCleared: true })) });
  assert.match(unknown, /<dt>풀이 완료 라인<\/dt><dd>1<small>\/1<\/small><\/dd>/);
  assert.match(unknown, /data-pending="true">지급 미확인/);
  assert.match(unknown, /data-tone="done">풀이 완료/);
  assert.match(unknown, /운영진이 지급을 확인하면 독점 점수가 표시됩니다/);
  const root = css("features/board/components/BoardScreen.module.css");
  const name = Object.fromEntries(declarations(root, ".lineName"));
  assert.equal(name["word-break"], "keep-all");
  assert.equal(name["overflow-wrap"], "anywhere");
});

test("라인 독점 탭은 문제 탭과 같은 줄 모양으로 번호 도장, 이름, 대상 칸, 진행을 보인다", () => {
  const lines = prepareBoardLines([{ lineId: "line-1", lineNumber: 1, label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,4], rewardScore: null }]);
  const html = render("BoardLineSummary", { lines });
  assert.match(html, /<span class="[^"]*">1<\/span><span class="[^"]*"><strong class="[^"]*">1번 라인<\/strong>/);
  assert.match(html, /data-tone="count">2\/5/);
  assert.doesNotMatch(html, /<svg|<image|data-gem-rail=/);
  const root = css("features/board/components/BoardScreen.module.css");
  const seal = Object.fromEntries(declarations(root, ".lineSeal"));
  const badge = Object.fromEntries(declarations(root, ".openRowNo"));
  // 도장은 문제 번호 도장과 같은 크기와 글자로 같은 아이콘 열에 놓인다
  assert.equal(seal.width, badge.width);
  assert.equal(seal.font, badge.font);
  assert.equal(Object.fromEntries(declarations(root, ".lineRow")).gap, "var(--open-gap)");
  assert.equal(Object.fromEntries(declarations(root, '.lineCells span[data-solved="true"]')).color, "var(--gem-mid)");
  assert.ok(declarations(root, ".lineStats dd").some(([property, value]) => property === "font-variant-numeric" && value.split(" ").includes("tabular-nums")));
  const source = readFileSync(new URL("./features/board/components/BoardScreen.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /:has\(\.lineSummary|--open-width: clamp|\.lineMap|\.lineSockets|openLantern/);
  assert.match(source, /\.lineList > li\[data-selected="true"\]::before \{[^}]*inset: 0 -0\.45em[^}]*var\(--line-accent\)/);
});

test("모바일 열린 문제는 독립 포털과 내부 스크롤을 사용하고 보드 배경을 잠근다", () => {
  const root = css("features/board/components/BoardScreen.module.css");
  const overlay = Object.fromEntries(declarations(root, ".mobileOpenOverlay"));
  assert.equal(overlay.position, "fixed");
  assert.equal(overlay.height, "100dvh");
  assert.ok(overlay.padding.includes("safe-area-inset"));
  const body = Object.fromEntries(declarations(root, ".mobileOpenOverlay .openPanelBody"));
  assert.equal(body["min-height"], "0");
  assert.equal(body["overflow-y"], "auto");
  assert.equal(body.flex, "1 1 auto");
  const source = readFileSync(new URL("./features/board/components/OpenChallengesSidePanel.jsx", import.meta.url), "utf8");
  assert.match(source, /isMobile \? createPortal/);
  assert.match(source, /aria-modal/);
  const hook = readFileSync(new URL("./features/board/hooks/useMobileBoardOverlay.js", import.meta.url), "utf8");
  assert.match(hook, /app\.inert = true/);
  assert.match(hook, /window\.scrollTo\(x, y\)/);
  assert.match(hook, /previousFocus\.focus/);
});

test("칸별 독점 border 없이 마지막 문제 정답과 완료 확정 후에만 독립 rail이 생긴다", () => {
  const indexes = [2,3,4,5,6];
  for (let solvedCount = 0; solvedCount <= indexes.length; solvedCount++) {
    const lines = prepareBoardLines([{ lineId: "a", label: "첫 라인", cellIndexes: indexes,
      consumedCellIndexes: indexes, solvedCellIndexes: indexes.slice(0, solvedCount), isCompleted: true, rewardScore: 200, bonusScore: 150 }]);
    const html = render("BoardLineOverlay", { lines });
    assert.equal((html.match(/data-line-outline=/g) || []).length, 0);
    assert.equal((html.match(/data-solved="true"/g) || []).length, solvedCount);
    assert.equal((html.match(/data-line-accent=/g) || []).length, solvedCount === indexes.length ? 1 : 0);
    assert.doesNotMatch(html, /data-line-badge=|data-line-finish=|data-line-region-score=|data-outline-state="claimed"/);
  }
});

test("모두 풀었어도 서버 완료 확인 전에는 rail을 표시하지 않고 풀이 정보는 유지한다", () => {
  const indexes = [2,3,4,5,6];
  const lines = prepareBoardLines([{ lineId: "a", label: "첫 라인", cellIndexes: indexes, solvedCellIndexes: indexes, isCompleted: false }]);
  const html = render("BoardLineOverlay", { lines });
  assert.equal((html.match(/data-solved="true"/g) || []).length, 5);
  assert.match(html, /완료 확인 중/);
  assert.doesNotMatch(html, /data-line-accent=|data-line-finish=|data-line-badge=|data-outline-state="claimed"/);
});

test("라인 계약이 없어도 푼 칸 테두리는 렌더링하고 가짜 라인이나 독점 문장은 만들지 않는다", () => {
  const html = render("BoardLineOverlay", { solvedCellIndexes: [2,2,8,0,37,"3"] });
  assert.equal((html.match(/data-outline-state="solved"/g) || []).length, 2);
  assert.equal((html.match(/<clipPath /g) || []).length, 2);
  assert.match(html, /2번 칸, 풀이 완료/);
  assert.doesNotMatch(html, /data-line-id=|data-line-badge=|data-line-finish=|독점 완료/);
  const lines = prepareBoardLines([{ lineId: "a", label: "첫 라인", cellIndexes: [2,3], solvedCellIndexes: [2], isCompleted: false }]);
  const grouped = render("BoardLineOverlay", { lines, solvedCellIndexes: [2,8] });
  assert.equal((grouped.match(/data-line-outline="2"/g) || []).length, 0);
  assert.equal((grouped.match(/data-solved-cell=/g) || []).length, 1);
  const track = readFileSync(new URL("./features/board/components/BoardTrack.jsx", import.meta.url), "utf8");
  assert.match(track, /getBoardSolvedCellIndexes\(cells, cellStatesByIndex\)/);
  assert.match(track, /<BoardLineOverlay[^>]*solvedCellIndexes=\{solvedCellIndexes\}/);
});

test("소모된 룰렛과 카드 칸은 별도 윤곽만 남기고 풀이 완료나 독점 연출을 만들지 않는다", () => {
  const html = render("BoardLineOverlay", { spentSpecialCells: [{ cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }] });
  assert.equal((html.match(/data-event-outline=/g) || []).length, 2);
  assert.equal((html.match(/data-outline-state="spent"/g) || []).length, 2);
  assert.equal((html.match(/<clipPath /g) || []).length, 2);
  assert.equal((html.match(/vector-effect="non-scaling-stroke"/g) || []).length, 2);
  assert.match(html, /7번 칸, 카드 칸 소모됨/);
  assert.match(html, /16번 칸, 룰렛 칸 소모됨/);
  assert.doesNotMatch(html, /data-line-outline=|data-line-badge=|data-line-finish=|풀이 완료|보상 완료|독점 완료/);
  for (const index of [7,16]) assert.ok(html.includes(`d="${getBoardCellMaskPath(index)}"`));
  const root = css("features/board/components/BoardScreen.module.css");
  assert.deepEqual(declarations(root, ".spentSpecialCells"), [["--line-accent", "#bd9c68"]]);
  assert.deepEqual(declarations(root, '.lineCellOutline[data-outline-state="spent"]'), [["opacity", "0.75"]]);
});

test("특수칸과 문제 풀이 테두리를 중복하지 않고 특수칸을 포함한 완료 라인도 거절한다", () => {
  const lines = prepareBoardLines([{ lineId: "bad", label: "잘못된 라인", cellIndexes: [2,7], solvedCellIndexes: [2,7], isCompleted: true }]);
  const html = render("BoardLineOverlay", { lines, solvedCellIndexes: [2,7,16], spentSpecialCells: [
    { cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }, { cellIndex: 7, type: "CHANCE" },
    { cellIndex: 2, type: "CHALLENGE" }, { cellIndex: 0, type: "CHANCE" }, { cellIndex: "30", type: "CHANCE" },
  ] });
  assert.equal((html.match(/data-event-outline=/g) || []).length, 2);
  assert.equal((html.match(/data-line-outline=/g) || []).length, 1);
  assert.match(html, /data-line-outline="2"/);
  assert.doesNotMatch(html, /data-line-outline="(?:7|16)"|data-line-badge=|data-line-finish=|data-line-id="bad"/);
});

test("특수칸 테두리는 소모 기록에 연결하고 버튼 재열기나 이벤트 처리 조건은 바꾸지 않는다", () => {
  const track = readFileSync(new URL("./features/board/components/BoardTrack.jsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.match(track, /getBoardSpentSpecialCells\(cells, consumedCellIndexes, cellStatesByIndex\)/);
  assert.match(track, /<BoardLineOverlay[^>]*spentSpecialCells=\{spentSpecialCells\}/);
  assert.match(track, /getBoardCellVisitState\(cell.cellIndex, consumedCellIndexes, cellStatesByIndex, cell.type\)/);
  assert.match(track, /disabled=\{isRolling \|\| Boolean\(trainTravel\?\.journey\)\}/);
  assert.match(screen, /prepareBoardLines\(lineProgress, boardDefinition\?\.cells\)/);
  assert.match(screen, /cellEvent\?\.type === "ROULETTE" && currentCell\?\.cellIndex === cellIndex/);
  assert.match(screen, /setDismissedRouletteToken\(null\)/);
});

test("문제 목록과 라인 독점은 한 패널의 두 탭으로 나눠 한 번에 하나만 보인다", () => {
  const summary = createElement(components.BoardLineSummary, {
    lines: prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2], solvedCellIndexes: [], isCompleted: false }]),
  });
  const props = { challenges: [{ challengeId: 7, title: "미니 암호", category: "CRYPTO", isSolved: false }], children: summary, lineCount: "0/1" };
  const problems = render("OpenChallengesPanel", props);
  assert.match(problems, /id="board-open-challenges-panel"/);
  assert.match(problems, /role="tablist" aria-label="열린 문제 보기"/);
  assert.match(problems, /role="tab" id="([^"]+)-problems" aria-selected="true" aria-controls="\1-panel" tabindex="0">문제 <span>1<\/span>/);
  assert.match(problems, /role="tab" id="([^"]+)-lines" aria-selected="false" aria-controls="\1-panel" tabindex="-1">라인 독점 <span>0\/1<\/span>/);
  assert.match(problems, /role="tabpanel" aria-labelledby="[^"]+-problems"/);
  assert.match(problems, /01번 미니 암호 상세 보기/);
  assert.doesNotMatch(problems, /board-line-progress/);
  const lines = render("OpenChallengesPanel", { ...props, showLines: true });
  assert.match(lines, /id="board-line-progress"/);
  assert.match(lines, /role="tabpanel" aria-labelledby="[^"]+-lines"/);
  assert.doesNotMatch(lines, /01번 미니 암호 상세 보기|role="search"/);
  const plain = render("OpenChallengesPanel", { challenges: props.challenges });
  assert.doesNotMatch(plain, /role="tablist"|role="tab"/);
  assert.match(plain, /role="region" aria-label="열린 문제 목록 스크롤"/);
  for (const html of [problems, lines, plain]) assert.equal((html.match(/<aside/g) || []).length, 1);
  assert.doesNotMatch(problems, /전체 문제 보기|open-challenges-view-all|board-line-panel|<details/);
  const panel = readFileSync(new URL("./features/board/components/OpenChallengesSidePanel.jsx", import.meta.url), "utf8");
  assert.match(panel, /ArrowLeft: !linesVisible, ArrowRight: !linesVisible, Home: false, End: true/);
  const screen = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /BoardLinePanel|lineToggle|onViewAllChallenges/);
  assert.match(screen, /<OpenChallengesSidePanel[\s\S]*<BoardLineSummary[\s\S]*<\/OpenChallengesSidePanel>/);
  assert.match(screen, /showLines=\{isLineSummaryOpen\}/);
  assert.match(screen, /linesTabRef=\{lineSummary\}/);
});

test("열린 문제 종이와 제목 줄은 데스크톱 패널과 휴대폰 시트가 같은 것을 쓴다", () => {
  const source = readFileSync(new URL("./features/board/components/BoardScreen.module.css", import.meta.url), "utf8");
  // 종이 테두리는 공통 규칙 한 곳에만 있고 화면마다 패널 폭(--open-width)만 정한다
  assert.match(source, /\n\.openPanel \{[^}]*border-image: url\("\/assets\/board\/open-challenges-paper\.webp"\) 40 20 fill/);
  // 같은 종이는 열린 문제 패널과 보드 위 이벤트 종이 창(paperSheet) 두 규칙만 쓴다
  assert.equal((source.match(/open-challenges-paper\.webp/g) || []).length, 2);
  assert.match(source, /\n\.paperSheet \{[^}]*border-image: url\("\/assets\/board\/open-challenges-paper\.webp"\) 40 20 fill/);
  assert.doesNotMatch(source, /open-challenges-head|open-challenges-body|open-challenges-divider|mobileOpenTitle|openOrnament|panel-board\.webp/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.equal(Object.fromEntries(declarations(root, ".stage .openPanel"))["--open-width"], "min(calc(100vw - 24px), 520px)");
  assert.equal(Object.fromEntries(declarations(root, ".mobileOpenOverlay .openPanel"))["--open-width"], "min(100cqw, 680px)");
  assert.equal(Object.fromEntries(declarations(root, ".mobileOpenOverlay"))["container-type"], "inline-size");
  const buffer = readFileSync(new URL("../public/assets/board/open-challenges-paper.webp", import.meta.url));
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const html = render("OpenChallengesPanel", { challenges: [] });
  assert.match(html, /<h2 class="[^"]*">열린 문제<\/h2><button type="button" aria-label="열린 문제 패널 닫기"/);
  assert.doesNotMatch(html, /open-challenges-divider|open-challenges-leaf/);
});

test("열린 문제 패널은 패널 폭 하나로 글자와 간격이 함께 커지고 작아지며 MSG CTF 명판과 입력칸을 쓴다", () => {
  const root = css("features/board/components/BoardScreen.module.css");
  const panel = Object.fromEntries(declarations(root, ".stage .leftPanel .openPanel"));
  assert.equal(panel["--open-width"], "var(--left-width)");
  assert.equal(panel["font-size"], "max(12px, calc(var(--open-width) * 17 / 333))");
  // 안쪽 크기는 px 고정이나 화면 폭(cqw) 대신 패널 글자 크기(em)를 따른다
  for (const selector of [".openTitle", ".openTabs button", ".openSearch", ".openRow", ".openRowNo", ".lineSeal"]) {
    const values = declarations(root, selector).filter(([property]) => /^(font|font-size|height|min-height|width)$/.test(property)).map(([, value]) => value);
    assert.ok(values.length > 0, selector);
    for (const value of values) assert.doesNotMatch(value, /cqw|clamp\(/, `${selector} ${value}`);
    for (const [property, value] of declarations(root, selector)) if (/^(height|min-height)$/.test(property)) assert.match(value, /em$/, `${selector} ${property} ${value}`);
    assert.ok(values.some((value) => /\d(\.\d+)?em\b/.test(value)), selector);
  }
  const tab = Object.fromEntries(declarations(root, ".openTabs button"));
  assert.match(tab["border-image"], /panel-frame-outline\.png/);
  const selected = Object.fromEntries(declarations(root, '.openTabs button[aria-selected="true"]'));
  assert.equal(selected["border-image-source"], 'url("/assets/board/panel-frame.png")');
  const search = Object.fromEntries(declarations(root, ".openSearch"));
  assert.equal(search.background, "var(--open-field)");
  const outline = readFileSync(new URL("../public/assets/board/panel-frame-outline.png", import.meta.url));
  assert.equal(outline.toString("ascii", 1, 4), "PNG");
});

test("보드 목록은 얇은 스크롤을 유지하고 모바일 패널을 이중 스크롤로 만들지 않는다", () => {
  const root = css("features/board/components/BoardScreen.module.css");
  const body = Object.fromEntries(declarations(root, ".openPanelBody"));
  assert.equal(body["overflow-y"], "auto");
  assert.equal(body["scrollbar-width"], "thin");
  assert.equal(body["scrollbar-color"], "var(--board-scroll-thumb) transparent");
  assert.equal(body["scrollbar-gutter"], "stable");
  assert.equal(body["overscroll-behavior"], "contain");
  const panel = Object.fromEntries(declarations(root, ".stage .openPanel"));
  assert.equal(panel.display, "flex");
  assert.equal(panel.overflow, "hidden");
  assert.equal(panel["overflow-y"], undefined);
  const mobileBody = Object.fromEntries(declarations(root, ".openPanel .openPanelBody"));
  assert.equal(mobileBody["min-height"], "0");
  assert.equal(mobileBody.flex, "0 1 auto");
  let highContrastFallback = false;
  root.walkAtRules("media", (media) => {
    if (media.params !== "(forced-colors: active)") return;
    media.walkDecls("scrollbar-color", (decl) => { if (decl.value === "auto") highContrastFallback = true; });
  });
  assert.ok(highContrastFallback);
});

test("보드 펼쳐보기에서 검색과 상태 선택을 제공하고 내 인스턴스는 그 문제 줄에 표시한다", () => {
  const challenges = [
    { challengeId: "one", title: "푼 문제", category: "WEB", clubName: "MJSEC", isSolved: true },
    { challengeId: "two", title: "진행할 문제", category: "PWN", clubName: "SWING", isSolved: false },
  ];
  const instanceInfo = { instance: { challengeId: "two", status: "RUNNING" } };
  const html = render("OpenChallengesPanel", { challenges, initialView: { query: "SWING", category: "PWN", status: "unsolved" }, instanceInfo });
  assert.match(html, /role="search" aria-label="열린 문제 검색"/);
  assert.match(html, /value="SWING"/);
  assert.match(html, /02번 진행할 문제, 내 인스턴스 실행 중 상세 보기/);
  assert.match(html, /data-tone="running"><i aria-hidden="true"><\/i>실행 중<\/span>/);
  assert.doesNotMatch(html, /RUNNING/);
  assert.doesNotMatch(html, /01번 푼 문제/);
  assert.doesNotMatch(html, /내 인스턴스 <span/);
  // 실행 중인 문제가 필터에 가려지면 목록 위에 바로가기를 따로 띄운다
  const hidden = render("OpenChallengesPanel", { challenges, initialView: { status: "solved" }, instanceInfo });
  assert.match(hidden, /내 인스턴스 <span[^>]*data-tone="running"><i aria-hidden="true"><\/i>실행 중<\/span>/);
  const preparing = render("OpenChallengesPanel", { challenges, instanceInfo: { instance: { challengeId: "two", status: "PROVISIONING" } } });
  assert.match(preparing, /data-tone="busy"><i aria-hidden="true"><\/i>준비 중<\/span>/);
  assert.match(hidden, /<button type="button" title="진행할 문제">/);
  assert.match(hidden, /01번 푼 문제, 해결함 상세 보기/);
});

test("목록 조회 중과 실패를 문제 없음으로 표시하지 않는다", () => {
  for (const props of [{ loading: true }, { error: "목록 확인 실패" }]) {
    const html = render("OpenChallengesPanel", { challenges: [], ...props });
    assert.doesNotMatch(html, /아직 연 문제가 없습니다/);
    assert.match(html, /목록 확인 중|목록 확인 실패/);
  }
  const legacy = readFileSync(new URL("./features/challenges/pages/OpenChallengesPage.jsx", import.meta.url), "utf8");
  assert.match(legacy, /<Navigate to=\{ROUTES.boardChallenges\}[^>]+replace/);
  assert.doesNotMatch(legacy, /useOpenChallenges|OpenChallengesScreen/);
  const routes = readFileSync(new URL("./routes/AppRoutes.jsx", import.meta.url), "utf8");
  assert.match(routes, /path="\/challenges\/:challengeId"/);
});

test("인스턴스 재조회 중에도 기존 바로가기를 유지하고 목록 실패와 분리한다", () => {
  const instance = { challengeId: "two", challengeTitle: "확인 중인 문제", status: "RUNNING" };
  const html = render("OpenChallengesPanel", { challenges: [], error: "목록 확인 실패", instanceInfo: { instance, loading: true } });
  assert.match(html, /<button[^>]+title="확인 중인 문제"/);
  assert.doesNotMatch(html, /내 인스턴스 확인 중/);
  assert.match(html, /목록 확인 실패/);
});
