import apiClient from "./client.js";

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
  //  code SUCCESS      : 정답. 15분 이내 + 방금 도착한 최신 칸이면 earned_mileage 100
  //                      + is_extra_dice_granted true, 아니면 false.
  //  code INCORRECT_FLAG: 오답(연속 3회 미만)
  //  429 TOO_MANY_ATTEMPTS: 3회 연속 오답 -> 30초 락, data.retry_after_seconds
  //  409 ALREADY_SOLVED
  return apiClient.post(
    `/challenges/${encodeURIComponent(challengeId)}/submit`,
    { flag },
  );
}

export function getOpenChallenges(config) {
  // "열린 문제 목록 페이지"는 전용 엔드포인트가 없다(Notion DB 비어 있음).
  // GET /board/opened_challenges 가 담당: opened_challenges[], total_count, solved_count, total_score.
  return apiClient.get("/board/opened_challenges", config);
}
