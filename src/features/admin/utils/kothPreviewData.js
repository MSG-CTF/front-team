import { createKothChallengeViewModels, flattenKothChallenges } from "../../koth/utils/kothChallengeState.js";

export function kothPreviewModels(visuals, challenges, liveClubs, progress) {
  const live = new Map(flattenKothChallenges(liveClubs).map((item) => [item.koth_challenge_id, item]));
  const clubs = new Map();
  for (const item of challenges) {
    if (!clubs.has(item.club_id)) clubs.set(item.club_id, { club_id: item.club_id, name: item.club_name, challenges: [] });
    const current = live.get(item.koth_challenge_id);
    // 공개 전 주소·지문은 관리자 응답을 쓰고 점령 팀과 점수만 최신 목록에서 읽는다
    clubs.get(item.club_id).challenges.push(current ? { ...item,
      current_owner_team_id: current.current_owner_team_id,
      current_owner_team_name: current.current_owner_team_name,
      current_score: current.current_score,
    } : item);
  }
  const teamChallenges = Array.isArray(progress?.challenges) ? progress.challenges
    : challenges.map((item) => ({ koth_challenge_id: item.koth_challenge_id, collection_status: "PENDING" }));
  return createKothChallengeViewModels(visuals, [...clubs.values()], teamChallenges);
}
