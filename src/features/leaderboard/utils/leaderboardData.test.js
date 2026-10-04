import test from "node:test";
import assert from "node:assert/strict";
import { adaptLeaderboardTeams, adaptRankingRows, mergeSolveCounts } from "./leaderboardData.js";
import { buildScoreSeries } from "./leaderboardChartData.js";

const raw = { team_id: "a", team_name: "부스 참가팀", team_score: 825, solves: [
  { source_type: "JEOPARDY", points: 200, solved_at: "2026-11-08T01:00:00Z" },
  { source_type: "KOTH", points: 200, solved_at: "2026-11-08T02:00:00Z" },
  { source_type: "SIGNATURE", points: 425, solved_at: "2026-11-08T03:00:00Z" },
] };
test("CLUB은 SIGNATURE 지급 점수 합계를 표시하며 총점에 다시 더하지 않는다", () => {
  const teams = adaptLeaderboardTeams({ teams: [raw] });
  const rankings = adaptRankingRows({ rankings: [{ ...raw, rank: 1 }] });
  const [row] = mergeSolveCounts(rankings, teams, true);
  assert.equal(row.signatureScore, 425);
  assert.equal(row.kothScore, 200);
  assert.equal(row.teamScore, 825);
  assert.equal(row.solveCount, 3);
});
test("상위 8팀 밖이거나 조회 총점이 다르면 부스 점수를 0으로 추측하지 않는다", () => {
  const teams = adaptLeaderboardTeams({ teams: [raw] });
  const rankings = adaptRankingRows({ rankings: [
    { team_id: "b", rank: 9, team_score: 100 },
    { team_id: "a", rank: 1, team_score: 900 },
  ] });
  assert.deepEqual(mergeSolveCounts(rankings, teams, true).map((row) => row.signatureScore), [null, null]);
});
test("백엔드가 별도 점수를 제공하면 상위 8팀 밖에서도 그 값을 보존한다", () => {
  const rankings = adaptRankingRows({ rankings: [{ team_id: "b", rank: 9, team_score: 450, signature_score: 300, koth_score: 50 }] });
  const [row] = mergeSolveCounts(rankings, [], true);
  assert.equal(row.signatureScore, 300);
  assert.equal(row.kothScore, 50);
});
test("기록을 온전히 받은 팀의 CLUB 0점과 기록 미제공은 구분한다", () => {
  const teams = adaptLeaderboardTeams({ teams: [
    { ...raw, team_id: "none", team_score: 200, solves: [raw.solves[0]] },
    { ...raw, team_id: "missing", solves: undefined },
  ] });
  const rankings = adaptRankingRows({ rankings: [{ team_id: "none", team_score: 200 }, { team_id: "missing", team_score: 825 }] });
  assert.deepEqual(mergeSolveCounts(rankings, teams, true).map((row) => row.signatureScore), [0, null]);
});

test("일부 풀이의 점수나 유형이 빠지면 부스 점수를 추정하지 않는다", () => {
  for (const invalidSolve of [
    { ...raw.solves[2], points: null },
    { ...raw.solves[2], source_type: undefined },
    { ...raw.solves[2], solved_at: "invalid" },
  ]) {
    const teams = adaptLeaderboardTeams({ teams: [{ ...raw, solves: [raw.solves[0], raw.solves[1], invalidSolve] }] });
    const rankings = adaptRankingRows({ rankings: [{ ...raw, rank: 1 }] });
    assert.equal(mergeSolveCounts(rankings, teams, true)[0].signatureScore, null);
  }
});

test("순위 API가 명시한 0점은 그래프의 이전 부스 점수로 덮지 않는다", () => {
  const teams = adaptLeaderboardTeams({ teams: [raw] });
  const rankings = adaptRankingRows({ rankings: [{ ...raw, rank: 1, signature_score: 0 }] });
  assert.equal(mergeSolveCounts(rankings, teams, true)[0].signatureScore, 0);
});

