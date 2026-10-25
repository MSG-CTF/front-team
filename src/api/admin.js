import apiClient from "./client.js";

const MUTATION_CONFIG = { timeout: 15000, timeoutErrorMessage: "요청 결과를 확인하지 못했습니다. 최신 상태를 조회한 뒤 확인하세요" };
const PUBLICATION_CONFIG = { timeout: 120000, timeoutErrorMessage: "발행본 처리 결과를 확인하지 못했습니다 같은 요청으로 다시 시도해주세요" };

export function getPublishedChallenges(page = 1, config) {
  return apiClient.get("/admin/published_challenges", { ...PUBLICATION_CONFIG, ...config, params: { page } });
}

export function previewPublishedChallenge(artifactId, config) {
  return apiClient.post("/admin/published_challenges/preview", { artifact_id: artifactId }, { ...PUBLICATION_CONFIG, ...config });
}

export function importPublishedChallenge(body, idempotencyKey) {
  return apiClient.post("/admin/published_challenges/import", body, { ...idKey("publication", idempotencyKey), ...PUBLICATION_CONFIG });
}

export function getAdminDeploymentTests(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/deployment_tests`, config);
}

export function startAdminDeploymentTest(challengeId, releaseId, requestId) {
  return apiClient.post(`/admin/challenges/${encodeURIComponent(challengeId)}/releases/${encodeURIComponent(releaseId)}/deployment_tests`,
    { request_id: requestId }, MUTATION_CONFIG);
}

export function stopAdminDeploymentTest(challengeId, testId) {
  return apiClient.delete(`/admin/challenges/${encodeURIComponent(challengeId)}/deployment_tests/${encodeURIComponent(testId)}`, MUTATION_CONFIG);
}

export function getAdminChallenge(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}`, config);
}

export function getAdminChallengePreview(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/preview`, config);
}

export function getAdminBoardReadiness(config) {
  return apiClient.get("/admin/board/readiness", config);
}

export function getAdminChallengeSolves(challengeId, { startAt, endAt, hour, sort = "latest", page = 1, size = 20 } = {}, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/solves`, {
    ...config, params: { start_at: startAt, end_at: endAt, hour, sort, page, size },
  });
}

// [프론트 요청, 백엔드 PR 대기] 제출 기록: 백엔드 FlagSubmission 에 정답, 오답, 잠김 제출이 모두 저장된다
// 원문 플래그는 저장하지 않으므로 해시 앞부분만 받는다
export function getAdminChallengeSubmissions(challengeId, { result, teamId, page = 1, size = 20 } = {}, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/submissions`, {
    ...config, params: { result, team_id: teamId, page, size },
  });
}

// [프론트 요청, 백엔드 대기] 원격 실행 기록: 실행 파일을 내서 검증 VM에서 돌린 기록을 모든 팀에 걸쳐 본다
//  summary: total, teams, timed_out, crashed, failed / runs[]: run_id, team_id, team_name, user{nickname}, run_number,
//  status, counted, file_name, file_size, payload_sha256, created_at, finished_at, duration_ms, exit_code, stdout, stderr, message
export function getAdminRemoteRuns(challengeId, { status, page = 1, size = 20 } = {}, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/remote_runs`, {
    ...config, params: { status, page, size },
  });
}

// [프론트 요청, 백엔드 대기] 원격 실행 설정: environment, accept[], executable, max_file_bytes, timeout_seconds, max_attempts
export function updateAdminRemoteRun(challengeId, settings) {
  return apiClient.patch(`/admin/challenges/${encodeURIComponent(challengeId)}/remote_run`, settings, MUTATION_CONFIG);
}

export function updateAdminChallenge(challengeId, changes) {
  return apiClient.patch(`/admin/challenges/${encodeURIComponent(challengeId)}`, changes, MUTATION_CONFIG);
}

export function getAdminChallengeFlag(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/flag`, config);
}

export function revealAdminChallengeFlag(challengeId, config) {
  return apiClient.post(`/admin/challenges/${encodeURIComponent(challengeId)}/flag/reveal`, {}, { ...MUTATION_CONFIG, ...config });
}

export function getAdminChallengeFiles(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/files`, config);
}

export function getAdminReleaseFiles(challengeId, releaseId, config) {
  return getAdminChallengeFiles(challengeId, { ...config, params: { ...config?.params, release_id: releaseId } });
}

export function configureChallengeReleaseFiles(challengeId, releaseId, body, idempotencyKey) {
  return apiClient.post(`/admin/challenges/${encodeURIComponent(challengeId)}/releases/${encodeURIComponent(releaseId)}/files`, body,
    idKey("release-files", idempotencyKey));
}

