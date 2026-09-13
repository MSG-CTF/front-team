function normalizeIdentifier(identifier) {
  return identifier == null ? "" : String(identifier);
}

export function isKothChallengeSolved(challenge) {
  return challenge?.solved_at != null;
}

export function validateKothClubs(data) {
  return Array.isArray(data?.clubs) && data.clubs.every((club) =>
    Array.isArray(club?.challenges)
      ? club.challenges.every((challenge) => challenge?.koth_challenge_id != null)
      : club?.koth_challenge_id != null);
}

export function flattenKothChallenges(clubs = []) {
  return clubs.flatMap((club) => {
    const challenges = Array.isArray(club.challenges) ? club.challenges
      : club.koth_challenge_id != null ? [club] : [];
    return challenges.map((challenge) => ({ ...challenge, club_id: club.club_id, club_name: club.name }));
  }).sort((left, right) =>
    (left.open_group ?? Infinity) - (right.open_group ?? Infinity)
    || normalizeIdentifier(left.koth_challenge_id).localeCompare(normalizeIdentifier(right.koth_challenge_id)));
}

export function getKothConnection(challenge) {
  if (challenge?.status !== "ACTIVE" || typeof challenge.challengeUrl !== "string") return null;
  try {
    const url = new URL(challenge.challengeUrl);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? challenge.challengeUrl : null;
  } catch { return null; }
}

export function createKothChallengeViewModels(visuals, clubs = [], teamChallenges = []) {
  const progressById = new Map(teamChallenges.map((challenge) => [normalizeIdentifier(challenge.koth_challenge_id), challenge]));
  return flattenKothChallenges(clubs).slice(0, visuals.length).map((challenge, index) => {
    const progress = progressById.get(normalizeIdentifier(challenge.koth_challenge_id));
    return {
      ...visuals[index],
      clubId: challenge.club_id, clubName: challenge.club_name,
      kothChallengeId: challenge.koth_challenge_id, title: challenge.title,
      challengeUrl: challenge.challenge_url ?? null,
      status: challenge.status, openGroup: challenge.open_group,
      currentOwnerTeamName: challenge.current_owner_team_name,
      currentScore: challenge.current_score, openedAt: challenge.opened_at, closedAt: challenge.closed_at,
      earnedScore: progress?.earned_score ?? null, rank: progress?.rank ?? null,
      solvedAt: progress?.solved_at ?? null, solved: isKothChallengeSolved(progress),
    };
  });
}

export function getUnmappedKothChallenges(visuals, clubs = []) {
  return flattenKothChallenges(clubs).slice(visuals.length);
}
