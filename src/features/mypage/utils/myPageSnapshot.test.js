import test from "node:test";
import assert from "node:assert/strict";
import { updateMyPageSnapshot } from "./myPageSnapshot.js";

const ok = (data) => ({ status: "fulfilled", value: { data: { code: "SUCCESS", data } } });
const failed = { status: "rejected", reason: new Error("503") };
const initial = Object.fromEntries(["profile", "ranking", "memberRanking", "mileageHistory", "solveHistory"].map((key) => [key, { status: "loading", data: null }]));
const responses = (score, rank, personal) => [
  ok({ team_id: "team", team_score: score, jeopardy_score: score - 130, koth_score: 40, signature_score: 60, line_score: 30 }),
  ok({ history: [] }), ok({ solves: [{ challenge_id: "one", source_type: "JEOPARDY", earned_score: 600 }] }),
  ok({ team_id: "team", team_score: score, rank }),
  ok({ nickname: "본인", rank, user_score: personal, solved_count: 1 }),
];

test("현재 총점·순위·개인 점수를 갱신하고 획득 당시 점수와 LINE 보너스를 보존한다", () => {
  const next = updateMyPageSnapshot(initial, responses(830, 2, 500));
  assert.equal(next.profile.data.score, 830);
  assert.equal(next.profile.data.lineScore, 30);
  assert.equal(next.ranking.data.rank, 2);
  assert.equal(next.memberRanking.data.score, 500);
  assert.equal(next.solveHistory.data[0].points, "600");
});
test("팀 정보·팀 순위·개인 순위 중 하나가 실패하면 점수 묶음 전체를 이전 값으로 유지한다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  for (const index of [0, 3, 4]) {
    const partial = responses(830, 2, 500); partial[index] = failed;
    const next = updateMyPageSnapshot(before, partial);
    assert.equal(next.profile.data.score, 905);
    assert.equal(next.ranking.data.rank, 1);
    assert.equal(next.memberRanking.data.score, 575);
    for (const key of ["profile", "ranking", "memberRanking"]) assert.equal(next[key].error, true);
    const recovered = updateMyPageSnapshot(next, responses(830, 2, 500));
    assert.equal(recovered.profile.data.score, 830);
    assert.equal(recovered.memberRanking.error, false);
  }
});
test("총점이나 팀 식별자가 다르면 성공 응답도 섞지 않는다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  for (const change of [{ team_score: 705 }, { team_id: "other" }, { rank: 0 }]) {
    const mixed = responses(830, 2, 500); Object.assign(mixed[3].value.data.data, change);
    assert.equal(updateMyPageSnapshot(before, mixed).profile.data.score, 905);
  }
});
test("기록만 실패하면 점수 갱신은 진행하고 이전 기록과 경고를 유지한다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  const partial = responses(830, 2, 500); partial[2] = failed;
  const next = updateMyPageSnapshot(before, partial);
  assert.equal(next.profile.data.score, 830);
  assert.equal(next.profile.error, false);
  assert.equal(next.solveHistory.data[0].points, "600");
  assert.equal(next.solveHistory.error, true);
});

test("밴 팀의 정상적인 순위 제외 응답은 이전 순위로 되돌리지 않는다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  const banned = responses(830, 2, 500);
  banned[0].value.data.data.is_banned = true;
  banned[3] = ok(null); banned[4] = ok(null);
  const next = updateMyPageSnapshot(before, banned);
  assert.equal(next.profile.data.isBanned, true);
  assert.equal(next.profile.error, false);
  assert.equal(next.ranking.data, null);
  assert.equal(next.memberRanking.status, "empty");
});

const rejectedWith = (status, code) => ({ status: "rejected", reason: { response: { status, data: { code, message: "", data: null } } } });

test("소속 팀이 없으면 오류가 아니라 팀 없음 상태로 바꾸고 이전 팀 점수를 남기지 않는다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  const noTeam = rejectedWith(404, "USER_HAS_NO_TEAM");
  const next = updateMyPageSnapshot(before, [noTeam, noTeam, noTeam, noTeam, noTeam]);
  for (const key of ["profile", "ranking", "memberRanking"]) {
    assert.equal(next[key].status, "noTeam");
    assert.equal(next[key].data, null);
    assert.equal(next[key].error, false);
  }
  for (const key of ["mileageHistory", "solveHistory"]) {
    assert.equal(next[key].status, "empty");
    assert.equal(next[key].error, false);
  }
});

test("팀 없음이 아닌 404는 기존처럼 오류로 보고 이전 점수를 유지한다", () => {
  const before = updateMyPageSnapshot(initial, responses(905, 1, 575));
  const partial = responses(830, 2, 500); partial[0] = rejectedWith(404, "NOT_FOUND");
  const next = updateMyPageSnapshot(before, partial);
  assert.equal(next.profile.data.score, 905);
  assert.equal(next.profile.error, true);
});
