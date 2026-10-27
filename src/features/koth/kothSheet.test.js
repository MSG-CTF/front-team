import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { applyKothClubDetail, createKothChallengeViewModels } from "./utils/kothChallengeState.js";
import { KOTH_CHALLENGE_VISUALS } from "./config/kothVisualConfig.js";

let server;
let KothScreen;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-koth-sheet-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  KothScreen = (await server.ssrLoadModule("/src/features/koth/components/KothScreen.jsx")).default;
});

after(async () => server?.close());

const MY_TEAM = "team-mine";
const challenge = {
  koth_challenge_id: "k-3", title: "STACK STACK STACK", open_group: 3, status: "ACTIVE",
  challenge_url: "https://koth-jenga.example.com", description: "L0부터 L9까지 서비스 블록을 쌓으세요",
  current_owner_team_id: "team-1", current_owner_team_name: "해커스팟", current_score: 236,
  opened_at: "2026-11-08T05:00:00Z", file: { file_name: "koth-jenga.zip", size_bytes: 11059 },
};
const clubs = ["mjsec", "swing", "ycert"].map((key, index) => ({
  club_id: `club-${key}`, name: key.toUpperCase(),
  challenges: [index === 2 ? challenge : { ...challenge, koth_challenge_id: `k-${index + 1}`, status: "CLOSED", open_group: 1 }],
}));
const progress = [{ koth_challenge_id: "k-3", earned_score: 68, rank: 22, solved_at: "2026-11-08T05:17:20Z" }];
const leaderboard = Array.from({ length: 30 }, (_, index) => ({
  rank: index + 1, team_id: index === 21 ? MY_TEAM : `team-${index + 1}`,
  team_name: index === 21 ? "도토리묵사발" : `팀 ${index + 1}`, earned_score: 240 - index * 8, solved_at: null,
}));

function render(overrides = {}) {
  const models = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, progress);
  const selected = models.find((model) => model.kothChallengeId === "k-3");
  const detail = { club_id: "club-ycert", name: "Y-CERT", challenge_count: 1, challenges: [challenge] };
  const props = {
    requestStatus: "success", authenticated: true, clubsStale: false, challenges: models,
    teamId: MY_TEAM, teamName: "도토리묵사발", totalKothScore: 537,
    selectedChallenge: applyKothClubDetail(selected, detail),
    clubDetail: { status: "success", data: detail },
    problemRanking: { status: "success", data: { koth_challenge_id: "k-3", leaderboard } },
    teamToken: {}, onRetry() {}, onSelectChallenge() {}, onCloseChallenge() {}, onOpenTeamToken() {}, onCloseTeamToken() {},
    ...overrides,
  };
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(KothScreen, props)));
}

test("failed collection labels the ranking and keeps a zero row unranked", () => {
  const html=render({problemRanking:{status:"success",data:{collection_status:"FAILED",is_stale:true,
    last_collected_at:null,leaderboard:[{team_id:MY_TEAM,team_name:"우리 팀",rank:null,earned_score:0}]}}});
  assert.match(html,/role="alert">순위 수집에 실패했습니다/);
  assert.match(html,/아래는 저장된 누적 점수입니다/);
  assert.match(html,/<td>—<\/td>/);
  assert.doesNotMatch(html,/data-top="true"/);
});

test("an empty uncollected ranking is distinct from a successfully collected empty ranking", () => {
  for(const status of ["NOT_COLLECTED","PENDING","FAILED"]) {
    const html=render({problemRanking:{status:"success",data:{collection_status:status,leaderboard:[]}}});
    assert.doesNotMatch(html,/아직 득점한 팀이 없습니다/);
    assert.match(html,status==="FAILED"?/순위 수집에 실패했습니다/:/순위 수집을 기다리고 있습니다/);
  }
  assert.match(render({problemRanking:{status:"success",data:{collection_status:"COLLECTED",is_stale:false,leaderboard:[]}}}),/아직 득점한 팀이 없습니다/);
});

