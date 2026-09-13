import test from "node:test";
import assert from "node:assert/strict";
import { mapTeamProfile, mapSolveHistory, mapMileageHistory, getQrRemainingSeconds } from "./myPageData.js";

test("점수 분리, 차단 상태와 팀장 표시를 서버 응답에서 읽는다", () => {
  const profile = mapTeamProfile({ team_score: 1150, jeopardy_score: 350, koth_score: 800, is_banned: true, ban_reason: "확인 중", members: [{ nickname: "가", is_leader: true }] });
  assert.equal(profile.score, 1150);
  assert.equal(profile.jeopardyScore, 350);
  assert.equal(profile.kothScore, 800);
  assert.equal(profile.isBanned, true);
  assert.equal(profile.members[0], "가 (팀장)");
});
test("KOTH와 제오파디 식별자를 구분하고 전체 풀이 기록을 보존한다", () => {
  const rows = mapSolveHistory({ solves: Array.from({ length: 5 }, (_, index) => ({
    source_type: "KOTH", koth_challenge_id: "k-" + index, earned_score: 200, solved_at: "2026-09-01T23:30:00Z", solved_by: null,
  })) });
  assert.equal(rows.length, 5);
  assert.equal(rows[0].id, "KOTH:k-0");
  assert.equal(rows[0].solvedAt, "09-02 08:30");
  assert.equal(rows[0].solver, null);
});
test("환불 내역과 음수 금액을 보존하고 행별 잔액을 역산하지 않는다", () => {
  const rows = mapMileageHistory({ history: Array.from({ length: 4 }, (_, index) => ({
    history_id: index, amount: -30, reason: "QR 결제", item_name: "음료", is_refunded: true,
  })) });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].change, "-30");
  assert.equal(rows[0].balance, "—");
  assert.match(rows[0].reason, /음료.*환불 완료/);
});
test("QR의 서버 만료 시각을 사용하고 잘못되거나 지난 토큰을 유효하게 표시하지 않는다", () => {
  assert.equal(getQrRemainingSeconds("2026-09-01T00:05:00Z", Date.parse("2026-09-01T00:00:00Z")), 300);
  assert.equal(getQrRemainingSeconds("2026-09-01T00:00:00Z", Date.parse("2026-09-01T00:00:01Z")), 0);
  assert.equal(getQrRemainingSeconds("invalid"), null);
});
