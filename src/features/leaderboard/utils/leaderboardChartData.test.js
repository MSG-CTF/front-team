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
  assert.equal(data.series[0].points.filter((point) => !point.isBoundary).length, 3);
});
test("점수선은 풀이 전까지 수평으로 유지된다", () => {
  assert.equal(toPolylinePoints([{ timestamp: 0, score: 0 }, { timestamp: 10, score: 100 }], (x) => x, (y) => y),
    "0.00,0.00 10.00,0.00 10.00,100.00");
});
test("뒷페이지의 서버 순위를 유지하고 그래프 밖 팀의 풀이 수를 추측하지 않는다", () => {
  const rows = adaptRankingRows({ rankings: [{ team_id: "unknown", rank: 7, team_score: 0 }] });
  assert.equal(rows[0].rank, 7);
  assert.equal(mergeSolveCounts(rows, teams, true)[0].solveCount, null);
});
test("빈 데이터는 그래프를 만들지 않는다", () => {
  assert.deepEqual(buildScoreSeries([]), { series: [], minTime: null, maxTime: null, maxScore: 0 });
});
