import { formatAdminTime } from "./adminTime.js";

const ENDED = ["ENDED", "FINISHED", "CLOSED", "COMPLETED"];

// 남은 시간은 시:분:초 자릿수를 고정해 1초마다 바뀌어도 글자 폭이 흔들리지 않는다
export function formatCountdown(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

const at = (iso) => formatAdminTime(iso, { seconds: false });

// 대시보드 contest 값으로 대회 시간 위젯을 채운다: 시작 전 / 진행 중 / 종료
// progress는 대회 시간 중 지난 비율(0~1)이라 진행 막대에 그대로 쓴다
export function describeContest(contest, now = Date.now()) {
  if (!contest) return { label: "대회 시간", value: "-", sub: "", tone: undefined, text: true, progress: null };
  const start = Date.parse(contest.start_time);
  const end = Date.parse(contest.end_time);
  const status = String(contest.status ?? "").toUpperCase();
  const ended = ENDED.includes(status);
  const span = Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : null;
  const range = Number.isFinite(start) && Number.isFinite(end) ? `${at(contest.start_time)} ~ ${at(contest.end_time)}` : "";
  if (!ended && Number.isFinite(start) && now < start) {
    return { label: "대회 시작 전", value: formatCountdown((start - now) / 1000), sub: `시작 ${at(contest.start_time)}`, tone: "gold", progress: 0, range };
  }
  if (!ended && Number.isFinite(end) && now < end) {
    return {
      label: "대회 진행 중", value: formatCountdown((end - now) / 1000), sub: `종료 ${at(contest.end_time)}`, tone: "good",
      progress: span ? Math.min(1, Math.max(0, (now - start) / span)) : null, range,
    };
  }
  if (!ended && !Number.isFinite(end) && Number(contest.remaining_seconds) > 0) {
    return { label: "대회 진행 중", value: formatCountdown(contest.remaining_seconds), sub: "", tone: "good", progress: null, range };
  }
  return { label: "대회 종료", value: "종료", sub: Number.isFinite(end) ? `종료 ${at(contest.end_time)}` : "", tone: "bad", text: true, progress: 1, range };
}
