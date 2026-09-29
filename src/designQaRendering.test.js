import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    BoardVisitedOverlay: "board/components/BoardVisitedOverlay",
    BoardArtwork: "board/components/BoardArtwork",
    BoardPiece: "board/components/BoardPiece",
    BoardTrain: "board/components/BoardTrain",
    AirportTravelOverlay: "board/components/AirportTravelOverlay",
    Dice3D: "board/components/Dice3D",
    BoardEventPanel: "board/components/BoardEventPanel",
    ChallengeSelection: "board/components/ChallengeSelection",
    BoardLineOverlay: "board/components/BoardLineOverlay",
    BoardLineSummary: "board/components/BoardLineSummary",
    OpenChallengesPanel: "board/components/OpenChallengesSidePanel",
    AdminLayout: "admin/components/AdminLayout",
    AdminDashboard: "admin/pages/AdminDashboardPage",
    AdminMileage: "admin/pages/AdminMileagePage",
  };
  for (const [name, path] of Object.entries(paths)) {
    components[name] = (await server.ssrLoadModule(`/src/features/${path}.jsx`)).default;
  }
  components.QuickAction = (await server.ssrLoadModule("/src/features/admin/pages/AdminDashboardPage.jsx")).QuickActionButton;
  components.DiceFallback = (await server.ssrLoadModule("/src/features/board/components/DiceFallback.jsx")).DiceFallback;
});
after(async () => server?.close());

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
  assert.ok(train.indexOf("renderer.render(sampleTrainJourney") < train.indexOf("callbacks.current.onStart?.()"));
  assert.match(train, /callbacks.current.onStop\?\.\(\)/);
  assert.match(hook, /if \(document.hidden\) stop\(\)/);
  assert.match(hook, /player.current\?\.dispose\(\)/);
});

function render(name, props = {}) {
  const view = createElement(components[name], props);
  return renderToStaticMarkup(createElement(StaticRouter, { location: "/" },
    name === "BoardArtwork" ? createElement("svg", null, view) : view));
}
function css(path) {
  return postcss.parse(readFileSync(new URL(`./${path}`, import.meta.url), "utf8"));
}
function declarations(root, selector) {
  const result = [];
  root.walkRules(selector, (rule) => rule.walkDecls((decl) => result.push([decl.prop, decl.value])));
  return result;
}

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
  assert.match(idle, /\/assets\/board\/dice.png/);
  const rolled = render("DiceFallback", { result: { diceA: 2, diceB: 6 } });
  assert.equal((rolled.match(/<circle /g) || []).length, 8);
  assert.equal((rolled.match(/<rect /g) || []).length, 2);
  assert.doesNotMatch(rolled, /<img/);
  assert.match(render("DiceFallback", { result: { diceA: 0, diceB: 8 } }), /\/assets\/board\/dice.png/);
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
  assert.doesNotMatch(html, /<button|<img/);
  const root = css("features/board/components/BoardTrain.module.css");
  assert.ok(declarations(root, ".actor").some(([key, value]) => key === "pointer-events" && value === "none"));
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

