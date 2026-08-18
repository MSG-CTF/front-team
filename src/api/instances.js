import apiClient from "./client.js";

// 활성 상태 인스턴스가 있을 때만 객체를 반환, 종료 상태만 남았으면 data: null.
export function getMyInstance() {
  return apiClient.get("/teams/me/instance");
}

// TODO: 아래 엔드포인트들은 README.md에 정확한 경로가 아직 명시 안 됨.
// 생성/재시작/초기화/연장/종료는 비동기 큐 적재라 202로 응답 (공통 규약 참고).
export function createInstance() {
  throw new Error("createInstance: API 경로 미정");
}

export function stopInstance() {
  throw new Error("stopInstance: API 경로 미정");
}

export function resetInstance() {
  throw new Error("resetInstance: API 경로 미정");
}

export function extendInstance() {
  throw new Error("extendInstance: API 경로 미정");
}

export function submitFlag(payload) {
  throw new Error("submitFlag: API 경로 미정");
}
