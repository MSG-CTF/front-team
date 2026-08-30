import apiClient from "./client.js";

// KOTH 페이지. 경로와 스키마는 README.md "9. KOTH 페이지"(Notion API명세서 2026-08-23 기준).
// 구조 변경: 6클럽 x 1문제 -> 3동아리 x 2문제. clubs[].challenges[] 로 중첩됨.
// GET /koth/leaderboard 는 삭제됨(전체 순위는 api/leaderboard.js getRankings).
// 전부 백엔드 "시작 전" 상태라 연동 시 재확인.

export function getKothClubs() {
  // GET /koth/clubs (인증 없음) - clubs[{club_id, name, challenges[{koth_challenge_id,
  // title, status, open_group, current_owner_*, current_score, ...}]}], total_count(=동아리 수),
  // challenge_count, active_count. KOTH 문제엔 category 없음.
  return apiClient.get("/koth/clubs");
}

export function getKothClub(clubId) {
  // GET /koth/clubs/{club_id} (인증 없음) - 동아리 1개 + challenges[] + challenge_count.
  return apiClient.get(`/koth/clubs/${clubId}`);
}

export function getMyKothProgress() {
  // GET /koth/me (Bearer) - total_koth_score + challenges[{koth_challenge_id, earned_score,
  // rank, solved_at, ...}] 항상 6개. 전체 팀 순위는 여기서 안 줌.
  return apiClient.get("/koth/me");
}

export function getKothTeamToken() {
  // GET /koth/team_token (Bearer) - 외부 KOTH 문제 서버에 입력할 팀 토큰(로그인 JWT와 무관).
  return apiClient.get("/koth/team_token");
}