test("recovered collection shows its successful timestamp and a real zero score", () => {
  const at="2026-10-27T04:30:00Z";
  const selected={...createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS,clubs,progress)[2],
    collection:"ready",lastCollectedAt:at,earnedScore:0,rank:null,solvedAt:null};
  const html=render({selectedChallenge:selected,problemRanking:{status:"success",data:{
    collection_status:"COLLECTED",last_collected_at:at,leaderboard:[]}}});
  assert.match(html,/수집 결과 0점/);
  assert.equal((html.match(/dateTime="2026-10-27T04:30:00Z"/gi)||[]).length,2);
  assert.doesNotMatch(html,/수집에 실패했습니다/);
});

test("team progress request failure does not present cached rank and score as current", () => {
  const html=render({progressError:"내 팀 점수를 갱신하지 못했습니다"});
  const standing=/<dl[^>]*>([\s\S]*?)<\/dl>/.exec(html)?.[1]??"";
  assert.match(standing,/조회 실패/);
  assert.match(standing,/내 팀 점수를 갱신하지 못했습니다/);
  assert.doesNotMatch(standing,/22위/);
});

test("문제를 고르면 왼쪽에 지도에서 고른 우표 카드를 크게 두고 가운데에 동아리, 제목, 지도의 라운드 리본, 진행 상태를 둔다", () => {
  const html = render();
  const dialog = /<section[^>]*role="dialog"[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(dialog, /aria-modal="true"/);
  const titleId = /aria-labelledby="([^"]+)"/.exec(dialog)?.[1];
  assert.ok(titleId && new RegExp(`<h2 id="${titleId}"[^>]*>STACK STACK STACK</h2>`).test(html));
  assert.match(html, /src="\/assets\/koth\/challenge-pine-ridge\.webp"/);
  // 라운드 리본은 지도 그림에서 2라운드 리본 자리를 잘라 오고 화면 낭독기에는 글자로 읽힌다
  assert.match(html, /<svg viewBox="769 514 166 34"[^>]*aria-hidden="true"/);
  assert.match(html, /<span class="sr-only">ROUND 2<\/span><span[^>]*>\d\d:\d\d OPEN<\/span>/);
  assert.match(html, /data-status="ACTIVE"[^>]*><i aria-hidden="true"><\/i>진행 중/);
  assert.match(html, /aria-label="선택한 문제 정보 닫기"/);
});

test("왕좌 칸에는 지도의 왕관과 점령 팀, 점수를, 우리 팀 칸에는 순위와 점수를 두고 소제목은 영문으로 보이고 한글로 읽힌다", () => {
  const html = render();
  const standing = /<dl[^>]*>([\s\S]*?)<\/dl>/.exec(html)?.[1] ?? "";
  const labels = [...standing.matchAll(/<span aria-hidden="true">([^<]+)<\/span><span class="sr-only">([^<]+)<\/span><\/dt>/g)];
  assert.deepEqual(labels.map(([, en, ko]) => `${en}/${ko}`), ["KING/현재 점령 팀", "MY TEAM/우리 팀"]);
  assert.match(standing, /<svg viewBox="256 62 60 44"/);
  assert.match(standing, /title="해커스팟">해커스팟<\/span><span[^>]*data-tone="gold">236</);
  assert.match(standing, />22위<\/span><span[^>]*>68</);
  assert.match(standing, /첫 득점/);
});

test("우리 팀이 점령 중이면 왕좌 칸에도 우리 팀 표시를 단다", () => {
  const models = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, progress);
  const owned = { ...challenge, current_owner_team_id: MY_TEAM, current_owner_team_name: "도토리묵사발" };
  const detail = { club_id: "club-ycert", name: "Y-CERT", challenge_count: 1, challenges: [owned] };
  const selected = applyKothClubDetail(models.find((model) => model.kothChallengeId === "k-3"), detail);
  assert.equal(selected.currentOwnerTeamId, MY_TEAM);
  const standing = /<dl[^>]*>([\s\S]*?)<\/dl>/.exec(render({ selectedChallenge: selected }))?.[1] ?? "";
  assert.match(standing, />도토리묵사발<\/span><span[^>]*>우리 팀</);
});

