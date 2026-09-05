import { isSuccess } from "../../../utils/response.js";

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
    isQuarantined: data?.is_quarantined === true,
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
          solveDeadlineAt: data.active_challenge.solve_deadline_at,
          remainingSeconds: data.active_challenge.remaining_seconds,
        }
      : null,
  };
}

export function adaptDiceStatus(data) {
  return {
    canRoll: data?.can_roll === true,
    diceRollsLeft: data?.dice_rolls_left ?? 0,
    isQuarantined: data?.is_quarantined === true,
    timerRunning: data?.timer_running === true,
    blockedReason: data?.blocked_reason ?? null,
    serverTime: data?.server_time ?? null,
    nextDiceResetAt: data?.next_dice_reset_at ?? null,
    quarantineReleasedAt: data?.quarantine_released_at ?? null,
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
    isQuarantined: data?.is_quarantined,
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

// board-grid.png의 36칸은 동일 간격의 타원 궤도에 배치되어 있다.
// 이 좌표는 API 값이 아니라 고정된 Figma 보드 asset의 클릭/말 배치 좌표다.
// 각도는 1번 칸(정중앙 하단)에서 시작해 시계 방향으로 증가한다(Figma 시안 기준).
export function getBoardCellPosition(cellIndex) {
  const normalizedIndex = Math.min(
    BOARD_CELL_COUNT,
    Math.max(1, Number(cellIndex) || 1),
  );
  const angle = (Math.PI / 2) + ((normalizedIndex - 1) * Math.PI * 2) / BOARD_CELL_COUNT;

  return {
    x: 50 + 43.5 * Math.cos(angle),
    y: 50 + 42.5 * Math.sin(angle),
  };
}
