import { isSuccess } from "../../../utils/response.js";
import { getChallengeDeadline } from "../../../utils/time.js";

export const BOARD_CELL_COUNT = 36;

export class BoardApiError extends Error {
  constructor(
    message,
    code = "BOARD_REQUEST_FAILED",
    isResponseFailure = false,
    requestConfig = null,
  ) {
    super(message);
    this.name = "BoardApiError";
    this.code = code;
    this.isResponseFailure = isResponseFailure;
    this.requestConfig = requestConfig;
  }
}

export function unwrapBoardResponse(response) {
  const envelope = response?.data;

  if (!isSuccess(envelope)) {
    throw new BoardApiError(
      envelope?.message || "보드 정보를 불러오지 못했습니다.",
      envelope?.code,
      true,
      response?.config,
    );
  }

  return envelope.data;
}

export function getBoardError(error) {
  const envelope = error?.response?.data;
  return {
    code: envelope?.code || error?.code || "BOARD_REQUEST_FAILED",
    message: envelope?.message || error?.message || "보드 요청에 실패했습니다.",
  };
}

export function adaptBoardDefinition(data) {
  return {
    totalCellCount: data?.total_cell_count ?? 0,
    cells: Array.isArray(data?.cells)
      ? data.cells.map((cell) => ({
          cellIndex: cell.cell_index,
          type: cell.type,
          difficulty: cell.difficulty,
          lineNumber: cell.line_number ?? null,
          name: cell.name,
        }))
      : [],
  };
}

export function adaptMyBoard(data) {
  return {
    position: data?.position ?? null,
    type: data?.type ?? null,
    diceRollsLeft: data?.dice_rolls_left ?? 0,
    nextDiceResetAt: data?.next_dice_reset_at ?? null,
    airportMoveUsed: data?.airport_move_used === true,
    hasPassedStart: data?.has_passed_start === true,
    boardCompleted: data?.board_completed === true,
    consumedCellIndexes: Array.isArray(data?.consumed_cell_indexes)
      ? data.consumed_cell_indexes
      : [],
    cellStates: Array.isArray(data?.cell_states)
      ? data.cell_states.map((cellState) => ({
          cellIndex: cellState.cell_index,
          status: cellState.status,
          category: cellState.category,
        }))
      : [],
    chanceCards: Array.isArray(data?.chance_cards)
      ? data.chance_cards.map((card) => ({
          cardId: card.card_id,
          used: card.used === true,
          discarded: card.discarded === true,
          usableNow: card.usable_now === true,
        }))
      : [],
    activeChallenge: data?.active_challenge
      ? {
          challengeId: data.active_challenge.challenge_id,
          openedAt: data.active_challenge.opened_at,
          solveDeadlineAt: getChallengeDeadline(data.active_challenge.opened_at),
          remainingSeconds: data.active_challenge.remaining_seconds,
        }
      : null,
  };
}

export function adaptDiceStatus(data) {
  return {
    canRoll: data?.can_roll === true,
    diceRollsLeft: data?.dice_rolls_left ?? 0,
    timerRunning: data?.timer_running === true,
    blockedReason: data?.blocked_reason ?? null,
    serverTime: data?.server_time ?? null,
    nextDiceResetAt: data?.next_dice_reset_at ?? null,
    receivedAt: Date.now(),
  };
}

export function adaptCurrentCell(data) {
  if (!data) return null;

  return {
    cellIndex: data.cell_index,
    type: data.type,
    challengeCandidates: Array.isArray(data.challenge_candidates)
      ? data.challenge_candidates.map((candidate) => ({
          challengeId: candidate.challenge_id,
          // 필드명 미확정(README 0-3절/2절: title vs challenge_title) - 둘 다 받는다
          title: candidate.title ?? candidate.challenge_title,
          category: candidate.category,
          clubName: candidate.club_name,
          score: candidate.score,
        }))
      : [],
  };
}

export function adaptChanceCatalog(data) {
  return Array.isArray(data?.cards)
    ? data.cards.map((card) => ({
        cardId: card.card_id,
        name: card.name,
        description: card.description,
        effect: card.effect,
        usageTiming: card.usage_timing,
      }))
    : [];
}

export function adaptChanceDraw(data) {
  return {
    cardId: data?.card_id ?? null,
    name: data?.name ?? "",
    description: data?.description ?? "",
    effect: data?.effect ?? null,
    usageTiming: data?.usage_timing ?? null,
    used: data?.used === true,
    diceRollsLeft: data?.dice_rolls_left ?? null,
    awaitingDiscard: data?.awaiting_discard === true,
  };
}

