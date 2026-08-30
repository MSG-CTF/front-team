import apiClient from "./client.js";

// 리더보드 / 랭킹. 경로와 스키마는 README.md "4. 리더보드 페이지", "5. 랭킹 페이지"
// (Notion API명세서 2026-08-27~29 기준).

export function getLeaderboard() {
  // GET /leaderboard (인증 없음) - 상위 8팀. teams[].team_score / is_top3 / solves[].
  // 밴 팀 + 0솔브 팀 제외. 프론트는 solves를 solved_at 순으로 누적해 그래프.
  return apiClient.get("/leaderboard");
}

export function getRankings({ page = 1, size = 20 } = {}) {
  // GET /ranking (인증 불필요, 2026-08 확정) - 전체 팀 순위. size 최대 100.
  // rankings[]: rank, team_id, team_name, team_score, mileage, last_solved_at.
  // 밴 팀 제외, 0솔브 팀 포함.
  return apiClient.get("/ranking", { params: { page, size } });
}

export function getMyRanking(config) {
  // GET /ranking/me (Bearer, 2026-08-27 비표준 team 헤더에서 변경) - 내 팀 순위 단건.
  // 밴돼서 집계 제외면 200 + data: null.
  return apiClient.get("/ranking/me", config);
}

export function getMyMemberRanking(config) {
  // GET /ranking/member (Bearer) - 개인 순위. 제오파디 개인 점수만(본인 제출 solve).
  // user_score, solved_count, last_solved_at.
  return apiClient.get("/ranking/member", config);
}
