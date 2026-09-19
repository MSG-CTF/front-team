const DAY_MS = 86400000;
const KOREA_OFFSET = 9 * 3600000;
const koreaDate = (ms) =>
  new Date(ms + KOREA_OFFSET).toISOString().slice(0, 10);

function dateValue(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === date
    ? parsed
    : NaN;
}

export function getCountdown(event, now = Date.now()) {
  const date = dateValue(event?.date);
  if (
    !Number.isFinite(date) ||
    !Number.isFinite(now) ||
    Math.abs(now) > 8640000000000000 - KOREA_OFFSET
  )
    return null;
  const start =
    typeof event.startsAt === "string" && /(?:Z|\+09:00)$/.test(event.startsAt)
      ? Date.parse(event.startsAt)
      : NaN;
  if (Number.isFinite(start) && koreaDate(start) === event.date) {
    if (now >= start) return { mode: "message", text: "대회가 시작됐습니다" };
    const seconds = Math.ceil((start - now) / 1000);
    return {
      mode: "exact",
      days: Math.floor(seconds / 86400),
      hours: Math.floor(seconds / 3600) % 24,
      minutes: Math.floor(seconds / 60) % 60,
      seconds: seconds % 60,
    };
  }
  const days = Math.round((date - dateValue(koreaDate(now))) / DAY_MS);
  if (days === 0) return { mode: "message", text: "오늘 대회가 열립니다" };
  if (days < 0) return { mode: "message", text: "대회 날짜가 지났습니다" };
  return { mode: "days", days };
}

export function getPrizes(value) {
  if (
    value?.confirmed !== true ||
    !Number.isSafeInteger(value.totalKrw) ||
    value.totalKrw <= 0 ||
    !Array.isArray(value.tracks) ||
    !value.tracks.length
  )
    return null;
  if (
    value.tracks.some(
      (row) =>
        typeof row?.label !== "string" ||
        !row.label.trim() ||
        !Array.isArray(row.amounts) ||
        row.amounts.length !== 3 ||
        row.amounts.some(
          (amount) => !Number.isSafeInteger(amount) || amount <= 0,
        ),
    )
  )
    return null;
  const labels = value.tracks.map((row) => row.label.trim());
  if (new Set(labels).size !== labels.length) return null;
  if (
    value.tracks.reduce(
      (sum, row) =>
        sum + row.amounts.reduce((subtotal, amount) => subtotal + amount, 0),
      0,
    ) !== value.totalKrw
  )
    return null;
  return {
    total: value.totalKrw,
    tracks: value.tracks.map((row) => ({
      label: row.label.trim(),
      amounts: [...row.amounts],
    })),
  };
}

export function getEventLabels(event) {
  const date = dateValue(event?.date);
  if (!Number.isFinite(date))
    return {
      fullDate: "추후 안내",
      shortDate: "추후 안내",
      startTime: "시작 시각 추후 안내",
    };
  const options = {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  };
  const start =
    typeof event.startsAt === "string" && /(?:Z|\+09:00)$/.test(event.startsAt)
      ? Date.parse(event.startsAt)
      : NaN;
  const confirmedTime =
    Number.isFinite(start) && koreaDate(start) === event.date;
  const koreanStart = confirmedTime ? new Date(start + KOREA_OFFSET) : null;
  const hour = koreanStart?.getUTCHours();
  const minute = koreanStart?.getUTCMinutes();
  return {
    fullDate: new Intl.DateTimeFormat("ko-KR", {
      ...options,
      year: "numeric",
    }).format(date),
    shortDate: new Intl.DateTimeFormat("ko-KR", options).format(date),
    startTime: confirmedTime
      ? `${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시${minute ? ` ${minute}분` : ""} 시작`
      : "시작 시각 추후 안내",
  };
}

export const formatWon = (amount) =>
  amount % 10000 === 0
    ? `${(amount / 10000).toLocaleString("ko-KR")}만원`
    : `${amount.toLocaleString("ko-KR")}원`;
