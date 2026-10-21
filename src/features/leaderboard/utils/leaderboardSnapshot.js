import { mapApiResource, keepPreviousResource, scoresMatch } from "../../../utils/resourceSnapshot.js";
import { adaptLeaderboardTeams, adaptRankingRows } from "./leaderboardData.js";

export function updateLeaderboardSnapshot(current, results, page, updatedAt) {
  const leaderboard = mapApiResource(results[0], (data) => {
    if (!Array.isArray(data.teams)) throw new Error("팀 기록 누락");
    return adaptLeaderboardTeams(data);
  });
  const ranking = mapApiResource(results[1], (data) => {
    if (!Array.isArray(data.rankings)) throw new Error("순위 기록 누락");
    return adaptRankingRows(data);
  });
  const teams = new Map((leaderboard.data ?? []).map((team) => [team.teamKey, team]));
  const consistent = (ranking.data ?? []).every((row) => {
    const team = teams.get(row.teamKey);
    return !team || scoresMatch(team.teamScore, row.teamScore);
  }) && (leaderboard.data ?? []).every((team) => !team.solvesComplete ||
    scoresMatch(team.teamScore, team.solves.reduce((sum, solve) => sum + solve.points, 0)));
  if (leaderboard.error || ranking.error || !Array.isArray(leaderboard.data) || !Array.isArray(ranking.data) || !consistent) {
    return { ...current, leaderboard: keepPreviousResource(current.leaderboard), ranking: keepPreviousResource(current.ranking) };
  }
  return {
    leaderboard, ranking, page, updatedAt,
    pageCount: Math.max(1, Math.ceil((results[1].value.data.data.total_count || 0) / 6)),
  };
}
