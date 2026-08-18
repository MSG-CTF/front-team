// TODO: README.md에 정확한 API 경로가 아직 명시 안 됨. /admin/** 이하로 예상되나
// 밴 체크 인터셉터가 이 prefix에는 적용되지 않는다는 것 외엔 확정된 바 없음.
// 참고: "8. 관리자 페이지"

export function getAdminTeams() {
  throw new Error("getAdminTeams: API 경로 미정");
}

export function getAdminTeamDetail(teamId) {
  throw new Error("getAdminTeamDetail: API 경로 미정");
}

export function getAdminChallenges() {
  throw new Error("getAdminChallenges: API 경로 미정");
}

export function grantMileage(teamId, payload) {
  throw new Error("grantMileage: API 경로 미정");
}

export function deductMileage(teamId, payload) {
  throw new Error("deductMileage: API 경로 미정");
}

export function banTeam(teamId) {
  throw new Error("banTeam: API 경로 미정");
}
