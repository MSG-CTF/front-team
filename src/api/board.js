import apiClient from "./client.js";

// 팀장만 호출 가능 (README.md "팀장 권한 판정") — 팀장이 아니면 403 NOT_TEAM_LEADER.
export function rollDice() {
  return apiClient.post("/board/dice");
}

export function moveAirport(payload) {
  return apiClient.post("/board/airport/move", payload);
}

export function useChanceCard(payload) {
  return apiClient.post("/board/chance/use", payload);
}

export function spinRoulette() {
  return apiClient.post("/board/roulette/spin");
}

// TODO: 보드판 조회 GET 엔드포인트 경로가 README.md에 아직 명시 안 됨.
export function getBoard() {
  throw new Error("getBoard: API 경로 미정 (README.md에 명세 추가 필요)");
}
