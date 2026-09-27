import assert from "node:assert/strict";
import test from "node:test";
import {
  getOpenChallengesError,
  groupOpenChallenges,
  readCurrentInstance,
  readOpenChallenges,
} from "./openChallengesData.js";

const data = {
  total_count: 4,
  solved_count: 2,
  total_score: 230,
  opened_challenges: [
    {
      challenge_id: "one",
      title: "첫 번째 기록",
      category: "FORENSIC",
      club_name: "MSG",
      is_solved: false,
      score: 200,
    },
    {
      challenge_id: "two",
      title: "Archive WEB",
      category: "WEB",
      club_name: "Archive Club",
      is_solved: true,
      score: 100,
    },
    {
      challenge_id: "three",
      title: "새로운 Archive",
      category: "WEB3",
      club_name: "Archive Club",
      is_solved: false,
      score: 300,
    },
    {
      challenge_id: "four",
      title: "공개된 흔적",
      category: "OSINT",
      club_name: "MSG",
      is_solved: true,
      score: 130,
    },
  ],
};

test("서버의 풀이 여부로 미해결과 완료를 분리하고 두 그룹이 겹치지 않는다", () => {
  const result = readOpenChallenges(data);
  const groups = groupOpenChallenges(result.challenges);
  assert.deepEqual(
    groups.unsolved.map((item) => item.challengeId),
    ["one", "three"],
  );
  assert.deepEqual(
    groups.solved.map((item) => item.challengeId),
    ["two", "four"],
  );
  assert.equal(result.totalCount, 4);
  assert.equal(result.solvedCount, 2);
  assert.equal(result.totalScore, 230);
});

test("현재 인스턴스 문제만 미해결 그룹 앞에 두고 입력 순서는 변경하지 않는다", () => {
  const { challenges } = readOpenChallenges(data);
  const before = structuredClone(challenges);
  assert.deepEqual(
    groupOpenChallenges(challenges, {
      instanceChallengeId: "three",
    }).unsolved.map((item) => item.challengeId),
    ["three", "one"],
  );
  assert.deepEqual(
    groupOpenChallenges(challenges, { instanceChallengeId: "two" }).solved.map(
      (item) => item.challengeId,
    ),
    ["two", "four"],
  );
  assert.deepEqual(challenges, before);
});

test("검색과 분야 필터를 함께 적용해도 완료 문제가 미해결에 섞이지 않는다", () => {
  const { challenges } = readOpenChallenges(data);
  const result = groupOpenChallenges(challenges, { query: "  aRcHiVe  " });
  assert.deepEqual(
    result.unsolved.map((item) => item.challengeId),
    ["three"],
  );
  assert.deepEqual(
    result.solved.map((item) => item.challengeId),
    ["two"],
  );
  assert.equal(
    groupOpenChallenges(challenges, { query: "Archive", category: "WEB" })
      .unsolved.length,
    0,
  );
  assert.equal(
    groupOpenChallenges(challenges, { query: "Archive", category: "WEB" })
      .solved.length,
    1,
  );
  assert.equal(
    groupOpenChallenges(challenges, { query: "없는 검색어" }).solved.length,
    0,
  );
});

test("분야 목록에 WEB3와 OSINT를 포함하며 필터 중에도 전체 선택지를 유지한다", () => {
  const { challenges } = readOpenChallenges(data);
  assert.deepEqual(
    groupOpenChallenges(challenges, { category: "WEB" }).categories,
    ["FORENSIC", "OSINT", "WEB", "WEB3"],
  );
  assert.equal(
    groupOpenChallenges(challenges, { query: "msg" }).solved.length,
    1,
  );
});

test("개방·풀이 시각이나 문자열만 보고 완료로 추정하지 않는다", () => {
  const result = readOpenChallenges({
    opened_challenges: [
      {
        challenge_id: "one",
        is_solved: false,
        solved_at: "2026-09-13T00:00:00Z",
      },
      { challenge_id: "two", is_solved: "true" },
      { challenge_id: "three", is_solved: true },
    ],
  });
  assert.equal(result.solvedCount, 1);
  assert.equal(groupOpenChallenges(result.challenges).unsolved.length, 2);
});

test("빈 목록과 전체 완료 목록을 구분하고 필터를 해제하면 원래 결과를 복원한다", () => {
  assert.deepEqual(
    groupOpenChallenges(
      readOpenChallenges({ opened_challenges: [] }).challenges,
    ).unsolved,
    [],
  );
  const { challenges } = readOpenChallenges({
    ...data,
    opened_challenges: data.opened_challenges.map((item) => ({
      ...item,
      is_solved: true,
    })),
  });
  assert.equal(groupOpenChallenges(challenges).unsolved.length, 0);
  assert.equal(groupOpenChallenges(challenges).solved.length, 4);
  assert.equal(
    groupOpenChallenges(challenges, { query: "", category: "" }).solved.length,
    4,
  );
});

test("잘못된 목록 응답을 빈 목록으로 표시하지 않고 배점 미제공 값을 임의로 합산하지 않는다", () => {
  for (const value of [null, {}, { opened_challenges: null }])
    assert.throws(() => readOpenChallenges(value));
  assert.equal(
    readOpenChallenges({ ...data, total_score: undefined }).totalScore,
    null,
  );
  assert.equal(readOpenChallenges({ ...data, total_score: 0 }).totalScore, 0);
});

test("현재 인스턴스 위치에는 종료된 인스턴스와 접속 주소를 섞어 표시하지 않는다", () => {
  const instance = {
    instance_id: "instance",
    challenge_id: "one",
    challenge_title: "첫 번째 기록",
    status: "REQUESTED",
    host: "old-host.example",
  };
  assert.deepEqual(readCurrentInstance(instance), {
    instanceId: "instance",
    challengeId: "one",
    challengeTitle: "첫 번째 기록",
    status: "REQUESTED",
  });
  for (const status of ["STOPPED", "FAILED", "EXPIRED", "CLEANED"])
    assert.equal(readCurrentInstance({ ...instance, status }), null);
  assert.equal(readCurrentInstance(null), null);
});

test("일시적 조회 오류와 접근 권한 오류를 구분한다", () => {
  assert.equal(
    getOpenChallengesError(new Error("연결 오류")).recoverable,
    true,
  );
  assert.equal(
    getOpenChallengesError({ response: { status: 503 } }).recoverable,
    true,
  );
  assert.equal(
    getOpenChallengesError({
      response: { status: 403, data: { message: "접근 불가" } },
    }).recoverable,
    false,
  );
  assert.equal(
    getOpenChallengesError({
      response: { status: 403, data: { message: "접근 불가" } },
    }).message,
    "접근 불가",
  );
});
