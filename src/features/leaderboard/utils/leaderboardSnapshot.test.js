import test from "node:test";
import assert from "node:assert/strict";
import { updateLeaderboardSnapshot } from "./leaderboardSnapshot.js";

const ok = (data) => ({ status: "fulfilled", value: { data: { code: "SUCCESS", data } } });
const failed = { status: "rejected", reason: new Error("503") };
const loading = { status: "loading", data: [], error: false };
const initial = { leaderboard: loading, ranking: loading, page: 1, pageCount: 1, updatedAt: null };
const responses = (score, rank = 1) => [
  ok({ teams: [{ team_id: "team", team_score: score, solves: [{ source_type: "JEOPARDY", points: score, solved_at: "2026-10-21T01:00:00Z" }] }] }),
  ok({ rankings: [{ team_id: "team", team_score: score, rank }], total_count: 12 }),
];

test("점수 감소 시 그래프·순위·페이지·갱신 시각을 함께 반영한다", () => {
  const before = updateLeaderboardSnapshot(initial, responses(905), 1, "before");
  const after = updateLeaderboardSnapshot(before, responses(830, 2), 2, "after");
  assert.equal(after.leaderboard.data[0].solves[0].points, 830);
  assert.equal(after.ranking.data[0].teamScore, 830);
  assert.equal(after.ranking.data[0].rank, 2);
  assert.equal(after.page, 2);
  assert.equal(after.pageCount, 2);
  assert.equal(after.updatedAt, "after");
});
test("어느 요청이 실패해도 이전 그래프·순위와 페이지를 함께 보존하고 복구한다", () => {
  const before = updateLeaderboardSnapshot(initial, responses(905), 1, "before");
  for (const index of [0, 1]) {
    const partial = responses(830, 2); partial[index] = failed;
    const held = updateLeaderboardSnapshot(before, partial, 2, "after");
    assert.equal(held.leaderboard.data[0].teamScore, 905);
    assert.equal(held.ranking.data[0].teamScore, 905);
    assert.equal(held.page, 1);
    assert.equal(held.updatedAt, "before");
    assert.equal(held.leaderboard.error, true);
    assert.equal(held.ranking.error, true);
    assert.equal(updateLeaderboardSnapshot(held, responses(830, 2), 2, "after").ranking.error, false);
  }
});
test("HTTP 성공이어도 조회 시점이 다른 점수를 합치지 않는다", () => {
  const before = updateLeaderboardSnapshot(initial, responses(905), 1, "before");
  const mixed = [responses(830)[0], responses(705)[1]];
  assert.equal(updateLeaderboardSnapshot(before, mixed, 1, "after").updatedAt, "before");
  const invalid = responses(830); invalid[0].value.data.data.teams[0].solves[0].points = 705;
  assert.equal(updateLeaderboardSnapshot(before, invalid, 1, "after").updatedAt, "before");
});
test("첫 조회 실패와 빈 결과를 구분하고 다른 순위 페이지도 허용한다", () => {
  assert.equal(updateLeaderboardSnapshot(initial, [failed, failed], 1, "now").ranking.status, "error");
  const empty = updateLeaderboardSnapshot(initial, [ok({ teams: [] }), ok({ rankings: [], total_count: 0 })], 1, "now");
  assert.equal(empty.ranking.status, "empty");
  assert.equal(updateLeaderboardSnapshot(empty, [failed, failed], 1, "later").ranking.status, "empty");
  const page2 = responses(830); page2[1].value.data.data.rankings[0].team_id = "outside-top-eight";
  assert.equal(updateLeaderboardSnapshot(initial, page2, 2, "now").ranking.status, "success");
  assert.equal(updateLeaderboardSnapshot(initial, [ok(null), ok(null)], 1, "now").ranking.status, "error");
});
