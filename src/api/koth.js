import apiClient from "./client.js";

// README.md "9. KOTH 페이지"의 endpoint를 한 곳에서 관리한다.
// KOTH 메인 화면의 1차 구현에서는 백엔드가 준비되지 않아 호출하지 않으며,
// 연동 시 아래 함수의 응답 data만 feature 내부 view model로 변환한다.
export function getKothClubs() {
  return apiClient.get("/koth/clubs");
}

export function getMyKothProgress() {
  return apiClient.get("/koth/me");
}
