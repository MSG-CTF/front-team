import apiClient from "./client.js";

// 문제 상세 / 인스턴스 API. 경로와 스키마는 README.md "3. 문제 상세 페이지"
// (Notion API명세서 기준). 인스턴스 계열은 백엔드가 Scheduler HTTP API를 프록시하는
// 구조라 생성/재시작/연장/종료 전부 202 Accepted 후 폴링. 장애는 503 SCHEDULER_UNAVAILABLE.
// ports는 현재 Scheduler 연동에서 항상 [], host는 RUNNING일 때만 값.

function idKey(prefix) {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { headers: { "Idempotency-Key": `${prefix}-${uuid}` } };
}

export function getMyInstances(config) {
  // GET /teams/me/instances (복수) - 본인(user_id) 기준 활성 인스턴스 단건 또는 null.
  // 같은 팀 다른 사용자 인스턴스는 미포함.
  return apiClient.get("/teams/me/instances", config);
}

export function createInstance({ challengeId }) {
  // POST /instances - 202. 기존 RUNNING은 자동 교체(replaced_instance_id).
  return apiClient.post("/instances", { challenge_id: challengeId }, idKey("instance-create"));
}

export function resetInstance(instanceId) {
  // POST /instances/{id}/reset - 202. Scheduler가 새 instance_id로 교체(RESETTING 전이 안 씀).
  return apiClient.post(
    `/instances/${encodeURIComponent(instanceId)}/reset`,
    {},
    idKey("instance-reset"),
  );
}

export function extendInstance(instanceId) {
  // POST /instances/{id}/extend - 202. 연장 시간은 프론트가 안 보냄(백엔드 30분).
  return apiClient.post(
    `/instances/${encodeURIComponent(instanceId)}/extend`,
    {},
    idKey("instance-extend"),
  );
}

export function stopInstance(instanceId) {
  // DELETE /instances/{id} - 202, status STOPPING. RUNNING만 종료 가능.
  return apiClient.delete(
    `/instances/${encodeURIComponent(instanceId)}`,
    idKey("instance-stop"),
  );
}
