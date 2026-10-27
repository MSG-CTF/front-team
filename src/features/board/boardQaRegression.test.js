import test from "node:test";
import assert from "node:assert/strict";
import { adaptDiceStatus, adaptMyBoard, chanceCardKey, getRemainingSeconds, mergeOwnedChanceCards } from "./utils/boardData.js";
import { createRequestSequence } from "./utils/requestSequence.js";
import { scheduleBoardDeadlineRefresh } from "./utils/boardDeadlineRefresh.js";
import { createKothChallengeViewModels, kothCollectionState } from "../koth/utils/kothChallengeState.js";
import { KOTH_CHALLENGE_VISUALS } from "../koth/config/kothVisualConfig.js";

test("TC-439·443 응답 순서가 뒤집혀도 가장 나중에 시작한 조회만 반영한다", () => {
  const sequence = createRequestSequence();
  const applied = [];
  const older = sequence.begin();
  const newer = sequence.begin();
  // 최신(위치 20) 응답이 먼저 오고 과거(위치 10) 응답이 늦게 도착한다
  for (const [token, position] of [[newer, 20], [older, 10]]) if (sequence.isLatest(token)) applied.push(position);
  assert.deepEqual(applied, [20]);
});

test("이동·보정이 시작되면 그 전에 보낸 조회 응답은 버린다", () => {
  const sequence = createRequestSequence();
  const beforeMove = sequence.begin();
  sequence.invalidate();
  assert.equal(sequence.isLatest(beforeMove), false);
  assert.equal(sequence.isLatest(sequence.begin()), true);
});

test("TC-469·474 같은 종류 카드 두 장도 보유 카드 UUID 로 따로 식별한다", () => {
  const board = adaptMyBoard({
    chance_cards: [
      { card_id: "card_extra_roll", team_card_id: "uuid-1", used: false, discarded: false, usable_now: true },
      { card_id: "card_extra_roll", team_card_id: "uuid-2", used: false, discarded: false, usable_now: true },
    ],
  });
  assert.deepEqual(board.chanceCards.map((card) => card.teamCardId), ["uuid-1", "uuid-2"]);
  const owned = mergeOwnedChanceCards(board.chanceCards, [{ cardId: "card_extra_roll", name: "추가 굴림" }]);
  assert.equal(owned.length, 2);
  assert.deepEqual(owned.map(chanceCardKey), ["uuid-1", "uuid-2"]);
  assert.equal(new Set(owned.map(chanceCardKey)).size, 2);
  // 한 장을 폐기한 뒤에는 남은 한 장만 보유로 센다
  const afterDiscard = mergeOwnedChanceCards(board.chanceCards.map((card) => card.teamCardId === "uuid-1" ? { ...card, discarded: true } : card), []);
  assert.deepEqual(afterDiscard.map(chanceCardKey), ["uuid-2"]);
  // UUID 가 없는 구버전 응답은 종류 id 로 대신한다
  assert.equal(chanceCardKey({ cardId: "card_extra_roll", teamCardId: null }), "card_extra_roll");
});

test("TC-506 기기 시계를 ±1시간 바꿔도 남은 시간이 흔들리지 않는다", (t) => {
  let monotonic = 5_000;
  t.mock.method(performance, "now", () => monotonic);
  const server = Date.parse("2026-10-27T01:00:00Z");
  const status = adaptDiceStatus({ server_time: new Date(server).toISOString() });
  const target = new Date(server + 10 * 60_000).toISOString();
  assert.equal(getRemainingSeconds(target, status), 600);
  monotonic += 30_000;
  for (const shift of [3_600_000, -3_600_000]) {
    t.mock.method(Date, "now", () => server + shift);
    assert.equal(getRemainingSeconds(target, status), 570);
  }
});

test("TC-506 만료 후 재조회도 같은 단조 시계로 센다", () => {
  let monotonic = 1_000;
  const status = { serverTime: "2026-10-27T01:00:00Z", receivedAt: monotonic };
  const deadlines = [{ key: "challenge", targetIso: "2026-10-27T01:00:10Z" }];
  const timers = [];
  let refreshes = 0;
  scheduleBoardDeadlineRefresh(deadlines, status, () => { refreshes += 1; }, {
    now: () => monotonic,
    setTimer: (callback) => { timers.push(callback); return timers.length; },
    clearTimer: () => {},
    visibility: { hidden: false, addEventListener() {}, removeEventListener() {} },
  });
  assert.equal(refreshes, 0);
  monotonic += 10_000;
  timers.at(-1)();
  return Promise.resolve().then(() => assert.equal(refreshes, 1));
});

test("TC-568 KoTH 실제 0점과 수집 대기·실패를 구분한다", () => {
  assert.equal(kothCollectionState({ collection_status: "COLLECTED", earned_score: 0, rank: null }), "ready");
  assert.equal(kothCollectionState({ collection_status: "PENDING" }), "pending");
  assert.equal(kothCollectionState({ collection_status: "FAILED" }), "failed");
  assert.equal(kothCollectionState({ collection_status: "COLLECTED", is_stale: true }), "stale");
  assert.equal(kothCollectionState({ earned_score: 0 }), "ready");
  const clubs = [{ club_id: "c", name: "동아리", challenges: [{ koth_challenge_id: "k", title: "문제", status: "ACTIVE", open_group: 1 }] }];
  const [pending] = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, [{ koth_challenge_id: "k", earned_score: 0, rank: null, collection_status: "PENDING", last_collected_at: null }]);
  assert.equal(pending.collection, "pending");
  assert.equal(pending.rank, null);
  const [zero] = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, [{ koth_challenge_id: "k", earned_score: 0, rank: null, collection_status: "COLLECTED", last_collected_at: "2026-10-27T01:00:00Z" }]);
  assert.equal(zero.collection, "ready");
  assert.equal(zero.earnedScore, 0);
  assert.equal(zero.lastCollectedAt, "2026-10-27T01:00:00Z");
});
