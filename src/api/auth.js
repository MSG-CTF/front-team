import apiClient, { clearStoredTokens, REFRESH_TOKEN_STORAGE_KEY } from "./client.js";
import { isSuccess } from "../utils/response.js";

// 인증. 경로와 스키마는 README.md "1. 로그인 페이지(인증)"(Notion API명세서 기준).

export function login({ loginId, password }) {
  // POST /auth/login - Res에 access_token/refresh_token + role/is_leader/nickname/team_*
  // + is_banned/ban_reason(밴 팀도 로그인 허용, 직후 안내용).
  // 401 INVALID_CREDENTIALS(아이디/비번 구분 안 함), 429 TOO_MANY_REQUESTS(login_id 기준, 남은 시간은 Retry-After 헤더).
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

// 로그아웃 버튼(관리자/참가자 화면 공용)이 공유하는 플로우. 서버가 refresh_token을
// 폐기하지 못하면 마이페이지와 같이 로그인 상태를 두고 알림창으로 알린 뒤 다시
// 시도하게 한다. 로그인 화면은 ROUTES에 없는 하드코딩 예외라(client.js의 401
// 인터셉터와 동일하게) window.location으로 이동한다.
let logoutPending = false;
export async function performLogout() {
  if (logoutPending) return;
  logoutPending = true;
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) {
      const response = await logout({ refreshToken });
      if (!isSuccess(response?.data)) throw Object.assign(new Error(), { serverMessage: response?.data?.message });
    }
    clearStoredTokens();
    window.location.assign("/login");
  } catch (error) {
    window.alert(error?.response?.data?.message || error?.serverMessage || "로그아웃에 실패했습니다 잠시 후 다시 시도해주세요");
  } finally {
    logoutPending = false;
  }
}
