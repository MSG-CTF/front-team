import apiClient from "./client.js";

// KOTH endpoint를 한 곳에서 관리한다.
// 성공 여부는 각 호출부에서 공통 응답 envelope의 code === "SUCCESS"로 판정한다.
// 실제 KOTH 문제는 clubs[].challenges[] 중첩 구조를 사용한다.
// 폐기된 /koth/leaderboard 경로는 사용하지 않는다.

export function getKothClubs() {
  // GET /koth/clubs (인증 없음)
  // clubs[{club_id, name, challenges[{koth_challenge_id,
  // title, status, open_group, current_owner_*, current_score, ...}]}],
  // total_count, challenge_count, active_count
  return apiClient.get("/koth/clubs");
}

export function getKothClub(clubId) {
  // GET /koth/clubs/{club_id} (인증 없음)
  // 동아리 1개 + challenges[] + challenge_count
  return apiClient.get(`/koth/clubs/${clubId}`);
}

export function getMyKothProgress() {
  // GET /koth/me (Bearer)
  // total_koth_score + challenges[{koth_challenge_id, earned_score,
  // rank, solved_at, ...}]
  return apiClient.get("/koth/me");
}

export function getKothTeamToken() {
  // GET /koth/team_token (Bearer)
  // 외부 KOTH 문제 서버에 입력할 팀 토큰이며 로그인 JWT와는 별도 값이다.
  return apiClient.get("/koth/team_token");
}