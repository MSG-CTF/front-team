import { mapApiResource, keepPreviousResource, scoresMatch } from "../../../utils/resourceSnapshot.js";
import { mapTeamProfile, mapMileageHistory, mapSolveHistory, mapMemberRanking } from "./myPageData.js";
import { isSuccess } from "../../../utils/response.js";

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
  const teamIds = [0, 3, 4].flatMap((index) => {
    const envelope = results[index]?.status === "fulfilled" ? results[index].value?.data : null;
    const teamId = isSuccess(envelope) ? envelope.data?.team_id : null;
    return typeof teamId === "string" && teamId ? [teamId] : [];
  });
  const emptyCurrent = () => Object.fromEntries(SPECS.map(([key]) => [key, { status: "error", data: null, error: true }]));
  // 서로 다른 팀의 응답은 이전 팀 값으로 보완하지 않는다 다음 갱신에서 한 팀으로 확인한다
  if (new Set(teamIds).size > 1) return emptyCurrent();
  const previousTeamId = current.profile.data?.teamId;
  const fallback = previousTeamId && teamIds.some((id) => id !== previousTeamId) ? emptyCurrent() : current;
  const profile = next.profile.data, ranking = next.ranking.data;
  const unranked = profile?.isBanned && next.ranking.status === "empty" && next.memberRanking.status === "empty";
  // 총점·순위·개인 점수는 같은 갱신 묶음으로 반영한다. 서로 다른 시점의 응답도 보류한다.
  if (SCORE_KEYS.some((key) => next[key].error) || (!unranked && (
      !scoresMatch(profile?.score, ranking?.team_score) || !Number.isInteger(ranking?.rank) || ranking.rank < 1 ||
      (profile?.teamId && ranking?.team_id && profile.teamId !== ranking.team_id)))) {
    for (const key of SCORE_KEYS) next[key] = keepPreviousResource(fallback[key]);
  }
  for (const key of ["mileageHistory", "solveHistory"]) {
    if (next[key].error) next[key] = keepPreviousResource(fallback[key]);
  }
  return next;
}
