import apiClient from "./client.js";

// 인증. 경로와 스키마는 README.md "1. 로그인 페이지(인증)"(Notion API명세서 기준).

export function login({ loginId, password }) {
  // POST /auth/login - Res에 access_token/refresh_token + role/is_leader/nickname/team_*
  // + is_banned/ban_reason(밴 팀도 로그인 허용, 직후 안내용).
  // 401 INVALID_CREDENTIALS(아이디/비번 구분 안 함), 429 TOO_MANY_REQUESTS(IP+login_id 분당 10회).
  return apiClient.post("/auth/login", { login_id: loginId, password });
}

export function refresh({ refreshToken }) {
  // POST /auth/refresh - Res { access_token }(1시간). refresh_token은 재발급 안 함.
  return apiClient.post(
    "/auth/refresh",
    { refresh_token: refreshToken },
    { skipAuthRefresh: true },
  );
}

export function logout({ refreshToken }) {
  // POST /auth/logout (Bearer) - 서버가 DB에서 refresh_token 삭제.
  return apiClient.post("/auth/logout", { refresh_token: refreshToken });
}

export function getMe(config) {
  // GET /auth/me (Bearer) - { user_id, nickname, is_leader, team_id, team_name, role }.
  return apiClient.get("/auth/me", config);
}
