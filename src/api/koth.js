import apiClient from "./client.js";

// KOTH endpoint를 한 곳에서 관리한다. 성공 여부는 각 호출부에서
// 공통 응답 envelope의 code === "SUCCESS"로 판정한다.
export function getKothClubs() {
  return apiClient.get("/koth/clubs");
}

export function getMyKothProgress() {
  return apiClient.get("/koth/me");
}

export function getKothTeamToken() {
  return apiClient.get("/koth/team_token");
}
