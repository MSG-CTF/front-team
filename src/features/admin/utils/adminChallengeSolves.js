const kstDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function formatSolveTime(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? kstDateTime.format(timestamp) : "—";
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