test("모바일 보드 메뉴는 기존 금색 아이콘과 여섯 이동 기능을 유지한다", () => {
  const html = render("BoardNav");
  const mobileNav = html.match(/<nav[^>]*aria-label="대회 메뉴"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(mobileNav);
  for (const image of ["nav-rules.png", "nav-mypage.png", "nav-scoreboard.png"]) {
    assert.ok(mobileNav.includes(`/assets/board/${image}`));
  }
  for (const path of ["/rules", "/mypage", "/leaderboard", "/koth", "/signatures"]) {
    assert.ok(mobileNav.includes(`href="${path}"`));
  }
  assert.match(mobileNav, /<button[^>]*>로그아웃<\/button>/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.ok(declarations(root, ".mobileNav a, .mobileNav button").some(([property, value]) => property === "min-height" && value === "44px"));
});

test("방문한 칸은 중복 없이 각자의 곡선 윤곽으로 표시하고 잘못된 번호를 무시한다", () => {
  const html = render("BoardVisitedOverlay", { visitedCellIndexes: [0, 2, 2, 21, 37] });
  assert.match(html, /viewBox="0 0 1772 1330"/);
  assert.equal((html.match(/data-visited-cell=/g) || []).length, 2);
  assert.match(html, /data-visited-cell="2"/);
  assert.match(html, /data-visited-cell="21"/);
  assert.match(html, /<path[^>]*d="M[^"]* Q/);
  assert.match(html, /<g clip-path="url\(#[^"]+\)"><g[^>]*data-board-artwork="true"><image[^>]+>/);
  assert.equal((html.match(/data-visited-surface=/g) || []).length, 2);
  assert.match(html, /<radialGradient/);
  assert.match(html, /<linearGradient/);
  assert.doesNotMatch(html, /visitedInset|stroke=/);
  assert.doesNotMatch(html, /<polygon/);
  assert.equal(render("BoardVisitedOverlay", { visitedCellIndexes: [] }), "");
});

test("룰렛과 황금열쇠 문양은 서버 칸 종류를 확인하고 방문 음영에도 동일하게 쓴다", () => {
  const cells = [{ cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }];
  const artwork = render("BoardArtwork", { cells });
  const visited = render("BoardVisitedOverlay", { cells, visitedCellIndexes: [7, 16] });
  for (const html of [artwork, visited]) {
    assert.match(html, /data-cell-artwork="16-roulette"/);
    assert.match(html, /data-cell-artwork="7-chance"/);
    assert.ok(html.includes(getBoardCellMaskPath(16)));
    assert.ok(html.includes(getBoardCellMaskPath(7)));
  }
  assert.doesNotMatch(render("BoardArtwork", { cells: [{ cellIndex: 16, type: "QUARANTINE" }] }), /data-cell-artwork/);
  assert.doesNotMatch(render("BoardArtwork", { cells: [{ cellIndex: 7, type: "ROULETTE" }] }), /data-cell-artwork/);
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
  assert.match(alegreya.src, /\/assets\/fonts\/alegreya\/Alegreya-Medium\.ttf/);
  const html = render("ChallengeSelection", { candidates: [{ challengeId: 1, title: "AFTERIMAGE", category: "WEB" }] });
  assert.match(html, /selection-squirrel-refined\.webp/);
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
  assert.match(ready, /aria-label="주사위 보유 3\/3\. 주사위를 굴릴 수 있습니다\./);
  const waiting = render("DiceStatusPanel", {
    rollsLeft: 2, canRoll: false, blockedMessage: "문제 풀이 제한 시간이 끝나면 다시 이동할 수 있습니다", challengeRemainingSeconds: 900,
  });
  assert.match(waiting, /data-roll-ready="false"/);
  assert.match(waiting, /문제 제한 15:00/);
  assert.match(waiting, /<p[^>]*>문제 풀이 제한 시간이 끝나면 다시 이동할 수 있습니다<\/p>/);
  const root = css("features/board/components/BoardScreen.module.css");
  assert.deepEqual(declarations(root, '.diceStatus[data-roll-ready="true"] > p'), [["display", "none"]]);
});

test("라인 데이터가 없으면 표시하지 않고 풀이 진행과 완료를 별도로 렌더링한다", () => {
  assert.equal(render("BoardLineOverlay"), "");
  const lines = prepareBoardLines([
    { lineId: "a", label: "1번 라인", cellIndexes: [2,3,4,5,6], solvedCellIndexes: [2,3], isCompleted: false },
    { lineId: "b", label: "2번 라인", cellIndexes: [8,9,10,11,12], solvedCellIndexes: [8,9,10,11,12], isCompleted: true },
  ]);
  const html = render("BoardLineOverlay", { lines });
  assert.match(html, /1번 라인, 2\/5 해결/);
  assert.match(html, /2번 라인, 독점 완료, 상세 보기/);
  assert.equal((html.match(/data-solved="true"/g) || []).length, 7);
  assert.equal((html.match(/data-line-cell=/g) || []).length, 10);
  assert.equal((html.match(/data-line-badge=/g) || []).length, 1);
  assert.equal((html.match(/<clipPath /g) || []).length, 10);
  assert.match(html, /<image[^>]+href="\/assets\/board\/line-complete-crest-v1\.png"/);
  assert.doesNotMatch(html, /lineClaimFlash|lineSweep|lineRail|lineClaimRibbon|lineCellBand|lineSolveMark|lineCellSelected/);
  const selected = render("BoardLineOverlay", { lines, selectedLineId: "a" });
  assert.equal((selected.match(/class="[^"]*lineCellSelected/g) || []).length, 5);
  for (const index of lines.flatMap((line) => line.cellIndexes)) {
    assert.ok(html.includes(`d="${getBoardCellMaskPath(index)}"`));
  }
});

