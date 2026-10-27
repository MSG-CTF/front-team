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

// 참가자 파일: 저장소 prob/for_user 를 묶은 zip 하나 없으면 null
export function kothFile(file) {
  if (!file || typeof file.file_name !== "string" || !file.file_name.trim()) return null;
  return { name: file.file_name, sizeBytes: Number.isFinite(file.size_bytes) && file.size_bytes > 0 ? file.size_bytes : null };
}

export function getKothConnection(challenge) {
  if (challenge?.status !== "ACTIVE" || typeof challenge.challengeUrl !== "string") return null;
  try {
    const url = new URL(challenge.challengeUrl);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? challenge.challengeUrl : null;
  } catch { return null; }
}

export function validateKothClubDetail(data, clubId, challengeId) {
  return data?.club_id === clubId && typeof data.name === "string"
    && Array.isArray(data.challenges) && data.challenge_count === data.challenges.length
    && data.challenges.some((challenge) => challenge?.koth_challenge_id === challengeId
      && ["ACTIVE", "SCHEDULED", "CLOSED"].includes(challenge.status)
      && typeof challenge.title === "string"
      && (challenge.challenge_url === null || typeof challenge.challenge_url === "string"));
}

export function applyKothClubDetail(selected, detail) {
  if (!selected || !validateKothClubDetail(detail, selected.clubId, selected.kothChallengeId)) return null;
  const challenge = detail.challenges.find((entry) => entry.koth_challenge_id === selected.kothChallengeId);
  return { ...selected, clubName: detail.name, title: challenge.title,
    status: challenge.status, challengeUrl: challenge.challenge_url, description: challenge.description ?? selected.description ?? null,
    file: challenge.file === undefined ? selected.file ?? null : kothFile(challenge.file),
    currentOwnerTeamId: challenge.current_owner_team_id ?? null, currentOwnerTeamName: challenge.current_owner_team_name,
    currentScore: challenge.current_score, openedAt: challenge.opened_at, closedAt: challenge.closed_at };
}

// 지도 카드 순서(1~6)나 공개 순번으로 라운드(1~3)를 정한다 둘 다 없으면 1라운드로 둔다
export function kothRound(challenge) {
  const order = Number(challenge?.slot ?? challenge?.openGroup);
  return Number.isFinite(order) && order > 0 ? Math.ceil(order / 2) : 1;
}

export function getKothCardAvailability(challenge, stale = false) {
  if (stale) return { disabled: true, label: "목록을 다시 확인해주세요" };
  if (challenge?.status === "ACTIVE") return { disabled: false, label: "문제 정보" };
  if (challenge?.status === "SCHEDULED") return { disabled: true, label: "아직 열리지 않은 문제" };
  if (challenge?.status === "CLOSED") return { disabled: true, label: "종료된 문제" };
  return { disabled: true, label: "현재 이용할 수 없는 문제" };
}

export function createKothChallengeViewModels(visuals, clubs = [], teamChallenges = []) {
  const progressById = new Map(teamChallenges.map((challenge) => [normalizeIdentifier(challenge.koth_challenge_id), challenge]));
  return flattenKothChallenges(clubs).slice(0, visuals.length).map((challenge, index) => {
    const progress = progressById.get(normalizeIdentifier(challenge.koth_challenge_id));
    return {
      ...visuals[index],
      clubId: challenge.club_id, clubName: challenge.club_name,
      kothChallengeId: challenge.koth_challenge_id, title: challenge.title,
      challengeUrl: challenge.challenge_url ?? null, description: challenge.description ?? null, file: kothFile(challenge.file),
      status: challenge.status, openGroup: challenge.open_group,
      currentOwnerTeamId: challenge.current_owner_team_id ?? null, currentOwnerTeamName: challenge.current_owner_team_name,
      currentScore: challenge.current_score, openedAt: challenge.opened_at, closedAt: challenge.closed_at,
      earnedScore: progress?.earned_score ?? null, rank: progress?.rank ?? null,
      collection: kothCollectionState(progress), lastCollectedAt: progress?.last_collected_at ?? null,
      collectionPeriodId: progress?.collection_period_id ?? null,
      solvedAt: progress?.solved_at ?? null, solved: isKothChallengeSolved(progress),
    };
  });
}

// 점수를 아직 모으지 못한 것과 실제 0점을 구분한다 백엔드가 collection_status / is_stale 로 알려 준다
// 값이 없는 구버전 응답은 수집이 끝난 것으로 본다
const COLLECTION_FAILED = new Set(["FAILED", "FAILURE", "ERROR"]);
const COLLECTION_DONE = new Set(["COLLECTED", "SUCCESS", "SUCCEEDED", "COMPLETED", "OK", "DONE"]);
export function kothCollectionState(progress) {
  const status = typeof progress?.collection_status === "string" ? progress.collection_status.trim().toUpperCase() : "";
  if (COLLECTION_FAILED.has(status)) return "failed";
  if (status && !COLLECTION_DONE.has(status)) return "pending";
  if (progress?.is_stale === true) return "stale";
  return "ready";
}

export function getUnmappedKothChallenges(visuals, clubs = []) {
  return flattenKothChallenges(clubs).slice(visuals.length);
}
