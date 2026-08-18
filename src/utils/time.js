// 서버 시간은 전부 ISO-8601 UTC(끝에 Z)로 온다. 표시용 KST 변환은 프론트 책임.
export function toKst(isoUtc, options = {}) {
  if (!isoUtc) return "";
  return new Date(isoUtc).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    ...options,
  });
}

// 인스턴스 TTL 잔여 시간(초)을 "H:MM:SS" / "MM:SS" 문자열로 표시.
// remaining_seconds는 RUNNING 상태일 때만 유효하므로 null/undefined면 "--:--".
export function formatRemaining(remainingSeconds) {
  if (remainingSeconds == null || remainingSeconds < 0) return "--:--";
  const total = Math.floor(remainingSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