export function adaptChanceAction(data) {
  return {
    cardId: data?.card_id ?? null,
    effect: data?.effect ?? null,
    fromIndex: data?.from_index ?? null,
    toIndex: data?.to_index ?? null,
    movementPath: Array.isArray(data?.movement_path) ? data.movement_path : [],
    skippedCells: Array.isArray(data?.skipped_cells) ? data.skipped_cells : [],
    diceRollsLeft: data?.dice_rolls_left ?? null,
    firstNumber: data?.first_number ?? null,
    secondNumber: data?.second_number ?? null,
    awaitingConfirm: data?.awaiting_confirm === true,
    used: data?.used === true,
  };
}

export function adaptChanceConfirmation(data) {
  return {
    cardId: data?.card_id ?? null,
    effect: data?.effect ?? null,
    choice: data?.choice ?? null,
    chosenNumber: data?.chosen_number ?? null,
    fromIndex: data?.from_index ?? null,
    toIndex: data?.to_index ?? null,
    used: data?.used === true,
  };
}

export function adaptRouletteResult(data) {
  return {
    label: data?.roulette_result?.label ?? "",
    mileageGained: data?.mileage_gained ?? 0,
    totalMileage: data?.total_mileage ?? 0,
  };
}

export function adaptMovementResult(data) {
  return {
    diceA: data?.dice_a ?? null,
    diceB: data?.dice_b ?? null,
    rolledNumber: data?.rolled_number ?? null,
    previousPosition: data?.previous_position ?? null,
    currentPosition: data?.current_position ?? null,
    movementPath: Array.isArray(data?.movement_path) ? data.movement_path : [],
    skippedCells: Array.isArray(data?.skipped_cells) ? data.skipped_cells : [],
    passedStart: data?.passed_start === true,
    startReward: data?.start_reward ?? null,
    boardEventCode: data?.board_event_code ?? null,
    pendingConfirm: data?.pending_confirm === true,
    usableChanceCard: data?.usable_chance_card ?? null,
  };
}

// GET /board/opened_challenges - 열어둔 칸 -> challenge_id 매핑에 쓴다(이미 연
// 칸을 다시 클릭했을 때 문제 상세로 재진입하는 용도, README 2절/10절).
export function adaptOpenedChallenges(data) {
  return Array.isArray(data?.opened_challenges)
    ? data.opened_challenges.map((entry) => ({
        challengeId: entry.challenge_id,
        cellIndex: entry.cell_index,
        title: entry.title,
        category: entry.category,
        clubName: entry.club_name,
        score: entry.score,
        isSolved: entry.is_solved === true,
        solvedAt: entry.solved_at,
        openedAt: entry.opened_at,
      }))
    : [];
}

export function mergeOwnedChanceCards(chanceCards, catalog) {
  return chanceCards
    .filter((card) => !card.used && !card.discarded)
    .map((card) => ({
      ...catalog.find((definition) => definition.cardId === card.cardId),
      ...card,
    }));
}

export function getRemainingSeconds(targetIso, diceStatus, now = Date.now()) {
  if (!targetIso || !diceStatus?.serverTime) return null;

  const targetAt = Date.parse(targetIso);
  const serverAt = Date.parse(diceStatus.serverTime);
  if (!Number.isFinite(targetAt) || !Number.isFinite(serverAt)) return null;

  const elapsedSinceResponse = Math.max(0, now - diceStatus.receivedAt);
  const estimatedServerNow = serverAt + elapsedSinceResponse;
  return Math.max(0, Math.ceil((targetAt - estimatedServerNow) / 1000));
}

// board-grid.png (1772x1330)의 실제 칸 중심. START가 다른 칸보다 넓고
// 일반 칸도 등각 타원이 아니므로 수식으로 균등 분할하면 칸마다 위치가 달라진다.
// 이미지 원본 픽셀 좌표를 비율로 바꿔 반응형 보드에도 동일하게 적용한다.
export const BOARD_IMAGE_SIZE = Object.freeze({ width: 1772, height: 1330 });
const BOARD_CELL_CENTERS = [
  [886, 1210], // 1 START
  [655, 1187], [514, 1147], [395, 1092], [296, 1024], [211, 946],
  [149, 858], [112, 763], [102, 660], [113, 559], [146, 465],
  [198, 378], [270, 300], [355, 232], [451, 174], [555, 131],
  [666, 99], [781, 80], [901, 74], [1017, 81], [1132, 89],
  [1239, 137], [1339, 184], [1432, 244], [1514, 315], [1583, 394],
  [1634, 483], [1663, 576], [1669, 679], [1653, 781], [1613, 874],
  [1548, 960], [1458, 1039], [1354, 1106], [1234, 1155], [1101, 1188],
];

export function getBoardCellPosition(cellIndex) {
  const normalizedIndex = Math.min(
    BOARD_CELL_COUNT,
    Math.max(1, Math.round(Number(cellIndex) || 1)),
  );
  const [x, y] = BOARD_CELL_CENTERS[normalizedIndex - 1];

  return {
    x: (x / BOARD_IMAGE_SIZE.width) * 100,
    y: (y / BOARD_IMAGE_SIZE.height) * 100,
  };
}
