function normalizeIdentifier(identifier) {
  return identifier == null ? "" : String(identifier);
}

export function isKothChallengeSolved(challenge) {
  return challenge?.solved_at != null;
}

export function flattenKothChallenges(clubs = []) {
  return clubs.flatMap((club) => {
    if (!Array.isArray(club?.challenges)) return [];

    return club.challenges.map((challenge) => ({
      ...challenge,
      club_id: club.club_id,
      club_name: club.name,
    }));
  });
}

export function createKothChallengeViewModels(visuals, clubs = [], teamChallenges = []) {
  const visualsByOpenGroup = new Map(
    visuals.map((visual) => [visual.openGroup, visual]),
  );
  const progressByChallengeId = new Map(
    teamChallenges.map((challenge) => [
      normalizeIdentifier(challenge.koth_challenge_id),
      challenge,
    ]),
  );

  return flattenKothChallenges(clubs).flatMap((challenge) => {
    const visual = visualsByOpenGroup.get(challenge.open_group);
    if (!visual) return [];

    const progress = progressByChallengeId.get(
      normalizeIdentifier(challenge.koth_challenge_id),
    );

    return [{
      ...visual,
      clubId: challenge.club_id,
      clubName: challenge.club_name,
      kothChallengeId: challenge.koth_challenge_id,
      title: challenge.title,
      status: challenge.status,
      openGroup: challenge.open_group,
      currentOwnerTeamName: challenge.current_owner_team_name,
      currentScore: challenge.current_score,
      openedAt: challenge.opened_at,
      closedAt: challenge.closed_at,
      earnedScore: progress?.earned_score ?? null,
      rank: progress?.rank ?? null,
      solvedAt: progress?.solved_at ?? null,
      solved: isKothChallengeSolved(progress),
    }];
  });
}

export function getUnmappedKothChallenges(visuals, clubs = []) {
  const visualOpenGroups = new Set(visuals.map((visual) => visual.openGroup));
  return flattenKothChallenges(clubs).filter(
    (challenge) => !visualOpenGroups.has(challenge.open_group),
  );
}
