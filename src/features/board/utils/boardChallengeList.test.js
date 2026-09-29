import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBoardListView, selectBoardChallenges } from "./boardChallengeList.js";

const challenges = [
  { challengeId: "one", title: "First", clubName: "MJSEC", category: "WEB", isSolved: true },
  { challengeId: "two", title: "Second", clubName: "SWING", category: "CRYPTO", isSolved: false },
  { challengeId: "three", title: "Third", clubName: "MJSEC", category: "WEB", isSolved: false },
];
test("보드 검색은 제목과 동아리, 분야와 풀이 상태를 함께 적용하고 원래 번호를 보존한다", () => {
  const result = selectBoardChallenges(challenges, { query: "  mjsec ", category: "WEB", status: "unsolved" });
  assert.deepEqual(result.items.map((item) => [item.challengeId, item.openedNumber]), [["three", 3]]);
  assert.deepEqual(result.categories, ["CRYPTO", "WEB"]);
  assert.deepEqual(selectBoardChallenges(challenges, { status: "solved" }).items.map((item) => item.challengeId), ["one"]);
});
test("전체 목록은 미해결을 앞에 두고 사용 중인 문제를 우선하되 필터를 우회하지 않는다", () => {
  assert.deepEqual(selectBoardChallenges(challenges, {}, "three").items.map((item) => item.challengeId), ["three", "two", "one"]);
  assert.deepEqual(selectBoardChallenges(challenges, { category: "CRYPTO" }, "three").items.map((item) => item.challengeId), ["two"]);
});
test("뒤로 가기용 상태는 유효한 필터와 스크롤만 보존한다", () => {
  assert.deepEqual(normalizeBoardListView(null), { query: "", category: "", status: "all", scrollTop: 0 });
  assert.deepEqual(normalizeBoardListView({ query: {}, category: 3, status: "unknown", scrollTop: Infinity }), normalizeBoardListView(null));
  assert.equal(normalizeBoardListView({ scrollTop: -1 }).scrollTop, 0);
  assert.equal(normalizeBoardListView({ query: "a".repeat(130), scrollTop: 200000 }).scrollTop, 100000);
  assert.equal(normalizeBoardListView({ query: "a".repeat(130) }).query.length, 120);
  assert.deepEqual(normalizeBoardListView({ query: "답", category: "WEB", status: "solved", scrollTop: 432.5 }), { query: "답", category: "WEB", status: "solved", scrollTop: 432.5 });
});