export function getAdminChallengeRepositoryFiles(challengeId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/repository-files`, config);
}

export function downloadAdminChallengeFile(challengeId, fileId, config) {
  return apiClient.get(`/admin/challenges/${encodeURIComponent(challengeId)}/files/${encodeURIComponent(fileId)}/download`, {
    ...config, responseType: "blob", timeout: 60000,
  });
}

// 마일리지 지급·회수와 배포 파일 저장은 재시도할 때 같은 키를 넘긴다.
export function createAdminIdempotencyKey(prefix) {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function idKey(prefix, idempotencyKey) {
  return {
    ...MUTATION_CONFIG,
    headers: { "Idempotency-Key": idempotencyKey ?? createAdminIdempotencyKey(prefix) },
  };
}

// 관리자 API - 전부 Bearer + role: ADMIN 필요. 경로/스키마는 README.md "8. 관리자 페이지"
// (Notion API명세서 2026-09-07 스냅샷) 기준.
//
// 각 함수 옆 [백엔드] 표기는 문서 작성 시점의 Notion 상태다
// 실제 배포 여부는 응답으로 판단하며, 없는 경로의 404/501은 화면에 별도로 표시한다
// 응답 성공 판정은 HTTP 상태가 아니라 utils/response.js의 isSuccess()로 (README 0-2절).
//
// 관리자 API에는 밴 체크 인터셉터(403 TEAM_BANNED)가 적용되지 않는다.

// ── 대시보드 ────────────────────────────────────────────────────────────────
export function getAdminDashboard(config) {
  // [백엔드: 완료] GET /admin/dashboard - 요약 지표 집계
  return apiClient.get("/admin/dashboard", config);
}

// ── 계정 (2026-09-07 신규 - 회원가입 없이 관리자가 미리 계정을 등록) ────────
export function registerAdminAccount({ loginId, password, nickname, role = "PARTICIPANT", isLeader = false, teamId, teamName }) {
  // POST /admin/accounts
  // team_id 만  → 기존 팀에 합류 / team_name 만 → 새 팀 생성 후 배정
  // 둘 다 없음  → 무소속        / 둘 다 있으면  → 400(함께 보낼 수 없음)
  // team_name 1~100자, 중복이면 409 TEAM_NAME_TAKEN
  return apiClient.post("/admin/accounts", {
    login_id: loginId,
    password,
    nickname,
    role,
    is_leader: isLeader,
    team_id: teamId,
    team_name: teamName,
  }, MUTATION_CONFIG);
}

// ── 마일리지 전체 내역 ───────────────────────────────────────────────────
export function getAdminMileageHistory({ teamId, type, page = 1, size = 50 } = {}, config) {
  // [백엔드: PR 대기] GET /admin/mileage_history - 팀별이 아닌 전체 조회
  return apiClient.get("/admin/mileage_history", { ...config, params: { team_id: teamId, type, page, size } });
}

// ── 팀 ─────────────────────────────────────────────────────────────────────
export function getAdminTeams({ search, sort, page = 1, size = 20 } = {}, config) {
  // [백엔드: 완료] sort: "score" | "name"
  return apiClient.get("/admin/teams", { ...config, params: { search, sort, page, size } });
}

export function getAdminTeamDetail(teamId, { historyLimit = 10 } = {}, config) {
  // [백엔드: 완료] history_limit 기본 10, 상한 50
  return apiClient.get(`/admin/teams/${teamId}`, {
    ...config,
    params: { history_limit: historyLimit },
  });
}

export function updateAdminTeam(teamId, changes) {
  // [백엔드: PR 대기] PATCH /admin/teams/{id} - team_name / add_user_ids / remove_user_ids /
  // leader_user_id(null=공석) 중 하나 이상 + reason. 소속/팀장이 바뀐 계정은 다시 로그인해야 한다.
  // TEAM_UPDATED(WARNING) 이벤트. 에러: 409 TEAM_NAME_TAKEN / 409 ACTIVE_INSTANCE_EXISTS
  return apiClient.patch(`/admin/teams/${encodeURIComponent(teamId)}`, changes, MUTATION_CONFIG);
}

export function deleteAdminTeam(teamId, reason) {
  // [백엔드: PR 대기] DELETE /admin/teams/{id} - Body { reason }. 되돌릴 수 없다(소속 계정과 팀 기록
  // 연쇄 삭제, 푼 문제 점수 재계산). TEAM_DELETED(CRITICAL) 이벤트. 에러: 409 ACTIVE_INSTANCE_EXISTS
  return apiClient.delete(`/admin/teams/${encodeURIComponent(teamId)}`, {
    ...MUTATION_CONFIG,
    data: { reason },
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

export function adjustMileage(teamId, { amount, reason, idempotencyKey }) {
  // [백엔드: 완료] amount 0 불가, 양수=지급 / 음수=회수. type은 서버가 부호로 결정.
  // Idempotency-Key 헤더 필수 - 없으면 400 IDEMPOTENCY_KEY_REQUIRED.
  return apiClient.post(
    `/admin/teams/${teamId}/mileage`,
    { amount, reason },
    idKey("admin-mileage", idempotencyKey),
  );
}

// ── 팀 강제 개입 (Notion API명세서 2026-09-07 스냅샷 기준 상태 개별 표기) ──
export function getTeamSnapshots(teamId, config) {
  // [백엔드: 시작 전] GET /admin/teams/{id}/snapshots - 롤백 지점 목록
  return apiClient.get(`/admin/teams/${teamId}/snapshots`, config);
}

export function rollbackTeam(teamId, { snapshotId, reason }) {
  // [백엔드: 시작 전] POST /admin/teams/{id}/rollback - reason 1~500자
  return apiClient.post(`/admin/teams/${teamId}/rollback`, {
    snapshot_id: snapshotId,
    reason,
  }, MUTATION_CONFIG);
}

export function updateBoardCell(teamId, cellIndex, { status, reason }) {
  // [백엔드: 완료(머지)] PATCH .../board/cells/{cell_index} - cell_index 1~36(0번 칸 없음).
  // status: UNVISITED|CONSUMED|OPENED|CLEARED. 점수 미변경.
  // OPENED/CLEARED는 그 칸에 이미 연 문제가 있어야 한다 - 없으면 400 INVALID_REQUEST.
  return apiClient.patch(`/admin/teams/${teamId}/board/cells/${cellIndex}`, {
    status,
    reason,
  });
}

export function moveBoardPosition(teamId, { position, consumeCell = false, reason }) {
  // [백엔드: 완료(머지)] PATCH .../board/position - position 1~36(1번이 START), 도착 칸 효과 미발동.
  // 응답 type은 START/CHALLENGE/CHANCE/AIRPORT/ROULETTE 5종.
  return apiClient.patch(`/admin/teams/${teamId}/board/position`, {
    position,
    consume_cell: consumeCell,
    reason,
  });
}

export function adjustDiceRolls(teamId, { amount, reason }) {
  // [백엔드: PR 대기] POST .../board/dice - amount -20~20 (0 불가), 양수=지급 / 음수=회수
  return apiClient.post(`/admin/teams/${teamId}/board/dice`, { amount, reason });
}

// ── 인스턴스 ───────────────────────────────────────────────────────────────
export function getAdminInstances({ status, teamId, challengeId, page = 1, size = 50 } = {}, config) {
  // [백엔드: 완료] summary.by_status/by_team/by_challenge 집계 포함
  return apiClient.get("/admin/instances", {
    ...config,
    params: { status, team_id: teamId, challenge_id: challengeId, page, size },
  });
}

export function forceResetInstance(instanceId) {
  // 202 Accepted: 새 인스턴스의 준비 상태는 후속 조회로 확인
  return apiClient.post(`/admin/instances/${instanceId}/reset`, undefined, MUTATION_CONFIG);
}

export function forceStopInstance(instanceId) {
  // [백엔드: 완료] 202 Accepted, status: "STOPPING"
  return apiClient.delete(`/admin/instances/${instanceId}`, MUTATION_CONFIG);
}

// ── 문제 / 릴리스 ──────────────────────────────────────────────────────────
export function getAdminChallenges({ category, isPublished, sort = "running", page = 1, size = 50 } = {}, config) {
  // [백엔드: 완료] sort: "running" | "title" | "score"
  return apiClient.get("/admin/challenges", {
    ...config,
    params: { category, is_published: isPublished, sort, page, size },
  });
}


export function registerAdminChallenge({
  challengeSlug, title, category, difficulty, description, flag,
  initialScore, minimumScore, decay,
}) {
  return apiClient.post("/admin/challenges", {
    challenge_slug: challengeSlug,
    title,
    category,
    difficulty,
    description,
    flag,
    initial_score: initialScore,
    minimum_score: minimumScore,
    decay,
  }, MUTATION_CONFIG);
}

export function setChallengeVisibility(challengeId, { isPublished, reason }) {
  // [백엔드: PR 대기] PATCH .../visibility
  return apiClient.patch(`/admin/challenges/${challengeId}/visibility`, {
    is_published: isPublished,
    reason,
  }, MUTATION_CONFIG);
}

export function registerChallengeRelease(challengeId, { artifact, note }) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases`, { artifact, note }, MUTATION_CONFIG);
}

