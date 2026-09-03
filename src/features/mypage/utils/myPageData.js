import { toKst } from "../../../utils/time.js";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

export function formatNumber(value) {
  return Number.isFinite(value) ? NUMBER_FORMATTER.format(value) : "—";
}

export function formatSignedNumber(value) {
  if (!Number.isFinite(value)) return "—";
  const formatted = NUMBER_FORMATTER.format(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function kstParts(isoUtc, options) {
  const formatted = toKst(isoUtc, options);
  return formatted.match(/\d+/g) ?? [];
}

function formatMileageDate(isoUtc) {
  const [month, day, hour, minute] = kstParts(isoUtc, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (!minute) return "—";
  return `${month}-${day} ${hour}:${minute}`;
}

function formatSolveTime(isoUtc) {
  const [hour, minute] = kstParts(isoUtc, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return minute ? `${hour}:${minute}` : "—";
}

export function mapTeamProfile(data) {
  const members = Array.isArray(data.members)
    ? data.members
        .map((member) => member?.nickname)
        .filter((nickname) => typeof nickname === "string" && nickname.trim())
        .slice(0, 2)
    : [];

  return {
    teamName: typeof data.team_name === "string" ? data.team_name : null,
    score: Number.isFinite(data.team_score) ? data.team_score : null,
    mileage: Number.isFinite(data.mileage) ? data.mileage : null,
    rank: null,
    members,
  };
}

export function mapMileageHistory(data) {
  return data.history.slice(0, 3).map((entry, index) => ({
    id: entry.history_id ?? `mileage-${index}`,
    date: formatMileageDate(entry.created_at),
    reason:
      typeof entry.reason === "string" && entry.reason.trim() ? entry.reason : "—",
    change: formatSignedNumber(entry.amount),
    // 현재 contract에는 행별 balance가 없다. 현재 mileage에서 역산하지 않는다.
    balance: "—",
  }));
}

// GET /teams/me/solves가 연결 가능한 시점에 사용할 최소 변환이다.
// contract에 없는 category/elapsed는 다른 필드로 추측하지 않는다.
export function mapSolveHistory(data) {
  const solves = Array.isArray(data?.solves) ? data.solves : [];

  return solves.slice(0, 3).map((entry, index) => ({
    id: entry.challenge_id ?? `solve-${index}`,
    challenge: entry.challenge_title ?? "—",
    category: null,
    points: formatNumber(entry.earned_score),
    solvedAt: formatSolveTime(entry.solved_at),
    elapsed: null,
  }));
}
