function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function optionalScore(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function adaptLeaderboardTeams(data) {
  if (!Array.isArray(data?.teams)) return [];

  return data.teams.slice(0, 8).map((team, teamIndex) => ({
    key: team.team_id || `leaderboard-team-${teamIndex}`,
    teamKey: team.team_id || null,
    name: team.team_name || "—",
    teamScore: asFiniteNumber(team.team_score),
    isTop3: team.is_top3 === true,
    solvesComplete: Array.isArray(team.solves) && team.solves.every((solve) =>
      asTimestamp(solve.solved_at) !== null && optionalScore(solve.points) !== null &&
      ["JEOPARDY", "KOTH", "SIGNATURE"].includes(solve.source_type)),
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
    signatureScore: optionalScore(ranking.signature_score),
    kothScore: optionalScore(ranking.koth_score),
    categoryScores: null,
    isPreview: false,
  }));
}

export function mergeSolveCounts(rankings, teams, hasApiLeaderboard) {
  if (!hasApiLeaderboard) return rankings;

  const detailsByTeam = new Map(
    teams
      .filter((team) => team.teamKey)
      .map((team) => [team.teamKey, {
        solveCount: team.solves.length,
        teamScore: team.teamScore,
        signatureScore: team.solvesComplete ? team.solves.filter((solve) => solve.sourceType === "SIGNATURE").reduce((sum, solve) => sum + solve.points, 0) : null,
        kothScore: team.solvesComplete ? team.solves.filter((solve) => solve.sourceType === "KOTH").reduce((sum, solve) => sum + solve.points, 0) : null,
      }]),
  );

  return rankings.map((ranking) => {
    const detail = ranking.teamKey ? detailsByTeam.get(ranking.teamKey) : null;
    const sameTotal = detail && detail.teamScore === ranking.teamScore;
    return {
      ...ranking,
      solveCount: detail?.solveCount ?? null,
      signatureScore: ranking.signatureScore ?? (sameTotal ? detail.signatureScore : null),
      kothScore: ranking.kothScore ?? (sameTotal ? detail.kothScore : null),
    };
  });
}