test("최신 상세를 받기 전에는 왕좌 정보를 비우고 접속 주소를 열지 않는다", () => {
  const html = render({ clubDetail: { status: "loading", data: null } });
  assert.doesNotMatch(html, /href="https:\/\/koth-jenga\.example\.com"/);
  assert.match(html, /data-empty="true">최신 상태 확인 후 접속할 수 있습니다</);
  assert.match(html, /data-disabled="true" aria-hidden="true">CONNECT</);
  assert.doesNotMatch(/<dl[^>]*>([\s\S]*?)<\/dl>/.exec(html)?.[1] ?? "", /해커스팟/);
});

test("우표 카드 아래 CONNECT 명판이 새 창으로 접속 주소를 열고, 파일은 첨부파일 줄에서 이름을 눌러 받는다", () => {
  const html = render();
  assert.match(html, /<a href="https:\/\/koth-jenga\.example\.com" target="_blank" rel="noopener noreferrer"[^>]*aria-label="문제 접속 새 창으로 열기">CONNECT<\/a><p[^>]*>koth-jenga\.example\.com<\/p>/);
  assert.match(html, /src="\/assets\/challenge-detail\/icon-checkbox\.png"/);
  assert.match(html, /data-file-download="true" title="koth-jenga\.zip" aria-label="문제 파일 koth-jenga\.zip 받기">koth-jenga\.zip<\/button>/);
  assert.match(html, />10\.8 KB</);
});

test("설명 속 숫자는 따로 싸서 같은 숫자 모양으로 맞춘다", () => {
  const html = render();
  assert.match(html, /L<span class="[^"]+">0<\/span>부터 L<span class="[^"]+">9<\/span>까지/);
});

test("순위표는 득점한 팀을 모두 그리고 1위에 왕관, 우리 팀 줄에 표시를 단다", () => {
  const html = render();
  const body = html.match(/<tbody>[\s\S]*<\/tbody>/)?.[0] ?? "";
  assert.equal((body.match(/<tr[ >]/g) || []).length, 30);
  assert.equal((body.match(/<svg viewBox="256 62 60 44"/g) || []).length, 1);
  assert.match(body, /<td>1<\/td><td><span[^>]*><svg viewBox="256 62 60 44"/);
  assert.match(body, /<tr data-mine="true">[\s\S]*?도토리묵사발<\/span><span[^>]*>우리 팀</);
  assert.equal((html.match(/data-mine="true"/g) || []).length, 1);
  assert.match(html, /<span aria-hidden="true">LEADERBOARD<\/span><span class="sr-only">문제별 누적 순위<\/span><span[^>]*>30<\/span>/);
  assert.doesNotMatch(html, /전체 \d+팀 보기/);
});

test("팀 요약은 이름과 점수를 한 줄로, 팀 토큰과 새로고침은 명판 단추로 둔다", () => {
  const html = render();
  const summary = /<aside[^>]*aria-label="내 팀 KoTH 점수"[^>]*>([\s\S]*?)<\/aside>/.exec(html)?.[1] ?? "";
  assert.match(summary, /<strong>도토리묵사발<\/strong>/);
  assert.match(summary, /<b>537<\/b>/);
  assert.equal((summary.match(/<button /g) || []).length, 2);
  assert.match(summary, /data-tone="quiet"[^>]*>새로고침</);
  const signedOut = render({ authenticated: false, selectedChallenge: null });
  assert.match(signedOut, /<button type="button" class="[^"]+" disabled="">\s*팀 토큰/);
});

