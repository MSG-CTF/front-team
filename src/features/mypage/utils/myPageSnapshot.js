import { mapApiResource, keepPreviousResource, scoresMatch } from "../../../utils/resourceSnapshot.js";
import { mapTeamProfile, mapMileageHistory, mapSolveHistory, mapMemberRanking } from "./myPageData.js";

const SPECS = [
  ["profile", mapTeamProfile], ["mileageHistory", mapMileageHistory],
  ["solveHistory", mapSolveHistory], ["ranking", (data) => data],
  ["memberRanking", mapMemberRanking],
];
const SCORE_KEYS = ["profile", "ranking", "memberRanking"];

const NO_TEAM_CODE = "USER_HAS_NO_TEAM";

function isNoTeam(result) {
  return result?.status === "rejected" && result.reason?.response?.data?.code === NO_TEAM_CODE;
}

// 소속 팀이 없는 것은 오류가 아니다. 이전 팀의 점수를 남기지 않고 팀 없음으로 보여준다
function noTeamSnapshot() {
  const noTeam = { status: "noTeam", data: null, error: false };
  const empty = { status: "empty", data: null, error: false };
  return { profile: noTeam, mileageHistory: empty, solveHistory: empty, ranking: noTeam, memberRanking: noTeam };
}


export function updateMyPageSnapshot(current, results) {
  if (isNoTeam(results[0])) return noTeamSnapshot();
  const next = Object.fromEntries(SPECS.map(([key, mapper], index) => [key, mapApiResource(results[index], mapper)]));
  const profile = next.profile.data, ranking = next.ranking.data;
  const unranked = profile?.isBanned && next.ranking.status === "empty" && next.memberRanking.status === "empty";
  // 총점·순위·개인 점수는 같은 갱신 묶음으로 반영한다. 서로 다른 시점의 응답도 보류한다.
  if (SCORE_KEYS.some((key) => next[key].error) || (!unranked && (
      !scoresMatch(profile?.score, ranking?.team_score) || !Number.isInteger(ranking?.rank) || ranking.rank < 1 ||
      (profile?.teamId && ranking?.team_id && profile.teamId !== ranking.team_id)))) {
    for (const key of SCORE_KEYS) next[key] = keepPreviousResource(current[key]);
  }
  for (const key of ["mileageHistory", "solveHistory"]) {
    if (next[key].error) next[key] = keepPreviousResource(current[key]);
  }
  return next;
}
