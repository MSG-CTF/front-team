import apiClient from "./client.js";

// 타이머 페이지 - README.md "7. 타이머 페이지".

export function getTimer() {
  // GET /timer (인증 없음)
  // { name, status, start_time, end_time, time_until_start,
  //   remaining_seconds, remaining_display, server_time }.
  // status: BEFORE/RUNNING/ENDED. 활성 대회 없음 -> 200 + data: null
  // (404 아님, README 0-2절). server_time은 2026-09-03 Notion API명세서
  // 갱신으로 추가됨(README Appendix B #11 해소) - board/dice/status와
  // 동일하게 이 값으로 클라이언트-서버 시계 오차를 보정한다(timerData.js).
  return apiClient.get("/timer");
}
