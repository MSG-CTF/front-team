import axios from "axios";

// README.md "공통 규약" 참고. Base URL은 /api/v1, 경로 끝 슬래시 없음.
export const ACCESS_TOKEN_STORAGE_KEY = "msgctf_access_token";

const apiClient = axios.create({
  baseURL: "/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TODO: 응답 인터셉터 — 아직 구현 안 함, 토큰 저장/갱신 전략이 정해지면 추가.
// - 401 TOKEN_EXPIRED → POST /auth/refresh로 재발급 후 원 요청 1회 재시도
// - 401 TOKEN_MISSING / TOKEN_INVALID → 재시도 없이 /login으로 이동
// - 403 TEAM_BANNED → 쓰기 요청만 차단(조회는 허용), 프론트는 메시지만 노출
// - HTTP 200이어도 실패일 수 있으므로 성공 판정은 자동으로 하지 않는다.
//   호출부에서 utils/response.js의 isSuccess()로 직접 판정할 것.
// 자세한 규칙은 README.md "공통 규약" 절 참고.

export default apiClient;
