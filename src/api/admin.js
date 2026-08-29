import apiClient from "./client.js";

// 관리자 API - 전부 Bearer + role: ADMIN 필요. 경로/스키마는 README.md "8. 관리자 페이지"
// (Notion API명세서 2026-08-26 스냅샷) 기준.
//
// 각 함수 옆 [백엔드] 표기는 Notion status 속성이다. "완료"/"PR 대기"는 바로 연동 가능,
// "진행 중"/"논의"/"시작 전"은 서버가 아직 404/501을 줄 수 있으니 화면에서 방어적으로 처리.
// 응답 성공 판정은 HTTP 상태가 아니라 utils/response.js의 isSuccess()로 (README 0-2절).
//
// 관리자 API에는 밴 체크 인터셉터(403 TEAM_BANNED)가 적용되지 않는다.

// ── 대시보드 ────────────────────────────────────────────────────────────────
export function getAdminDashboard() {
  // [백엔드: 논의] GET /admin/dashboard - 요약 지표 집계
  return apiClient.get("/admin/dashboard");
}

// ── 팀 ─────────────────────────────────────────────────────────────────────
export function getAdminTeams({ search, sort, page = 1, size = 20 } = {}) {
  // [백엔드: 완료] sort: "score" | "name"
  return apiClient.get("/admin/teams", { params: { search, sort, page, size } });
}

export function getAdminTeamDetail(teamId, { historyLimit = 10 } = {}) {
  // [백엔드: 진행 중] history_limit 기본 10, 상한 50
  return apiClient.get(`/admin/teams/${teamId}`, {
    params: { history_limit: historyLimit },
  });
}

export function banTeam(teamId, { banReason }) {
  // [백엔드: 완료] ban_reason 1자 이상
  return apiClient.post(`/admin/teams/${teamId}/ban`, { ban_reason: banReason });
}

export function unbanTeam(teamId) {
  // [백엔드: 완료]
  return apiClient.delete(`/admin/teams/${teamId}/ban`);
}

export function adjustMileage(teamId, { amount, reason }) {
  // [백엔드: 완료] amount 0 불가, 양수=지급 / 음수=회수. type은 서버가 부호로 결정.
  return apiClient.post(`/admin/teams/${teamId}/mileage`, { amount, reason });
}

// ── 팀 강제 개입 (전부 [백엔드: 논의] - 보드 도메인 PR #14 확정 후) ──────────
export function getTeamSnapshots(teamId) {
  // GET /admin/teams/{id}/snapshots - 롤백 지점 목록
  return apiClient.get(`/admin/teams/${teamId}/snapshots`);
}

export function rollbackTeam(teamId, { snapshotId, reason }) {
  // POST /admin/teams/{id}/rollback - reason 1~500자
  return apiClient.post(`/admin/teams/${teamId}/rollback`, {
    snapshot_id: snapshotId,
    reason,
  });
}

export function updateBoardCell(teamId, cellIndex, { status, reason }) {
  // PATCH .../board/cells/{cell_index} - status: UNVISITED|CONSUMED|OPENED|CLEARED. 점수 미변경.
  return apiClient.patch(`/admin/teams/${teamId}/board/cells/${cellIndex}`, {
    status,
    reason,
  });
}

export function moveBoardPosition(teamId, { position, consumeCell = false, reason }) {
  // PATCH .../board/position - position 0~35, 도착 칸 효과 미발동
  return apiClient.patch(`/admin/teams/${teamId}/board/position`, {
    position,
    consume_cell: consumeCell,
    reason,
  });
}

export function adjustDiceRolls(teamId, { amount, reason }) {
  // POST .../board/dice - amount -20~20 (0 불가), 양수=지급 / 음수=회수
  return apiClient.post(`/admin/teams/${teamId}/board/dice`, { amount, reason });
}

// ── 인스턴스 ───────────────────────────────────────────────────────────────
export function getAdminInstances({ status, teamId, challengeId, page = 1, size = 50 } = {}) {
  // [백엔드: PR 대기] summary.by_status/by_team/by_challenge 집계 포함
  return apiClient.get("/admin/instances", {
    params: { status, team_id: teamId, challenge_id: challengeId, page, size },
  });
}

export function forceResetInstance(instanceId) {
  // [백엔드: 완료] 202 Accepted, status: "RESETTING"
  return apiClient.post(`/admin/instances/${instanceId}/reset`);
}

export function forceStopInstance(instanceId) {
  // [백엔드: 완료] 202 Accepted, status: "STOPPING"
  return apiClient.delete(`/admin/instances/${instanceId}`);
}

// ── 문제 / 릴리스 ──────────────────────────────────────────────────────────
export function getAdminChallenges({ category, isPublished, sort = "running", page = 1, size = 50 } = {}) {
  // [백엔드: 논의] sort: "running" | "title" | "score"
  return apiClient.get("/admin/challenges", {
    params: { category, is_published: isPublished, sort, page, size },
  });
}

export function setChallengeVisibility(challengeId, { isPublished, reason }) {
  // [백엔드: 논의] PATCH .../visibility
  return apiClient.patch(`/admin/challenges/${challengeId}/visibility`, {
    is_published: isPublished,
    reason,
  });
}

export function registerChallengeRelease(challengeId, { artifact, note }) {
  // [백엔드: 시작 전] 공급망 artifact-v2.json의 artifact 블록을 그대로 전달
  return apiClient.post(`/admin/challenges/${challengeId}/releases`, { artifact, note });
}

export function getChallengeReleases(challengeId) {
  // [백엔드: 시작 전] 버전 내림차순 이력 + current_release_id
  return apiClient.get(`/admin/challenges/${challengeId}/releases`);
}

export function activateChallengeRelease(challengeId, releaseId) {
  // [백엔드: 시작 전] 옛 릴리스 지정 시 롤백. Body 없음. 멱등.
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/activate`);
}

// ── 리소스 / 로그 ─────────────────────────────────────────────────────────
export function getAdminResources() {
  // [백엔드: 진행 중] 수집 정보 없으면 data: null
  return apiClient.get("/admin/resources");
}

export function getAdminEvents({ type, teamId, page = 1, size = 50 } = {}) {
  // [백엔드: 진행 중] type / team_id 선택
  return apiClient.get("/admin/events", {
    params: { type, team_id: teamId, page, size },
  });
}

// ── 결제 ───────────────────────────────────────────────────────────────────
export function getPaymentHistory({ teamId, page = 1, size = 50 } = {}) {
  // [백엔드: 완료]
  return apiClient.get("/admin/payment/history", {
    params: { team_id: teamId, page, size },
  });
}

export function checkoutPayment({ paymentToken, amount, itemName }) {
  // [백엔드: 완료] amount >= 1. 잔액 부족 실패 시 QR 토큰 미소모.
  return apiClient.post("/admin/payment/checkout", {
    payment_token: paymentToken,
    amount,
    item_name: itemName,
  });
}

export function refundPayment(historyId) {
  // [백엔드: 완료] 기존 PURCHASE 행 불변, REFUND 양수 행 새로 생성
  return apiClient.delete(`/admin/payment/${historyId}/refund`);
}

// ── 설정 ───────────────────────────────────────────────────────────────────
export function getAdminSettings() {
  // [백엔드: 논의] contest / board / flag 값
  return apiClient.get("/admin/settings");
}

export function updateAdminSettings(partialSettings) {
  // [백엔드: 논의] 보낸 키만 부분 수정. 예: { board: { dice_rolls_per_reset: 4 } }
  return apiClient.patch("/admin/settings", partialSettings);
}
