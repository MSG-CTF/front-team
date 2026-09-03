// 타이머 응답 매핑 + 프론트-백엔드 시간 동기화.
// board/dice/status(boardData.js의 getRemainingSeconds)와 동일한 패턴이다:
// 서버가 응답에 담아 보내는 server_time과, 그 응답을 받은 클라이언트 시각
// (receivedAt)의 차이를 이용해 "지금"의 서버 시각을 추정한다. 클라이언트
// PC 시계가 실제와 몇 분 어긋나 있어도 카운트다운은 정확하다.
//
// (참고: 2026-09-03 Notion API명세서에 server_time 필드가 추가되면서
// README Appendix B #11("GET /timer에 server_time 없음")이 해소됐다.
// 그 전까지는 HTTP 응답의 Date 헤더로 대신했는데, 이제 board와 동일하게
// 응답 바디의 server_time을 직접 쓴다.)

export function adaptTimer(data, receivedAt = Date.now()) {
  if (!data) return null;

  return {
    name: data.name ?? null,
    status: data.status ?? null,
    startTime: data.start_time ?? null,
    endTime: data.end_time ?? null,
    timeUntilStart: data.time_until_start ?? 0,
    remainingSeconds: data.remaining_seconds ?? 0,
    remainingDisplay: data.remaining_display ?? null,
    serverTime: data.server_time ?? null,
    receivedAt,
  };
}

// targetIso(start_time 또는 end_time)까지 남은 초.
// contest.serverTime이 없으면(구버전 백엔드 등) receivedAt을 그대로 서버
// 시각으로 간주한다 - 동기화가 안 된 것이므로 클라이언트 시계에 의존한다.
export function getRemainingSeconds(targetIso, contest, now = Date.now()) {
  if (!targetIso || !contest) return 0;

  const targetAt = Date.parse(targetIso);
  if (!Number.isFinite(targetAt)) return 0;

  const serverAt = contest.serverTime ? Date.parse(contest.serverTime) : contest.receivedAt;
  const baseServerTime = Number.isFinite(serverAt) ? serverAt : contest.receivedAt;

  const elapsedSinceResponse = Math.max(0, now - contest.receivedAt);
  const estimatedServerNow = baseServerTime + elapsedSinceResponse;

  return Math.max(0, Math.ceil((targetAt - estimatedServerNow) / 1000));
}
