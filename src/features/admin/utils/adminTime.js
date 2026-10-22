// 관리자 표의 시각은 24시간제 고정 폭으로 보여서 줄마다 자릿수가 같은 위치에 선다
// 서버 시각은 ISO-8601 UTC로 오고 화면은 KST로 바꿔 보인다
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatAdminTime(isoUtc, { year = false, seconds = true } = {}) {
  if (!isoUtc) return "-";
  const date = new Date(isoUtc);
  if (!Number.isFinite(date.getTime())) return "-";
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const day = `${year ? `${parts.year}-` : ""}${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}${seconds ? `:${parts.second}` : ""}`;
  return `${day} ${time}`;
}