test("부스 점수의 소수 부분을 버리지 않는다", () => {
  const decimalTeam = { ...raw, team_score: 825.25, solves: [...raw.solves.slice(0, 2), { ...raw.solves[2], points: 425.25 }] };
  const teams = adaptLeaderboardTeams({ teams: [decimalTeam] });
  const rankings = adaptRankingRows({ rankings: [{ ...decimalTeam, rank: 1 }] });
  const [row] = mergeSolveCounts(rankings, teams, true);
  assert.equal(row.signatureScore, 425.25);
  assert.equal(row.teamScore, 825.25);
});

test("라인 보너스는 총점과 그래프에 포함하고 실제 풀이 수에는 넣지 않는다", () => {
  const team = { ...raw, team_score: 1050, solves: [...raw.solves,
    { challenge_id: null, source_type: "LINE", points: 225, solved_at: "2026-11-08T03:01:00Z" },
  ] };
  const teams = adaptLeaderboardTeams({ teams: [team] });
  const rankings = adaptRankingRows({ rankings: [{ ...team, rank: 1 }] });
  const [row] = mergeSolveCounts(rankings, teams, true);
  assert.equal(teams[0].solvesComplete, true);
  assert.equal(row.solveCount, 3);
  assert.equal(row.teamScore, 1050);
  assert.equal(row.signatureScore, 425);
  assert.equal(row.kothScore, 200);
  assert.equal(buildScoreSeries(teams).series[0].finalScore, 1050);
});

test("문제 5개와 라인 보너스 1개를 받으면 풀이 수는 5개다", () => {
  const team = { ...raw, team_score: 725, solves: [
    ...Array.from({ length: 5 }, (_, index) => ({
      challenge_id: `challenge-${index}`, source_type: "JEOPARDY", points: 100,
      solved_at: "2026-11-08T01:00:00Z",
    })),
    { challenge_id: null, source_type: "LINE", points: 225, solved_at: "2026-11-08T01:00:00Z" },
  ] };
  const teams = adaptLeaderboardTeams({ teams: [team] });
  const [row] = mergeSolveCounts(adaptRankingRows({ rankings: [team] }), teams, true);
  assert.equal(row.solveCount, 5);
  assert.equal(buildScoreSeries(teams).series[0].finalScore, 725);
});

test("0점이나 소수 라인 보너스도 풀이 수와 부스 점수를 바꾸지 않는다", () => {
  for (const points of [0, 22.5]) {
    const team = { ...raw, team_score: 825 + points, solves: [...raw.solves,
      { source_type: "LINE", points, solved_at: "2026-11-08T04:00:00Z" },
    ] };
    const teams = adaptLeaderboardTeams({ teams: [team] });
    const [row] = mergeSolveCounts(adaptRankingRows({ rankings: [team] }), teams, true);
    assert.equal(row.solveCount, 3);
    assert.equal(row.signatureScore, 425);
    assert.equal(buildScoreSeries(teams).series[0].finalScore, team.team_score);
  }
});

test("알 수 없는 점수 유형이나 깨진 LINE 기록은 풀이 수를 추정하지 않는다", () => {
  for (const event of [
    { source_type: "CATEGORY", points: 225, solved_at: "2026-11-08T04:00:00Z" },
    { source_type: "LINE", points: null, solved_at: "2026-11-08T04:00:00Z" },
    { source_type: "LINE", points: 225, solved_at: "invalid" },
  ]) {
    const team = { ...raw, solves: [...raw.solves, event] };
    const teams = adaptLeaderboardTeams({ teams: [team] });
    const [row] = mergeSolveCounts(adaptRankingRows({ rankings: [team] }), teams, true);
    assert.equal(teams[0].solvesComplete, false);
    assert.equal(row.solveCount, null);
    assert.equal(row.signatureScore, null);
  }
});
