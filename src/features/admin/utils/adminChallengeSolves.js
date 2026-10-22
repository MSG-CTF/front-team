const kstDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function formatSolveTime(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? kstDateTime.format(timestamp) : "-";
}

export function solveHourLabel(start, end) {
  const first = formatSolveTime(start);
  const last = formatSolveTime(end);
  return `${first.slice(5, 16)} ~ ${last.slice(11, 16)}`;
}

function kstToIso(value) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("날짜와 시각을 확인해주세요");
  const date = new Date(`${value}:00+09:00`);
  if (!Number.isFinite(date.getTime()) || formatSolveTime(date.toISOString()).slice(0, 16).replace(" ", "T") !== value) {
    throw new Error("날짜와 시각을 확인해주세요");
  }
  return date.toISOString();
}

export function solvePeriodQuery(start, end) {
  const startAt = kstToIso(start);
  const endAt = kstToIso(end);
  if (startAt && endAt && startAt >= endAt) throw new Error("조회 종료는 시작보다 늦어야 합니다");
  return { startAt, endAt };
}

// 빠른 조회: 지금 기준으로 최근 몇 시간 또는 오늘 0시부터, 끝은 비워 지금까지 본다
const MINUTE = 60_000;
export const SOLVE_QUICK_RANGES = [
  { key: "1h", label: "최근 1시간" },
  { key: "3h", label: "최근 3시간" },
  { key: "today", label: "오늘" },
];

function kstInputValue(timestamp) {
  return formatSolveTime(new Date(timestamp).toISOString()).slice(0, 16).replace(" ", "T");
}

export function quickSolveRange(key, now = Date.now()) {
  const minute = Math.floor(now / MINUTE) * MINUTE;
  if (key === "1h") return { start: kstInputValue(minute - 60 * MINUTE), end: "" };
  if (key === "3h") return { start: kstInputValue(minute - 180 * MINUTE), end: "" };
  if (key === "today") return { start: `${kstInputValue(minute).slice(0, 10)}T00:00`, end: "" };
  throw new Error("알 수 없는 조회 범위입니다");
}
