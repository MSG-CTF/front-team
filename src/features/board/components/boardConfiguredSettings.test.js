import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { adaptDiceStatus, adaptMyBoard } from "../utils/boardData.js";
import { openChallengeAccess } from "../utils/openChallengeAccess.js";

let server;
let Panel;
const now = Date.parse("2026-10-21T01:00:30Z");
const openedAt = "2026-10-21T01:00:00Z";
const deadline = "2026-10-21T01:01:00Z";

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-board-settings-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  Panel = (await server.ssrLoadModule(
    "/src/features/board/components/BoardCountdownPanels.jsx",
  )).BoardDiceStatusPanel;
});

after(async () => server?.close());

function renderPanel(status, activeChallenge) {
  const diceStatus = adaptDiceStatus({
    can_roll: true, server_time: new Date(now).toISOString(), ...status,
  });
  return renderToStaticMarkup(createElement(Panel, {
    diceStatus,
    rollsLeft: diceStatus.diceRollsLeft,
    maxRolls: diceStatus.maxDiceRolls,
    canRoll: diceStatus.canRoll,
    activeChallenge,
  }));
}

test("상한이 5개인 팀은 3/5와 충전 시간을 표시한다", (t) => {
  t.mock.method(Date, "now", () => now);
  const html = renderPanel({
    dice_rolls_left: 3, max_dice_rolls: 5,
    next_dice_reset_at: new Date(now + 7 * 60_000).toISOString(),
  });
  assert.match(html, /주사위 보유 3\/5/);
  assert.match(html, /충전까지 07:00/);
});

test("1개와 5개 상한에 가득 찬 팀은 충전 시간을 숨긴다", (t) => {
  t.mock.method(Date, "now", () => now);
  for (const cap of [1, 5]) {
    const board = adaptMyBoard({ dice_rolls_left: cap, max_dice_rolls: cap });
    assert.equal(board.maxDiceRolls, cap);
    const html = renderPanel({ dice_rolls_left: cap, max_dice_rolls: cap });
    assert.match(html, new RegExp(`주사위 보유 ${cap}/${cap}`));
    assert.doesNotMatch(html, /충전까지/);
  }
});

test("1분 보상 기간은 30초 뒤 00:30으로 표시한다", (t) => {
  t.mock.method(Date, "now", () => now);
  const board = adaptMyBoard({ active_challenge: {
    challenge_id: "challenge", opened_at: openedAt, solve_deadline_at: deadline,
  } });
  assert.equal(board.activeChallenge.solveDeadlineAt, "2026-10-21T01:01:00.000Z");
  const html = renderPanel({ dice_rolls_left: 1, timer_running: true }, board.activeChallenge);
  assert.match(html, /문제 제한 00:30/);
  assert.doesNotMatch(html, /14:30/);
});

test("서버가 타이머 종료를 알리면 남은 문제 정보로 제한시간을 표시하지 않는다", (t) => {
  t.mock.method(Date, "now", () => now);
  const html = renderPanel({ dice_rolls_left: 1, timer_running: false }, {
    solveDeadlineAt: deadline,
  });
  assert.doesNotMatch(html, /문제 제한/);
});

test("구버전 응답은 상한 3개와 기본 15분을 유지한다", () => {
  assert.equal(adaptDiceStatus({}).maxDiceRolls, 3);
  const board = adaptMyBoard({ active_challenge: { opened_at: openedAt } });
  assert.equal(board.maxDiceRolls, 3);
  assert.equal(board.activeChallenge.solveDeadlineAt, "2026-10-21T01:15:00.000Z");
  assert.equal(adaptMyBoard({ active_challenge: {
    opened_at: openedAt, solve_deadline_at: "invalid",
  } }).activeChallenge.solveDeadlineAt, "2026-10-21T01:15:00.000Z");
});

test("문제 선택 직후에도 서버에서 받은 마감을 유지한다", async () => {
  const access = await openChallengeAccess({ challengeId: "challenge", refreshBoard: false }, {
    openCell: async () => ({ data: { code: "SUCCESS", data: {
      challenge_id: "challenge", opened_at: openedAt, solve_deadline_at: deadline,
    } } }),
    syncProgress: () => assert.fail("상세 이동 전에 추가 조회하지 않는다"),
  });
  assert.equal(access.solveDeadlineAt, "2026-10-21T01:01:00.000Z");
});
