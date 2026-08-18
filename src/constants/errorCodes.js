// README.md "공통 에러 코드" 절을 그대로 옮긴 것.
export const ERROR_CODES = {
  TOKEN_MISSING: { http: 401, message: "로그인이 필요합니다" },
  TOKEN_EXPIRED: { http: 401, message: "세션이 만료되었습니다" },
  TOKEN_INVALID: { http: 401, message: "유효하지 않은 인증 정보입니다" },
  FORBIDDEN: { http: 403, message: "권한이 필요합니다" },
  TEAM_BANNED: { http: 403, message: "활동이 정지된 팀입니다" },
  INVALID_REQUEST: { http: 400, message: "요청 값이 올바르지 않습니다" },
  USER_HAS_NO_TEAM: { http: 404, message: "소속된 팀이 없습니다" },
  INTERNAL_ERROR: { http: 500, message: "서버 오류가 발생했습니다" },
};