export function getChallengeReleases(challengeId, config) {
  return apiClient.get(`/admin/challenges/${challengeId}/releases`, config);
}

export function activateChallengeRelease(challengeId, releaseId, { reason } = {}) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/activate`, reason === undefined ? {} : { reason }, MUTATION_CONFIG);
}

export function deriveChallengeRelease(challengeId, releaseId, settings) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/derive`, settings, MUTATION_CONFIG);
}

export function previewChallengeEnvironmentFile(challengeId, releaseId, body) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/environment_files/preview`, body, MUTATION_CONFIG);
}

export function importChallengeEnvironmentFile(challengeId, releaseId, body) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/environment_files/import`, body, MUTATION_CONFIG);
}

export function getChallengeRepositoryEnvironment(challengeId, releaseId, container) {
  return apiClient.get(`/admin/challenges/${challengeId}/releases/${releaseId}/repository_environment`, { params: { container } });
}

export function previewChallengeRepositoryEnvironment(challengeId, releaseId, body) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/repository_environment/preview`, body, MUTATION_CONFIG);
}

export function importChallengeRepositoryEnvironment(challengeId, releaseId, body) {
  return apiClient.post(`/admin/challenges/${challengeId}/releases/${releaseId}/repository_environment/import`, body, MUTATION_CONFIG);
}

export function getChallengeRuntimeSecrets(challengeId, config) {
  return apiClient.get(`/admin/challenges/${challengeId}/runtime-secrets`, config);
}

export function registerChallengeRuntimeSecret(challengeId, { name, value }) {
  return apiClient.post(`/admin/challenges/${challengeId}/runtime-secrets`, { name, value }, MUTATION_CONFIG);
}

// 시그니처 문제는 JEOPARDY 등록 및 릴리스와 별도 계약이다
export function getAdminSignatures(config) {
  return apiClient.get("/admin/signatures", config);
}

export function createAdminSignature({ clubId, title, description, flag, score }) {
  return apiClient.post("/admin/signatures", {
    club_id: clubId, title, description, flag, score,
  }, MUTATION_CONFIG);
}

export function updateAdminSignature(signatureId, { title, description, flag, score }) {
  return apiClient.patch(`/admin/signatures/${encodeURIComponent(signatureId)}`, {
    title, description, flag, score,
  }, MUTATION_CONFIG);
}

export function publishAdminSignature(signatureId, isPublished) {
  return apiClient.patch(`/admin/signatures/${encodeURIComponent(signatureId)}/publish`, {
    is_published: isPublished,
  }, MUTATION_CONFIG);
}

// ── KoTH ─────────────────────────────────────────────────────────────────
// [프론트 요청, 백엔드 PR 대기] 관리자 KoTH API README 8절 KoTH 관리
// 백엔드에는 KothChallenge · KothScorePeriod 모델과 참가자 API(GET /koth/clubs, /koth/leaderboard)만 있다
// 관리자 화면은 아래 API가 없으면 참가자 API로 목록과 누적 순위만 보인다
export function getAdminKothChallenges(config) {
  return apiClient.get("/admin/koth/challenges", config);
}

// KoTH 문제 등록: 동아리마다 문제 하나, 새 문제는 공개 예정으로 만든다
// 문제 서버가 X-Internal-Token 으로 보낼 내부 토큰 원문은 이 응답의 internal_token 으로 한 번만 받는다
export function createAdminKothChallenge(body) {
  return apiClient.post("/admin/koth/challenges", body, MUTATION_CONFIG);
}

export function getAdminKothChallenge(kothChallengeId, config) {
  return apiClient.get(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}`, config);
}