test("라인 시안에는 가짜 지급 점수를 표시하지 않고 0점과 미제공을 구분한다", () => {
  const make = (bonusScore) => prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2,3], solvedCellIndexes: [2,3], isCompleted: true, bonusScore }]);
  const props = { selectedLineId: "a", onSelectLine: () => {} };
  const preview = render("BoardLineSummary", { ...props, lines: make(500), isPreview: true });
  assert.match(preview, /실제 점수에는 반영되지 않습니다/);
  assert.doesNotMatch(preview, /500점/);
  assert.match(render("BoardLineSummary", { ...props, lines: make(0) }), /지급된 보너스 0점/);
  assert.match(render("BoardLineSummary", { ...props, lines: make(null) }), /보너스 지급 정보 확인 중/);
  assert.match(preview, /<details[^>]*id="board-line-progress"/);
  assert.doesNotMatch(preview, /<details[^>]*\sopen=""|라인 현황 닫기/);
});

test("라인 완성과 열린 문제는 기존 펼쳐보기 한 곳에 두고 중복 이동 버튼을 만들지 않는다", () => {
  const summary = createElement(components.BoardLineSummary, {
    lines: prepareBoardLines([{ lineId: "a", label: "1번 라인", cellIndexes: [2], solvedCellIndexes: [], isCompleted: false }]),
  });
  const html = render("OpenChallengesPanel", {
    challenges: [{ challengeId: 7, title: "미니 암호", category: "CRYPTO", isSolved: false }], children: summary,
  });
  assert.match(html, /id="board-open-challenges-panel"/);
  assert.match(html, /<details[^>]*id="board-line-progress"/);
  assert.match(html, /01번 미니 암호 상세 보기/);
  assert.doesNotMatch(html, /전체 문제 보기|open-challenges-view-all|board-line-panel/);
  assert.equal((html.match(/<aside/g) || []).length, 1);
  const screen = readFileSync(new URL("./features/board/components/BoardScreen.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /BoardLinePanel|lineToggle|onViewAllChallenges/);
  assert.match(screen, /<OpenChallengesSidePanel[\s\S]*<BoardLineSummary[\s\S]*<\/OpenChallengesSidePanel>/);
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

test("보드 펼쳐보기에서 검색과 상태 선택, 현재 인스턴스 진입을 제공한다", () => {
  const challenges = [
    { challengeId: "one", title: "푼 문제", category: "WEB", clubName: "MJSEC", isSolved: true },
    { challengeId: "two", title: "진행할 문제", category: "PWN", clubName: "SWING", isSolved: false },
  ];
  const html = render("OpenChallengesPanel", {
    challenges, initialView: { query: "SWING", category: "PWN", status: "unsolved" },
    instanceInfo: { instance: { challengeId: "two", status: "RUNNING" } },
  });
  assert.match(html, /role="search" aria-label="열린 문제 검색"/);
  assert.match(html, /value="SWING"/);
  assert.match(html, /02번 진행할 문제 상세 보기/);
  assert.doesNotMatch(html, /01번 푼 문제 상세 보기/);
  assert.match(html, /내 인스턴스/);
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
