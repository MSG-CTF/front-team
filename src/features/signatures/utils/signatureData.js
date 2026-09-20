const CLUB_LOGOS = {
  mjsec: "mjsec",
  swing: "swing",
  ycert: "ycert",
  sekurity: "sekurity",
  codecure: "codecure",
  aegis: "aegis",
};

export function getClubLogo(name) {
  const key =
    typeof name === "string" ? name.toLowerCase().replace(/[\s-]/g, "") : "";
  return Object.hasOwn(CLUB_LOGOS, key)
    ? `/assets/intro/club-${CLUB_LOGOS[key]}.svg`
    : null;
}

const nonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;
const validDate = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export function isSignatureSummary(value) {
  return (
    nonEmptyString(value?.signature_id) &&
    nonEmptyString(value.club_id) &&
    nonEmptyString(value.club_name) &&
    nonEmptyString(value.title) &&
    Number.isFinite(value.score) &&
    value.score > 0 &&
    typeof value.is_solved === "boolean" &&
    (value.solved_at === null || validDate(value.solved_at)) &&
    Number.isInteger(value.solved_team_count) &&
    value.solved_team_count >= 0
  );
}

export function parseSignatureList(data) {
  if (
    !Array.isArray(data?.signatures) ||
    !data.signatures.every(isSignatureSummary) ||
    data.total_count !== data.signatures.length ||
    new Set(data.signatures.map((entry) => entry.signature_id)).size !==
      data.signatures.length
  ) {
    throw new Error("부스 문제 목록 응답을 확인하지 못했습니다");
  }
  return data.signatures;
}

export function parseSignatureDetail(data, signatureId) {
  if (
    !isSignatureSummary(data) ||
    data.signature_id !== signatureId ||
    typeof data.description !== "string"
  ) {
    throw new Error("부스 문제 응답을 확인하지 못했습니다");
  }
  return data;
}

export function getSignatureError(code) {
  const messages = {
    USER_HAS_NO_TEAM: "소속된 팀이 없습니다 운영자에게 문의해주세요",
    SIGNATURE_NOT_FOUND: "문제가 없거나 현재 공개되어 있지 않습니다",
    INVALID_REQUEST: "플래그를 확인해주세요 최대 512자까지 제출할 수 있습니다",
    INCORRECT_FLAG: "정답이 아닙니다 플래그를 다시 확인해주세요",
    ALREADY_SOLVED: "우리 팀이 이미 해결한 문제입니다",
    TOO_MANY_ATTEMPTS: "연속 오답으로 제출이 잠시 제한됐습니다",
    TOKEN_MISSING: "로그인이 필요합니다",
    TOKEN_EXPIRED: "로그인이 만료됐습니다 다시 로그인해주세요",
    TOKEN_INVALID: "다시 로그인해주세요",
    TEAM_BANNED: "활동이 정지된 팀입니다 운영자에게 문의해주세요",
  };
  return Object.hasOwn(messages, code)
    ? messages[code]
    : "응답을 확인하지 못했습니다 잠시 후 다시 시도해주세요";
}

export function signatureSubmitFeedback(envelope, signatureId, clubId) {
  const code = envelope?.code;
  if (code === "SUCCESS") {
    const data = envelope.data;
    if (
      data?.signature_id !== signatureId ||
      data.club_id !== clubId ||
      !Number.isFinite(data.earned_score) ||
      data.earned_score <= 0 ||
      !Number.isFinite(data.team_score) ||
      !validDate(data.solved_at)
    ) {
      return {
        type: "error",
        code: "UNKNOWN_RESULT",
        message: "제출 결과를 확인하지 못해 풀이 기록을 다시 확인합니다",
      };
    }
    // 시그니처 보상은 점수만 표시하고 일반 문제의 마일리지·주사위 보상과 섞지 않는다
    return {
      type: "success",
      code,
      message: "정답입니다 팀 점수에 반영됐습니다",
      data: {
        earned_score: data.earned_score,
        team_score: data.team_score,
        solved_at: data.solved_at,
      },
    };
  }
  return {
    type: code === "ALREADY_SOLVED" ? "success" : "error",
    code: code || "UNKNOWN_RESULT",
    message: getSignatureError(code),
  };
}

export function getSignatureLockUntil(envelope, now = Date.now()) {
  if (envelope?.code !== "TOO_MANY_ATTEMPTS") return 0;
  const seconds = envelope.data?.retry_after_seconds;
  return (
    now +
    (Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30) * 1000
  );
}

export function getSignatureRetrySeconds(lockedUntil, now = Date.now()) {
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}
