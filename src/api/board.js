import apiClient from "./client.js";

// 보드 페이지 API. 경로와 스키마는 README.md "2. 문제 리스트(보드) 페이지"
// (Notion API명세서 2026-08-23 스냅샷) 기준. 16개 엔드포인트 전부 백엔드 완료.
//
// 쓰기 계열(POST)은 전부 Idempotency-Key 헤더 필수 + 이동/굴림 계열은 팀장만.
// idKey()로 요청마다 새 키를 만들어 넣는다.
// 응답 성공 판정은 HTTP 상태가 아니라 utils/response.js isSuccess() (README 0-2절).

function idKey(prefix) {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { headers: { "Idempotency-Key": `${prefix}-${uuid}` } };
}

// ---- 조회 ----
export function getBoard() {
  // GET /board (인증 없음) - 36칸 배치. 특수칸 1/7/16/21/25/30 고정.
  return apiClient.get("/board");
}

export function getMyBoard() {
  // GET /board/me - 내 팀 진행 상태 전체(cell_states, chance_cards, active_challenge 등).
  return apiClient.get("/board/me");
}

export function getDiceStatus() {
  // GET /board/dice/status - can_roll / blocked_reason / server_time / next_dice_reset_at.
  return apiClient.get("/board/dice/status");
}

export function getOpenedChallenges() {
  // GET /board/opened_challenges - 열어둔 문제 목록 + is_solved. 열린 문제 목록 페이지(10절)도 이걸 씀.
  return apiClient.get("/board/opened_challenges");
}

export function getCurrentCell() {
  // GET /board/cell/current - 도착 칸 상세 + 문제 후보 최대 3개(같은 난이도).
  return apiClient.get("/board/cell/current");
}

// ---- 굴림 / 이동 (팀장만) ----
export function rollDice() {
  // POST /board/dice/roll - POST_ROLL 카드 보유 시 pending_confirm: true(미확정).
  return apiClient.post("/board/dice/roll", undefined, idKey("dice-roll"));
}

export function confirmDice() {
  // POST /board/dice/confirm - 보류된 굴림 결과를 현재 위치에 확정.
  return apiClient.post("/board/dice/confirm", undefined, idKey("dice-confirm"));
}

export function moveAirport({ destinationIndex }) {
  // POST /board/airport/move - 미소모 칸으로 직접 이동. destination_index 1~36.
  return apiClient.post(
    "/board/airport/move",
    { destination_index: destinationIndex },
    idKey("airport-move"),
  );
}

export function escapeQuarantine({ code }) {
  // POST /board/quarantine/escape - 현장에서 찾은 탈출 코드 제출. 위치는 안 바뀜.
  return apiClient.post(
    "/board/quarantine/escape",
    { code },
    idKey("quarantine-escape"),
  );
}

export function spinRoulette() {
  // POST /board/roulette/spin - 결과 50/100/150/200 각 25%. 팀당 1회.
  return apiClient.post("/board/roulette/spin", undefined, idKey("roulette-spin"));
}

// ---- 문제 선택 ----
export function openCell({ challengeId }) {
  // POST /board/cell/open - 후보 문제 1개 선택. cell_index는 안 보냄(서버가 현재 위치로 검증).
  return apiClient.post(
    "/board/cell/open",
    { challenge_id: challengeId },
    idKey("cell-open"),
  );
}

// ---- 찬스카드 (7종, 팀장만) ----
export function getChanceCatalog() {
  // GET /board/chance/catalog (인증 없음) - 7종 정의.
  return apiClient.get("/board/chance/catalog");
}

export function drawChanceCard() {
  // POST /board/chance/now - 찬스칸에서 1장 뽑기. 뽑는 시점에 주사위 +1.
  return apiClient.post("/board/chance/now", undefined, idKey("chance-draw"));
}

export function useChanceCard(payload) {
  // POST /board/chance/use - 카드별 body 다름:
  //  card_move_offset  -> { card_id, offset: -3~3(0 제외) }
  //  card_free_travel  -> { card_id, destination_index }
  //  그 외             -> { card_id }
  return apiClient.post("/board/chance/use", payload, idKey("chance-use"));
}

export function confirmChanceCard({ choice }) {
  // POST /board/chance/confirm - card_roll_twice_choose 전용. choice: "FIRST" | "SECOND".
  return apiClient.post(
    "/board/chance/confirm",
    { choice },
    idKey("chance-confirm"),
  );
}

export function discardChanceCard({ cardId }) {
  // POST /board/chance/discard - 보유 2장일 때 1장 폐기.
  return apiClient.post(
    "/board/chance/discard",
    { card_id: cardId },
    idKey("chance-discard"),
  );
}