export function getAdminKothPeriods(kothChallengeId, { page = 1, size = 48 } = {}, config) {
  return apiClient.get(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/periods`, { ...config, params: { page, size } });
}

export function updateAdminKothChallenge(kothChallengeId, body) {
  // body: { title?, description?, challenge_url?, open_group?, status?, reason }
  return apiClient.patch(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}`, body, MUTATION_CONFIG);
}

// 접속 주소와 채점 주소가 실제로 응답하는지 서버가 대신 불러 본다 (저장하지 않고 확인만)
export function testAdminKothConnection(kothChallengeId, { challengeUrl, scoreApiUrl, scoreApiTokenEnv }) {
  return apiClient.post(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/connection_test`, {
    challenge_url: challengeUrl || null, score_api_url: scoreApiUrl || null, score_api_token_env: scoreApiTokenEnv || null,
  }, MUTATION_CONFIG);
}

// 반영되지 못한 틱을 문제 서버에서 다시 불러와 반영한다 이미 반영된 틱은 그대로 둔다
export function retryAdminKothPeriod(kothChallengeId, periodId) {
  return apiClient.post(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/periods/${encodeURIComponent(periodId)}/retry`, null, MUTATION_CONFIG);
}

// KoTH 참가자 파일: 저장소 prob/for_user 묶음을 주거나 주지 않는다
export function getAdminKothFiles(kothChallengeId, config) {
  return apiClient.get(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/files`, config);
}

// 참가자가 받는 zip 을 관리자가 먼저 받아 본다
export function downloadAdminKothFiles(kothChallengeId, config) {
  return apiClient.get(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/files/download`, {
    ...config, responseType: "blob", timeout: 60000,
  });
}

