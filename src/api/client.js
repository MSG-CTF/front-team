import axios from "axios";

// README.md "공통 규약" 참고. Base URL은 /api/v1, 경로 끝 슬래시 없음.
export const ACCESS_TOKEN_STORAGE_KEY = "msgctf_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "msgctf_refresh_token";

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

let refreshPromise = null;

function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function renewAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error("저장된 refresh token이 없습니다.");
  }

  const response = await apiClient.post(
    "/auth/refresh",
    { refresh_token: refreshToken },
    { skipAuthRefresh: true },
  );
  const envelope = response.data;
  const accessToken = envelope?.data?.access_token;

  if (envelope?.code !== "SUCCESS" || !accessToken) {
    throw new Error("access token 재발급에 실패했습니다.");
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  return accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const code = error.response?.data?.code;

    if (
      code === "TOKEN_EXPIRED" &&
      originalRequest &&
      !originalRequest.retryAfterRefresh &&
      !originalRequest.skipAuthRefresh
    ) {
      originalRequest.retryAfterRefresh = true;
      refreshPromise ??= renewAccessToken().finally(() => {
        refreshPromise = null;
      });

      try {
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredTokens();
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    if (code === "TOKEN_MISSING" || code === "TOKEN_INVALID") {
      clearStoredTokens();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
