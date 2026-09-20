import apiClient from "./client.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function challengeFilePath(challengeId, fileId) {
  if (typeof challengeId !== "string" || typeof fileId !== "string" || !UUID.test(challengeId) || !UUID.test(fileId)) {
    throw new TypeError("문제 파일 식별자를 확인하지 못했습니다");
  }
  return `/challenges/${challengeId}/files/${fileId}/download`;
}

export function downloadChallengeFile(challengeId, fileId, { signal } = {}) {
  // 응답의 임의 URL에 Bearer를 붙이지 않고 현재 문제의 고정 경로만 요청한다
  return apiClient.get(challengeFilePath(challengeId, fileId), {
    responseType: "blob",
    timeout: 60000,
    signal,
  });
}

// 문제 관련 조회/제출. 경로와 스키마는 README.md "3. 문제 상세 페이지",
// "10. 열린 문제 목록 페이지"(Notion API명세서 기준). 인스턴스 생명주기는 api/instances.js.

export function getChallengeDetail(challengeId, config) {
  // GET /challenges/{id} - title, category, club_name, difficulty, score, description,
  // files, is_solved, instance(현재 문제와 연결된 본인 활성 인스턴스만 또는 null).
  // 아직 안 연 문제면 403 CHALLENGE_LOCKED.
  return apiClient.get(
    `/challenges/${encodeURIComponent(challengeId)}`,
    config,
  );
}

export function submitFlag(challengeId, { flag }) {
  // POST /challenges/{id}/submit - HTTP 200이어도 code로 판정(README 0-2절).
  //  code SUCCESS: 정답, 실제 지급 마일리지와 추가 주사위 여부는 응답을 사용한다
  //  code INCORRECT_FLAG: 오답(연속 3회 미만)
  //  429 TOO_MANY_ATTEMPTS: 3회 연속 오답 -> 30초 락, data.retry_after_seconds
  //  409 ALREADY_SOLVED
  return apiClient.post(
    `/challenges/${encodeURIComponent(challengeId)}/submit`,
    { flag },
    { timeout: 15000 },
  );
}

export function getOpenChallenges(config) {
  // "열린 문제 목록 페이지"는 전용 엔드포인트가 없다(Notion DB 비어 있음).
  // GET /board/opened_challenges 가 담당: opened_challenges[], total_count, solved_count, total_score.
  return apiClient.get("/board/opened_challenges", config);
}
