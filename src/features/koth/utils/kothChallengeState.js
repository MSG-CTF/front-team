function normalizeTitle(title) {
  return typeof title === "string" ? title.trim().toUpperCase() : "";
}

export function isKothChallengeSolved(challenge) {
  return challenge?.solved_at != null;
}

export function createKothChallengeViewModels(visuals, clubs = [], teamChallenges = []) {
  const clubsByTitle = new Map(
    clubs.map((club) => [normalizeTitle(club.title), club]),
  );
  const progressByChallengeId = new Map(
    teamChallenges.map((challenge) => [challenge.koth_challenge_id, challenge]),
  );

  return visuals.map((visual) => {
    const club = clubsByTitle.get(normalizeTitle(visual.title));
    const progress = club
      ? progressByChallengeId.get(club.koth_challenge_id)
      : undefined;

    return {
      ...visual,
      clubId: club?.club_id ?? null,
      kothChallengeId: club?.koth_challenge_id ?? null,
      solved: isKothChallengeSolved(progress),
    };
  });
}

export function getKothStampVisibility(stamps, progressByStampKey = {}) {
  return Object.fromEntries(
    stamps.map(({ stampKey }) => [stampKey, Boolean(progressByStampKey[stampKey])]),
  );
}