export function updateAdminKothFiles(kothChallengeId, { mode, reason }) {
  return apiClient.put(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/files`, { mode, reason }, MUTATION_CONFIG);
}

export function getAdminKothRepository(config) {
  return apiClient.get("/admin/koth/repository", config);
}

export function linkAdminKothRepository(kothChallengeId, { slug, apply = [], reason }) {
  // apply: 저장소 info.yaml에서 가져올 칸 ["title", "description"]
  return apiClient.put(`/admin/koth/challenges/${encodeURIComponent(kothChallengeId)}/repository`, { slug, apply, reason }, MUTATION_CONFIG);
}

// [프론트 요청, 백엔드 PR 대기] 계정 단위 배치 조정: 크레딧이 바닥날 계정에는 새 인스턴스를 놓지 않는다
// 브로커는 계정 enabled 와 CREDIT_EXHAUSTED · BUDGET_EXCEEDED 판단을 이미 갖고 있다 (instance-scheduler)
export function updateAdminResourceAccount(accountId, { schedulingEnabled, billing, reason }) {
  return apiClient.patch(`/admin/resources/accounts/${encodeURIComponent(accountId)}`, {
    ...(schedulingEnabled === undefined ? {} : { scheduling_enabled: schedulingEnabled }),
    ...(billing === undefined ? {} : { billing }),
    reason,
  }, MUTATION_CONFIG);
}

// ── 리소스 / 로그 ─────────────────────────────────────────────────────────
export function getAdminResources(config) {
  // Current API reports container_count; running_instances belongs to the older contract.
  // Null metrics are uncollected. Optional resource_allocation: docs/admin-node-allocation.md.
  // 수집된 VM이 없으면 200 + data: null, 리소스 브로커 연결 실패는 503 SCHEDULER_UNAVAILABLE.
  return apiClient.get("/admin/resources", config);
}

export function getAdminEvents({ type, teamId, page = 1, size = 50 } = {}, config) {
  // [백엔드: 완료(머지)] type / team_id 선택. type 11종은 features/admin/utils/adminBoard.js
  // ADMIN_EVENT_TYPES, severity는 INFO/WARNING/CRITICAL/MANUAL_REVIEW 4종(ERROR 없음).
  return apiClient.get("/admin/events", {
    ...config,
    params: { type, team_id: teamId, page, size },
  });
}

// ── 결제 ───────────────────────────────────────────────────────────────────
export function getPaymentHistory({ teamId, page = 1, size = 50 } = {}, config) {
  // [백엔드: 완료]
  return apiClient.get("/admin/payment/history", {
    ...config,
    params: { team_id: teamId, page, size },
  });
}

export function checkoutPayment({ paymentToken, amount, itemName }) {
  // [백엔드: 완료] amount >= 1. 잔액 부족 실패 시 QR 토큰 미소모.
  return apiClient.post("/admin/payment/checkout", {
    payment_token: paymentToken,
    amount,
    item_name: itemName,
  }, MUTATION_CONFIG);
}

export function refundPayment(historyId) {
  // [백엔드: 완료] 기존 PURCHASE 행 불변, REFUND 양수 행 새로 생성
  return apiClient.delete(`/admin/payment/${encodeURIComponent(historyId)}/refund`, MUTATION_CONFIG);
}

// ── 설정 ───────────────────────────────────────────────────────────────────
export function getAdminSettings(config) {
  // [백엔드: 시작 전] contest / board / flag 값
  return apiClient.get("/admin/settings", config);
}

export function updateAdminSettings(partialSettings) {
  // [백엔드: 시작 전] 보낸 키만 부분 수정. 예: { board: { dice_rolls_per_reset: 4 } }
  return apiClient.patch("/admin/settings", partialSettings, MUTATION_CONFIG);
}
