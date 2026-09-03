function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function adaptLeaderboardTeams(data) {
  if (!Array.isArray(data?.teams)) return [];

  return data.teams.slice(0, 8).map((team, teamIndex) => ({
    key: team.team_id || `leaderboard-team-${teamIndex}`,
    teamKey: team.team_id || null,
    name: team.team_name || "—",
    teamScore: asFiniteNumber(team.team_score),
    isTop3: team.is_top3 === true,
    solves: Array.isArray(team.solves)
      ? team.solves
          .map((solve) => ({
            challengeKey: solve.challenge_id || null,
            sourceType: solve.source_type || null,
            solvedAt: solve.solved_at || null,
            points: asFiniteNumber(solve.points),
          }))
          .filter((solve) => asTimestamp(solve.solvedAt) !== null)
          .sort((left, right) => asTimestamp(left.solvedAt) - asTimestamp(right.solvedAt))
      : [],
  }));
}

export function adaptRankingRows(data) {
  if (!Array.isArray(data?.rankings)) return [];

  return data.rankings.slice(0, 6).map((ranking, index) => ({
    key: ranking.team_id || `ranking-team-${index}`,
    rank: asFiniteNumber(ranking.rank, index + 1),
    teamKey: ranking.team_id || null,
    teamName: ranking.team_name || "—",
    teamScore: asFiniteNumber(ranking.team_score),
    lastSolvedAt: ranking.last_solved_at || null,
    mileage: asFiniteNumber(ranking.mileage),
    solveCount: null,
    categoryScores: null,
    isPreview: false,
  }));
}

export function mergeSolveCounts(rankings, teams, hasApiLeaderboard) {
  if (!hasApiLeaderboard) return rankings;

  const solveCountsByTeam = new Map(
    teams
      .filter((team) => team.teamKey)
      .map((team) => [team.teamKey, team.solves.length]),
  );

  return rankings.map((ranking) => ({
    ...ranking,
    solveCount: ranking.teamKey ? (solveCountsByTeam.get(ranking.teamKey) ?? null) : null,
  }));
}
