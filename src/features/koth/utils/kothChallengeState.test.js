import test from "node:test";
import assert from "node:assert/strict";
import { createKothChallengeViewModels, flattenKothChallenges, getKothCardAvailability, getKothConnection, validateKothClubs } from "./kothChallengeState.js";
import { KOTH_CHALLENGE_VISUALS } from "../config/kothVisualConfig.js";

const clubs = Array.from({ length: 6 }, (_, index) => ({
  club_id: "club-" + index, name: "동아리 " + index, challenges: [{
    koth_challenge_id: "k-" + index, title: "문제 " + index, open_group: Math.floor(index / 2) + 1, status: index < 2 ? "ACTIVE" : "SCHEDULED",
    challenge_url: "https://example.com:9443/path?stage=1",
  }],
}));
test("6개 동아리의 중첩 문제를 읽고 동일 공개 그룹도 별도 위치에 배치한다", () => {
  assert.equal(validateKothClubs({ clubs }), true);
  const rows = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs);
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map((row) => row.position.left)).size, 6);
  assert.deepEqual(rows.map((row) => row.openGroup), [1, 1, 2, 2, 3, 3]);
});
test("구 응답도 읽되 등록한 참가자 URL을 변경하지 않는다", () => {
  const [challenge] = flattenKothChallenges([{ club_id: "a", name: "A", ...clubs[0].challenges[0] }]);
  assert.equal(challenge.challenge_url, "https://example.com:9443/path?stage=1");
});
test("접속은 ACTIVE의 HTTP(S) 주소만 허용하고 내부 주소를 합성하지 않는다", () => {
  const valid = { status: "ACTIVE", challengeUrl: "https://example.com:9443/path?stage=1" };
  assert.equal(getKothConnection(valid), valid.challengeUrl);
  for (const status of ["SCHEDULED", "CLOSED", "unknown"]) assert.equal(getKothConnection({ ...valid, status }), null);
  for (const challengeUrl of [null, "", "javascript:alert(1)", "https://user:password@example.com"]) assert.equal(getKothConnection({ ...valid, challengeUrl }), null);
});
test("최초 득점 도장은 진행 중 문제의 접속을 막지 않고 공동순위를 유지한다", () => {
  const [row] = createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, [{
    koth_challenge_id: "k-0", earned_score: 200, rank: 1, solved_at: "2026-09-01T00:00:00Z",
  }]);
  assert.equal(row.solved, true);
  assert.equal(row.rank, 1);
  assert.ok(getKothConnection(row));
});
test("응답 형식 오류와 빈 목록을 구분한다", () => {
  assert.equal(validateKothClubs({ clubs: [] }), true);
  assert.equal(validateKothClubs({ clubs: [{}] }), false);
});

test("비활성 카드는 닫고 진행 중 카드는 최초 득점 후에도 선택할 수 있다", () => {
  for (const status of ["SCHEDULED", "CLOSED", "UNKNOWN", null]) {
    assert.equal(getKothCardAvailability({ status }).disabled, true);
  }
  assert.equal(getKothCardAvailability({ status: "ACTIVE", solved: true }).disabled, false);
  assert.equal(getKothCardAvailability({ status: "ACTIVE", challengeUrl: null }).disabled, false);
});

test("목록 갱신에 실패하면 지난 ACTIVE 상태로 문제를 열지 않는다", () => {
  assert.equal(getKothCardAvailability({ status: "ACTIVE" }, true).disabled, true);
});
