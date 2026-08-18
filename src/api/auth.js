import apiClient from "./client.js";

// 요청/응답 필드명은 README.md에 아직 명시되어 있지 않음 — 백엔드 명세 확정되면 채울 것.
export function login(credentials) {
  return apiClient.post("/auth/login", credentials);
}

export function refresh() {
  return apiClient.post("/auth/refresh");
}

export function logout() {
  return apiClient.post("/auth/logout");
}