test("시트는 문제 상세 화면의 판 그림을 쓰고 지도 크기를 따라 줄되 기준 글자 14px 아래로 내려가지 않는다", () => {
  const css = readFileSync(new URL("./components/KothScreen.module.css", import.meta.url), "utf8");
  const rule = (selector) => new RegExp(`(?:^|\n)${selector.replace(/[.[\]()]/g, "\$&")} \{([^}]*)\}`).exec(css)?.[1] ?? "";
  assert.match(rule(".sheetBackdrop"), /position: fixed;/);
  // 문제 시트와 팀 토큰 창은 문제 상세의 금테 판, 기준 글자를 함께 쓴다
  const shared = /\n\.challengeSheet,\r?\n\.tokenSheet \{([^}]*)\}/.exec(css)?.[1] ?? "";
  assert.match(shared, /border-image: url\("\/assets\/challenge-detail\/panel-board\.webp"\) 34 fill/);
  assert.match(shared, /font: 400 max\(0\.8333em, min\(14px, 1\.125em\)\)\/1\.5 "Pretendard"/);
  assert.match(rule(".challengeSheet"), /width: 75em;\s+height: 44em;/);
  // 안쪽에 금테를 두르는 판은 순위 판 하나뿐이다
  assert.equal((css.match(/panel-flag\.webp/g) || []).length, 1);
  assert.match(css, /\.sheetRanking \{[^}]*panel-flag\.webp/);
  assert.match(css, /\.rankingScroll \{[^}]*overflow-y: auto;/);
  assert.match(css, /\.rankingTable tr\[data-mine\] td \{[^}]*position: sticky;[^}]*bottom: 0;/);
  assert.match(css, /\.standingScore \{[^}]*"Inria Serif"/);
  assert.doesNotMatch(css, /\.challengeDetail|\.problemRanking|\.rankingMore|\.tokenPanel|\.tokenBackdrop|\.panelCloseButton|\.sheetServer|\.sheetMetrics/);
});

test("팀 토큰 창은 TEAM TOKEN 아래에 팀 이름을 크게 두고 토큰 칸, 안내, COPY 명판을 둔다", () => {
  const teamToken = { status: "success", error: "", requestTeamToken() {},
    data: { team_id: MY_TEAM, team_name: "도토리묵사발", team_token: "koth_tk_test", issued_at: "2026-10-25T22:45:00Z" } };
  const html = render({ selectedChallenge: null, isTeamTokenOpen: true, teamToken });
  const dialog = /<section[^>]*role="dialog"[^>]*>[\s\S]*<\/section>/.exec(html)?.[0] ?? "";
  assert.match(dialog, /aria-modal="true" aria-labelledby="koth-token-title"/);
  assert.match(dialog, /aria-hidden="true">TEAM TOKEN<\/p><h2 id="koth-token-title"[^>]*>도토리묵사발<span class="sr-only"> KoTH 팀 토큰<\/span><\/h2>/);
  assert.match(dialog, /<input id="koth-team-token"[^>]*value="koth_tk_test"/);
  assert.match(dialog, /aria-label="토큰 복사">COPY<\/button>/);
  assert.match(dialog, /<span>발급 10월 26일 07:45<\/span>/);
  assert.match(dialog, /aria-label="KOTH 팀 토큰 닫기"/);

  const failed = render({ selectedChallenge: null, isTeamTokenOpen: true, teamToken: { ...teamToken, status: "error", data: null, error: "팀 토큰을 불러오지 못했습니다" } });
  assert.match(failed, /role="alert">팀 토큰을 불러오지 못했습니다<\/p>/);
  assert.match(failed, /aria-label="다시 시도">RETRY<\/button>/);
  assert.doesNotMatch(failed, /koth-team-token/);
});

test("우표 카드 이름 줄에는 출제 동아리 이름을, 지도 카드 아래에는 문제 이름을 둔다", () => {
  const html = render();
  // 지도 카드: 그림의 이름 줄은 비어 있고 라운드 색으로 동아리 이름을 얹는다 카드 아래 글자는 문제 이름이다
  assert.match(html, /<span class="[^"]*challengeCaption[^"]*">STACK STACK STACK<\/span><span class="[^"]*" aria-hidden="true"><img src="\/assets\/koth\/challenge-pine-ridge\.webp"/);
  assert.match(html, /data-round="1" style="--name-scale:1">MJSEC<\/span>/);
  assert.match(html, /data-round="2" style="--name-scale:1">YCERT<\/span>/);
  // 문제 시트의 큰 카드도 최신 상세의 동아리 이름을 쓴다
  const sheet = /<section[^>]*role="dialog"[^>]*>[\s\S]*<\/section>/.exec(html)?.[0] ?? "";
  assert.match(sheet, /data-round="2" style="--name-scale:1">Y-CERT<\/span>/);
});
