// 타이머 응답 매핑 + 프론트-백엔드 시간 동기화.
//
// README Appendix B #11: GET /timer 응답에는 server_time이 없다(board/dice/status와
// 달리). 그래서 여기서는 axios 응답의 HTTP `Date` 헤더(모든 HTTP 서버가 기본으로
// 내려주는 표준 헤더, RFC 7231)를 서버 시각 대용으로 쓴다. 이 헤더도 없는 경우에만
// 클라이언트 시계를 그대로 쓰는 것으로 낮춰 잡는다(동기화 안 된 근사치임을
// isSynced로 표시). server_time 필드가 추가되면 parseServerTimeFromHeaders만
// 걷어내고 그 필드를 쓰도록 바꾸면 된다.

export function adaptTimer(data) {
  if (!data) return null;

  return {
    name: data.name ?? null,
    status: data.status ?? null,
    startTime: data.start_time ?? null,
    endTime: data.end_time ?? null,
    timeUntilStart: data.time_until_start ?? 0,
    remainingSeconds: data.remaining_seconds ?? 0,
    remainingDisplay: data.remaining_display ?? null,
  };
}

// axios 응답 헤더에서 서버 시각(ms epoch)을 뽑는다. 못 얻으면 null.
export function parseServerTimeFromHeaders(headers) {
  const dateHeader = headers?.date;
  if (!dateHeader) return null;

  const parsed = Date.parse(dateHeader);
  return Number.isFinite(parsed) ? parsed : null;
}

// 응답을 받은 시점의 "서버 시각 스냅샷"을 만든다. receivedAt은 그 응답을 받은
// 클라이언트 시각(performance 기준 아니라 Date.now() - 아래 estimateServerNow가
// 같은 시계로 경과 시간을 재야 하므로).
export function createClockSync(headers, receivedAt = Date.now()) {
  const serverTimeAtReceipt = parseServerTimeFromHeaders(headers);

  return {
    serverTimeAtReceipt: serverTimeAtReceipt ?? receivedAt,
    receivedAt,
    isSynced: serverTimeAtReceipt !== null,
  };
}

// clockSync 기준으로 "지금"의 서버 시각을 추정한다(응답 이후 흐른 시간만큼 더함).
export function estimateServerNow(clockSync, now = Date.now()) {
  if (!clockSync) return now;
  const elapsedSinceResponse = Math.max(0, now - clockSync.receivedAt);
  return clockSync.serverTimeAtReceipt + elapsedSinceResponse;
}

// targetIso(start_time 또는 end_time)까지 남은 초. 서버 시각 추정치 기준이라
// 클라이언트 시계가 어긋나 있어도(예: 로컬 PC 시간이 몇 분 틀린 경우) 정확하다.
export function getRemainingSeconds(targetIso, clockSync, now = Date.now()) {
  if (!targetIso) return 0;

  const targetAt = Date.parse(targetIso);
  if (!Number.isFinite(targetAt)) return 0;

  const estimatedServerNow = estimateServerNow(clockSync, now);
  return Math.max(0, Math.ceil((targetAt - estimatedServerNow) / 1000));
}
