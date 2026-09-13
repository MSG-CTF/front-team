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

export function mapTeamProfile(data) {
  const members = Array.isArray(data.members)
    ? data.members
        .map((member) => member?.nickname ? `${member.nickname}${member.is_leader ? " (팀장)" : member.role === "ADMIN" ? " (관리자)" : ""}` : null)
        .filter((nickname) => typeof nickname === "string" && nickname.trim())
        .slice(0, 2)
    : [];

  return {
    teamName: typeof data.team_name === "string" ? data.team_name : null,
    score: Number.isFinite(data.team_score) ? data.team_score : null,
    mileage: Number.isFinite(data.mileage) ? data.mileage : null,
    rank: null,
    jeopardyScore: data.jeopardy_score ?? null,
    kothScore: data.koth_score ?? null,
    isBanned: data.is_banned === true,
    banReason: data.ban_reason ?? null,
    members,
  };
}

export function mapMileageHistory(data) {
  return (Array.isArray(data.history) ? data.history : []).map((entry, index) => ({
    id: entry.history_id ?? `mileage-${index}`,
    date: formatMileageDate(entry.created_at),
    reason:
      [entry.reason || "-", entry.item_name, entry.is_refunded ? "환불 완료" : null].filter(Boolean).join(" / "),
    change: formatSignedNumber(entry.amount),
    // 현재 contract에는 행별 balance가 없다. 현재 mileage에서 역산하지 않는다.
    balance: "—",
  }));
}

// 풀이 기록에서 제공하지 않는 분야와 소요 시간은 추측하지 않는다
// contract에 없는 category/elapsed는 다른 필드로 추측하지 않는다.
export function mapSolveHistory(data) {
  const solves = Array.isArray(data?.solves) ? data.solves : [];

  return solves.map((entry, index) => ({
    id: `${entry.source_type || "JEOPARDY"}:${entry.challenge_id ?? entry.koth_challenge_id ?? index}`,
    sourceType: entry.source_type ?? null,
    solver: entry.solved_by?.nickname ?? null,
    earnedMileage: entry.earned_mileage ?? null,
    extraDiceGranted: entry.is_extra_dice_granted === true,
    challenge: `${entry.source_type === "KOTH" ? "KOTH / " : ""}${entry.challenge_title ?? "—"}`,
    category: null,
    points: formatNumber(entry.earned_score),
    solvedAt: formatMileageDate(entry.solved_at),
    elapsed: null,
  }));
}

export function getQrRemainingSeconds(expiresAt, now = Date.now()) {
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - now) / 1000)) : null;
}
