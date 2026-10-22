// 대회 시작 전에는 참가자가 게임 화면(보드, 문제, 시그니처, KoTH, 순위)에 들어가지 못하게 한다
// 규칙, 타이머, 마이페이지는 시작 전에도 열고, 관리자는 확인을 위해 언제든 들어간다
// 타이머를 불러오지 못하면 막지 않는다 서버가 따로 막을 수 있고, 화면이 멈추는 쪽이 더 나쁘다

export const GATED_PREFIXES = ["/board", "/challenges", "/signatures", "/koth", "/leaderboard"];

export function isGatedPath(pathname) {
  const path = String(pathname ?? "");
  return GATED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// timer: GET /timer 의 data (없으면 null), offsetMs: 서버 시각 - 기기 시각
export function contestGateState({ timer, role, pathname, now = Date.now(), offsetMs = 0 }) {
  if (role === "ADMIN" || !isGatedPath(pathname) || !timer) return { blocked: false };
  const start = Date.parse(timer.start_time);
  const serverNow = now + offsetMs;
  const before = String(timer.status ?? "").toUpperCase() === "BEFORE" && (!Number.isFinite(start) || serverNow < start);
  if (!before) return { blocked: false };
  return {
    blocked: true,
    startTime: Number.isFinite(start) ? timer.start_time : null,
    secondsLeft: Number.isFinite(start) ? Math.max(0, Math.ceil((start - serverNow) / 1000)) : null,
    name: timer.name ?? "",
  };
}

export function formatWaiting(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const clock = [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
  return days > 0 ? `${days}일 ${clock}` : clock;
}
