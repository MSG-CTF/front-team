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
          title: candidate.title,
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

// Original 1772 × 1330 board artwork has uneven tile spacing. Use actual tile
// centers so the API cell, icon, click target, and team piece share a position.
const BOARD_TILE_CENTERS = [
  [888, 1207], [655, 1200], [518, 1140], [399, 1086], [302, 1028], [216, 946],
  [146, 856], [105, 760], [100, 660], [107, 563], [146, 472], [193, 381],
  [265, 300], [351, 233], [446, 178], [553, 126], [664, 96], [782, 77],
  [898, 75], [1012, 80], [1136, 101], [1247, 144], [1340, 197], [1430, 246],
  [1515, 311], [1584, 396], [1639, 488], [1672, 581], [1672, 681], [1654, 783],
  [1604, 870], [1540, 955], [1456, 1033], [1354, 1102], [1234, 1154], [1097, 1190],
];

export function getBoardCellPosition(cellIndex) {
  const normalizedIndex = Math.min(
    BOARD_CELL_COUNT,
    Math.max(1, Number(cellIndex) || 1),
  );
  const [x, y] = BOARD_TILE_CENTERS[normalizedIndex - 1];

  return {
    x: (x / 1772) * 100,
    y: (y / 1330) * 100,
  };
}
