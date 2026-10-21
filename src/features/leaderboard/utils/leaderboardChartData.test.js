import test from "node:test";
import assert from "node:assert/strict";
import { buildScoreSeries, scoreAtTime, toPolylinePoints } from "./leaderboardChartData.js";
import { adaptLeaderboardTeams, adaptRankingRows, mergeSolveCounts } from "./leaderboardData.js";

const teams = adaptLeaderboardTeams({ teams: [
  { team_id: "b", team_name: "B", team_score: 300, is_top3: true, solves: [
    { challenge_id: "k", source_type: "KOTH", points: 200, solved_at: "2026-09-01T02:00:00Z" },
    { challenge_id: "j", source_type: "JEOPARDY", points: 100, solved_at: "2026-09-01T01:00:00Z" },
  ] },
  { team_id: "a", team_name: "A", team_score: 100, solves: [
    { points: 100, solved_at: "2026-09-01T01:30:00Z" },
  ] },
] });
test("서버 팀 순서와 TOP3 표시를 유지하고 UTC 시각순으로 점수를 누적한다", () => {
  const { series } = buildScoreSeries(teams);
  assert.deepEqual(series.map((item) => item.key), ["b", "a"]);
  assert.equal(series[0].isTop3, true);
  assert.equal(series[0].finalScore, 300);
});
test("다른 팀 풀이 시점에서 존재하지 않는 중간 점수를 보간하지 않는다", () => {
  const { series } = buildScoreSeries(teams);
  assert.equal(scoreAtTime(series[0].points, Date.parse("2026-09-01T01:30:00Z")), 100);
  assert.equal(scoreAtTime(series[0].points, Date.parse("2026-09-01T02:00:00Z")), 300);
});
test("동일 시각 풀이를 모두 합산하며 KOTH 주기별 가상 점은 만들지 않는다", () => {
  const data = buildScoreSeries([{ ...teams[0], solves: [
    ...teams[0].solves, { solvedAt: "2026-09-01T02:00:00Z", points: 50 },
  ] }]);
  assert.equal(scoreAtTime(data.series[0].points, Date.parse("2026-09-01T02:00:00Z")), 350);
  assert.equal(data.series[0].points.length, 3);
});
test("점수선은 실제 풀이 점끼리 직선으로 연결한다", () => {
  assert.equal(toPolylinePoints([{ timestamp: 10, score: 100 }, { timestamp: 20, score: 300 }, { timestamp: 35, score: 350 }], (x) => x, (y) => y),
    "10.00,100.00 20.00,300.00 35.00,350.00");
});
test("첫 풀이는 실제 점 하나이며 시간축 여백에 시작점과 끝점을 만들지 않는다", () => {
  const data = buildScoreSeries([teams[1]]);
  const timestamp = Date.parse("2026-09-01T01:30:00Z");
  assert.deepEqual(data.series[0].points, [{ timestamp, score: 100 }]);
  assert.ok(data.minTime < timestamp && data.maxTime > timestamp);
  assert.equal(scoreAtTime(data.series[0].points, timestamp - 1), 0);
});
test("두 번째 풀이까지 정확히 두 점만 만들며 풀이가 없는 팀은 제외한다", () => {
  const data = buildScoreSeries([{ ...teams[1], solves: [] }, teams[0]]);
  assert.equal(data.series.length, 1);
  assert.deepEqual(data.series[0].points, [
    { timestamp: Date.parse("2026-09-01T01:00:00Z"), score: 100 },
    { timestamp: Date.parse("2026-09-01T02:00:00Z"), score: 300 },
  ]);
});
test("다이나믹 점수 하락 시 기존 풀이 시각은 유지하고 모든 누적 점수를 다시 계산한다", () => {
  const snapshot = (firstScore) => adaptLeaderboardTeams({ teams: [{
    team_id: "dynamic", team_name: "Dynamic", team_score: firstScore + 200,
    solves: [
      { challenge_id: "first", source_type: "JEOPARDY", points: firstScore, solved_at: "2026-09-01T01:00:00Z" },
      { challenge_id: "second", source_type: "JEOPARDY", points: 200, solved_at: "2026-09-01T02:00:00Z" },
    ],
  }] });
  const previousTeams = snapshot(500);
  const previous = buildScoreSeries(previousTeams);
  const refreshed = buildScoreSeries(snapshot(400));
  assert.deepEqual(previous.series[0].points.map(p => p.score), [500, 700]);
  assert.deepEqual(refreshed.series[0].points.map(p => p.score), [400, 600]);
  assert.deepEqual(refreshed.series[0].points.map(p => p.timestamp), previous.series[0].points.map(p => p.timestamp));
  assert.equal(refreshed.series[0].finalScore, 600);
  assert.equal(previousTeams[0].solves[0].points, 500);
  assert.equal(scoreAtTime(refreshed.series[0].points, Date.parse("2026-09-01T01:30:00Z")), 400);
});
test("뒷페이지의 서버 순위를 유지하고 그래프 밖 팀의 풀이 수를 추측하지 않는다", () => {
  const rows = adaptRankingRows({ rankings: [{ team_id: "unknown", rank: 7, team_score: 0 }] });
  assert.equal(rows[0].rank, 7);
  assert.equal(mergeSolveCounts(rows, teams, true)[0].solveCount, null);
});
test("빈 데이터는 그래프를 만들지 않는다", () => {
  assert.deepEqual(buildScoreSeries([]), { series: [], minTime: null, maxTime: null, maxScore: 0 });
});

test("SIGNATURE 풀이도 점수선과 풀이 수에 포함한다", () => {
  const rows = adaptLeaderboardTeams({ teams: [{
    team_id: "signature-team", team_name: "연동팀", team_score: 725, is_top3: true,
    solves: [
      { challenge_id: "j", source_type: "JEOPARDY", points: 100, solved_at: "2026-09-20T01:00:00Z" },
      { challenge_id: "k", source_type: "KOTH", points: 200, solved_at: "2026-09-20T02:00:00Z" },
      { challenge_id: "s", source_type: "SIGNATURE", points: 425, solved_at: "2026-09-20T03:00:00Z" },
    ],
  }] });
  assert.equal(rows[0].solves[2].sourceType, "SIGNATURE");
  assert.equal(buildScoreSeries(rows).series[0].finalScore, 725);
  assert.equal(mergeSolveCounts([{ teamKey: "signature-team" }], rows, true)[0].solveCount, 3);
});
