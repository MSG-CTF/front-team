import apiClient from "./client.js";

// 타이머 페이지 - README.md "7. 타이머 페이지".

export function getTimer() {
  // GET /timer (인증 없음)
  // { name, status, start_time, end_time, time_until_start,
  //   remaining_seconds, remaining_display }. status: BEFORE/RUNNING/ENDED.
  // 활성 대회 없음 -> 200 + data: null(404 아님, README 0-2절).
  // 주의: server_time/contest_id 필드가 없다(README Appendix B #11, 여전히
  // 미해결). board/dice/status와 달리 응답 바디로 서버 시각을 못 받으므로,
  // timerData.js의 시간 동기화는 이 응답의 HTTP Date 헤더를 대신 쓴다.
  return apiClient.get("/timer");
}
