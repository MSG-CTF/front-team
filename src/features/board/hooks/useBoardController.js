import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChallengeDeadline } from "../../../utils/time.js";
import {
  confirmChanceCard,
  confirmDice,
  createBoardIdempotencyKey,
  discardChanceCard,
  drawChanceCard,
  getBoard,
  getChanceCatalog,
  getCurrentCell,
  getDiceStatus,
  getMyBoard,
  getOpenedChallenges,
  moveAirport,
  openCell,
  rollDice,
  spinRoulette,
  useChanceCard,
} from "../../../api/board.js";
import {
  adaptBoardDefinition,
  adaptChanceAction,
  adaptChanceCatalog,
  adaptChanceConfirmation,
  adaptChanceDraw,
  adaptCurrentCell,
  adaptDiceStatus,
  adaptMovementResult,
  adaptMyBoard,
  adaptOpenedChallenges,
  adaptRouletteResult,
  getBoardError,
  getRemainingSeconds,
  mergeOwnedChanceCards,
  unwrapBoardResponse,
} from "../utils/boardData.js";

const MOVEMENT_STEP_MS = 180;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export default function useBoardController() {
  const mountedRef = useRef(false);
  const mutationLockRef = useRef(false);
  const mutationKeysRef = useRef(new Map());
  const processedCellEventsRef = useRef(new Set());
  const [boardDefinition, setBoardDefinition] = useState(null);
  const [myBoard, setMyBoard] = useState(null);
  const [diceStatus, setDiceStatus] = useState(null);
  const [currentCell, setCurrentCell] = useState(null);
  const [chanceCatalog, setChanceCatalog] = useState([]);
  const [openedChallenges, setOpenedChallenges] = useState([]);
  const [now, setNow] = useState(Date.now());
  const diceResyncedForRef = useRef(null);
  const challengeResyncedForRef = useRef(null);
  const [displayPosition, setDisplayPosition] = useState(null);
  const [pendingRoll, setPendingRoll] = useState(null);
  const [pendingChanceChoice, setPendingChanceChoice] = useState(null);
  const [cellEvent, setCellEvent] = useState(null);
  const [awaitingDiscard, setAwaitingDiscard] = useState(false);
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState(null);

  const requestCurrentCell = useCallback(async () => {
    try {
      return adaptCurrentCell(unwrapBoardResponse(await getCurrentCell()));
    } catch (requestError) {
      const boardError = getBoardError(requestError);
      if (boardError.code === "PENDING_CONFIRM") return null;
      throw requestError;
    }
  }, []);

  // opened_challenges는 "이미 연 칸 재클릭 -> 문제 상세 재진입" 편의 기능용
  // 보조 데이터라, 이게 실패한다고 보드 전체 로딩이 막히면 안 된다(실제로 이
  // 엔드포인트가 아직 없는 백엔드/목서버에서 board 전체가 깨지는 걸 방지).
  const requestOpenedChallenges = useCallback(async () => {
    try {
      return adaptOpenedChallenges(unwrapBoardResponse(await getOpenedChallenges()));
    } catch {
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [boardResponse, myBoardResponse, diceResponse, catalogResponse] =
        await Promise.all([
          getBoard(),
          getMyBoard(),
          getDiceStatus(),
          getChanceCatalog(),
        ]);
      const nextBoardDefinition = adaptBoardDefinition(
        unwrapBoardResponse(boardResponse),
      );
      const nextMyBoard = adaptMyBoard(unwrapBoardResponse(myBoardResponse));
      const nextDiceStatus = adaptDiceStatus(unwrapBoardResponse(diceResponse));
      const nextCatalog = adaptChanceCatalog(unwrapBoardResponse(catalogResponse));
      const nextOpenedChallenges = await requestOpenedChallenges();
      const nextCurrentCell = await requestCurrentCell();

      if (!mountedRef.current) return;
      setBoardDefinition(nextBoardDefinition);
      setMyBoard(nextMyBoard);
      setDiceStatus(nextDiceStatus);
      setChanceCatalog(nextCatalog);
      setOpenedChallenges(nextOpenedChallenges);
      setCurrentCell(nextCurrentCell);
      setDisplayPosition(nextMyBoard.position);
      setAwaitingDiscard(false);
      setPendingRoll(null);
      setPendingChanceChoice(null);
    } catch (requestError) {
      if (mountedRef.current) setError(getBoardError(requestError));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [requestCurrentCell, requestOpenedChallenges]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const animateMovement = useCallback(async (movementPath) => {
    if (!Array.isArray(movementPath)) return;

    for (const cellIndex of movementPath) {
      if (!mountedRef.current) return;
      setDisplayPosition(cellIndex);
      await wait(MOVEMENT_STEP_MS);
    }
  }, []);

  const syncProgress = useCallback(
    async ({ includeCurrentCell = true, preserveDisplayPosition = false } = {}) => {
      const [myBoardResponse, diceResponse] = await Promise.all([
        getMyBoard(),
        getDiceStatus(),
      ]);
      const nextMyBoard = adaptMyBoard(unwrapBoardResponse(myBoardResponse));
      const nextDiceStatus = adaptDiceStatus(unwrapBoardResponse(diceResponse));
      const nextOpenedChallenges = await requestOpenedChallenges();
      const nextCurrentCell = includeCurrentCell ? await requestCurrentCell() : null;

      if (!mountedRef.current) return;
      setMyBoard(nextMyBoard);
      setDiceStatus(nextDiceStatus);
      setOpenedChallenges(nextOpenedChallenges);
      if (includeCurrentCell) setCurrentCell(nextCurrentCell);
      if (!preserveDisplayPosition) setDisplayPosition(nextMyBoard.position);
    },
    [requestCurrentCell, requestOpenedChallenges],
  );

  const runMutation = useCallback(
    async ({
      actionId,
      prefix,
      request,
      silentCodes = [],
      allowWhileAwaitingDiscard = false,
    }) => {
      if (
        mutationLockRef.current ||
        (awaitingDiscard && !allowWhileAwaitingDiscard)
      ) {
        return null;
      }

      mutationLockRef.current = true;
      setIsMutating(true);
      setError(null);
      const idempotencyKey =
        mutationKeysRef.current.get(actionId) ??
        createBoardIdempotencyKey(prefix);
      mutationKeysRef.current.set(actionId, idempotencyKey);
      let retainKeyForRetry = false;

      try {
        const result = await request(idempotencyKey);
        mutationKeysRef.current.delete(actionId);
        return result;
      } catch (requestError) {
        const nextError = getBoardError(requestError);
        const failedRequest =
          requestError?.response?.config ?? requestError?.requestConfig;
        const failedStatus = requestError?.response?.status;
        retainKeyForRetry =
          failedRequest?.method === "get" ||
          failedStatus >= 500 ||
          (!requestError?.response && requestError?.isResponseFailure !== true);
        if (!retainKeyForRetry) mutationKeysRef.current.delete(actionId);
        if (mountedRef.current && !silentCodes.includes(nextError.code)) {
          setError(nextError);
        }
        throw requestError;
      } finally {
        if (!retainKeyForRetry) mutationKeysRef.current.delete(actionId);
        mutationLockRef.current = false;
        if (mountedRef.current) setIsMutating(false);
      }
    },
    [awaitingDiscard],
  );

  const handleRollDice = useCallback(
    () =>
      runMutation({
        actionId: "dice-roll",
        prefix: "dice-roll",
        request: async (idempotencyKey) => {
          if (mountedRef.current) setCellEvent(null);
          const rollResult = adaptMovementResult(
            unwrapBoardResponse(await rollDice({ idempotencyKey })),
          );
          await animateMovement(rollResult.movementPath);

          if (rollResult.pendingConfirm) {
            if (mountedRef.current) setPendingRoll(rollResult);
            await syncProgress({
              includeCurrentCell: false,
              preserveDisplayPosition: true,
            });
          } else {
            if (mountedRef.current) setPendingRoll(null);
            await syncProgress();
          }

          return rollResult;
        },
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleConfirmDice = useCallback(
    () =>
      runMutation({
        actionId: "dice-confirm",
        prefix: "dice-confirm",
        request: async (idempotencyKey) => {
          const confirmResult = adaptMovementResult(
            unwrapBoardResponse(await confirmDice({ idempotencyKey })),
          );
          await animateMovement(confirmResult.movementPath);
          if (mountedRef.current) setPendingRoll(null);
          await syncProgress();
          return confirmResult;
        },
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleOpenChallenge = useCallback(
    (challengeId) =>
      runMutation({
        actionId: `cell-open:${challengeId}`,
        prefix: "cell-open",
        request: async (idempotencyKey) => {
          const openResult = unwrapBoardResponse(
            await openCell({ challengeId, idempotencyKey }),
          );
          await syncProgress();
          return {
            cellIndex: openResult.cell_index,
            challengeId: openResult.challenge_id,
            openedAt: openResult.opened_at,
            solveDeadlineAt: getChallengeDeadline(openResult.opened_at),
            remainingSeconds: openResult.remaining_seconds,
          };
        },
      }),
    [runMutation, syncProgress],
  );

  const handleAirportMove = useCallback(
    (destinationIndex) =>
      runMutation({
        actionId: `airport-move:${destinationIndex}`,
        prefix: "airport-move",
        request: async (idempotencyKey) => {
          if (mountedRef.current) setCellEvent(null);
          const moveResult = adaptMovementResult(
            unwrapBoardResponse(
              await moveAirport({ destinationIndex, idempotencyKey }),
            ),
          );
          await animateMovement(moveResult.movementPath);
          await syncProgress();
          return moveResult;
        },
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleDrawChance = useCallback(
    (eventToken) =>
      runMutation({
        actionId: `chance-draw:${eventToken}`,
        prefix: "chance-draw",
        silentCodes: ["NOT_CHANCE_CELL"],
        request: async (idempotencyKey) => {
          const drawResult = adaptChanceDraw(
            unwrapBoardResponse(await drawChanceCard({ idempotencyKey })),
          );
          await syncProgress();
          if (mountedRef.current) {
            setAwaitingDiscard(drawResult.awaitingDiscard);
            setCellEvent({
              type: "CHANCE",
              token: eventToken,
              status: "success",
              result: drawResult,
            });
          }
          return drawResult;
        },
      }).catch((requestError) => {
        if (!mountedRef.current) return null;
        const nextError = getBoardError(requestError);
        if (nextError.code === "NOT_CHANCE_CELL") {
          setCellEvent(null);
          return null;
        }
        setCellEvent({
          type: "CHANCE",
          token: eventToken,
          status: "error",
          error: nextError,
        });
        return null;
      }),
    [runMutation, syncProgress],
  );

  const handleUseChanceCard = useCallback(
    (cardId, options = {}) => {
      if (awaitingDiscard) return Promise.resolve(null);
      const card = mergeOwnedChanceCards(
        myBoard?.chanceCards ?? [],
        chanceCatalog,
      ).find((item) => item.cardId === cardId);
      if (!card?.usableNow) return Promise.resolve(null);

      const payload = { card_id: cardId };
      if (cardId === "card_move_offset") payload.offset = options.offset;
      if (cardId === "card_free_travel") {
        payload.destination_index = options.destinationIndex;
      }
      const signature = JSON.stringify(payload);

      return runMutation({
        actionId: `chance-use:${signature}`,
        prefix: "chance-use",
        request: async (idempotencyKey) => {
          if (mountedRef.current) setCellEvent(null);
          const result = adaptChanceAction(
            unwrapBoardResponse(
              await useChanceCard(payload, { idempotencyKey }),
            ),
          );

          if (result.movementPath.length > 0) {
            await animateMovement(result.movementPath);
          }
          if (result.awaitingConfirm) {
            if (mountedRef.current) setPendingChanceChoice(result);
            await syncProgress({
              includeCurrentCell: false,
              preserveDisplayPosition: true,
            });
          } else {
            if (mountedRef.current) setPendingRoll(null);
            await syncProgress();
          }
          return result;
        },
      });
    },
    [
      animateMovement,
      awaitingDiscard,
      chanceCatalog,
      myBoard?.chanceCards,
      runMutation,
      syncProgress,
    ],
  );

  const handleConfirmChance = useCallback(
    (choice) =>
      runMutation({
        actionId: `chance-confirm:${choice}`,
        prefix: "chance-confirm",
        request: async (idempotencyKey) => {
          const result = adaptChanceConfirmation(
            unwrapBoardResponse(
              await confirmChanceCard({ choice, idempotencyKey }),
            ),
          );
          if (result.toIndex != null) await animateMovement([result.toIndex]);
          if (mountedRef.current) {
            setPendingChanceChoice(null);
            setPendingRoll(null);
          }
          await syncProgress();
          return result;
        },
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleDiscardChance = useCallback(
    (cardId) =>
      runMutation({
        actionId: `chance-discard:${cardId}`,
        prefix: "chance-discard",
        allowWhileAwaitingDiscard: true,
        request: async (idempotencyKey) => {
          const result = unwrapBoardResponse(
            await discardChanceCard({ cardId, idempotencyKey }),
          );
          await syncProgress();
          if (mountedRef.current) setAwaitingDiscard(false);
          return result;
        },
      }),
    [runMutation, syncProgress],
  );

  const handleSpinRoulette = useCallback(
    (eventToken) =>
      runMutation({
        actionId: `roulette-spin:${eventToken}`,
        prefix: "roulette-spin",
        request: async (idempotencyKey) => {
          const result = adaptRouletteResult(
            unwrapBoardResponse(await spinRoulette({ idempotencyKey })),
          );
          await syncProgress();
          if (mountedRef.current) {
            setCellEvent({
              type: "ROULETTE",
              token: eventToken,
              status: "success",
              result,
            });
          }
          return result;
        },
      }),
    [runMutation, syncProgress],
  );

  useEffect(() => {
    if (
      isLoading ||
      pendingRoll ||
      pendingChanceChoice ||
      awaitingDiscard ||
      !currentCell ||
      !["CHANCE", "ROULETTE"].includes(currentCell.type)
    ) {
      return;
    }

    const token = `${currentCell.cellIndex}:${currentCell.type}`;
    if (processedCellEventsRef.current.has(token)) return;
    processedCellEventsRef.current.add(token);

    if (currentCell.type === "CHANCE") {
      setCellEvent({ type: "CHANCE", token, status: "loading" });
      void handleDrawChance(token);
      return;
    }

    setCellEvent({ type: "ROULETTE", token, status: "ready" });
  }, [
    awaitingDiscard,
    currentCell,
    handleDrawChance,
    isLoading,
    pendingChanceChoice,
    pendingRoll,
  ]);

  // 1초마다 틱 - 주사위 충전/문제 제한시간 카운트다운이 서버 재조회 없이도
  // 0에 닿는 순간을 감지하기 위함이다.
  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tickId);
  }, []);

  // 충전 카운트다운이 00:00에 닿으면(새로고침 전까지 canRoll이 그대로 false로
  // 남아있던 문제) 딱 한 번 다시 조회해 서버의 최신 dice 상태를 반영한다.
  useEffect(() => {
    const targetIso = diceStatus?.nextDiceResetAt;
    if (!targetIso) {
      diceResyncedForRef.current = null;
      return;
    }
    if (diceResyncedForRef.current === targetIso) return;

    const remaining = getRemainingSeconds(targetIso, diceStatus, now);
    if (remaining === 0) {
      diceResyncedForRef.current = targetIso;
      syncProgress({ includeCurrentCell: false, preserveDisplayPosition: true });
    }
  }, [diceStatus, now, syncProgress]);

  // 문제 제한시간(solve_deadline_at)이 00:00에 닿았을 때도 동일하게 한 번
  // 재조회한다 - active_challenge/blockedReason이 서버에서 바로 안 바뀌어
  // 있을 수 있어도, 이 재조회가 최신 상태(충전 카운트다운으로 전환 등)를 반영한다.
  useEffect(() => {
    const targetIso = myBoard?.activeChallenge?.solveDeadlineAt;
    if (!targetIso) {
      challengeResyncedForRef.current = null;
      return;
    }
    if (challengeResyncedForRef.current === targetIso) return;

    const remaining = getRemainingSeconds(targetIso, diceStatus, now);
    if (remaining === 0) {
      challengeResyncedForRef.current = targetIso;
      syncProgress({ includeCurrentCell: false, preserveDisplayPosition: true });
    }
  }, [myBoard?.activeChallenge?.solveDeadlineAt, diceStatus, now, syncProgress]);

  const openedChallengesByCell = useMemo(
    () => new Map(openedChallenges.map((entry) => [entry.cellIndex, entry])),
    [openedChallenges],
  );

  const ownedChanceCards = useMemo(
    () => mergeOwnedChanceCards(myBoard?.chanceCards ?? [], chanceCatalog),
    [chanceCatalog, myBoard?.chanceCards],
  );

  const cellStatesByIndex = useMemo(
    () =>
      new Map(
        (myBoard?.cellStates ?? []).map((cellState) => [
          cellState.cellIndex,
          cellState,
        ]),
      ),
    [myBoard?.cellStates],
  );

  const selectedCell = useMemo(
    () =>
      boardDefinition?.cells.find(
        (cell) => cell.cellIndex === selectedCellIndex,
      ) ?? null,
    [boardDefinition?.cells, selectedCellIndex],
  );

  return {
    boardDefinition,
    myBoard,
    diceStatus,
    currentCell,
    displayPosition,
    pendingRoll,
    pendingChanceChoice,
    cellEvent,
    awaitingDiscard,
    ownedChanceCards,
    cellStatesByIndex,
    openedChallengesByCell,
    selectedCell,
    isLoading,
    isMutating,
    error,
    reload: load,
    rollDice: handleRollDice,
    confirmDice: handleConfirmDice,
    openChallenge: handleOpenChallenge,
    moveAirport: handleAirportMove,
    drawChance: handleDrawChance,
    useChanceCard: handleUseChanceCard,
    confirmChance: handleConfirmChance,
    discardChance: handleDiscardChance,
    spinRoulette: handleSpinRoulette,
    closeCellEvent: () => setCellEvent(null),
    selectCell: setSelectedCellIndex,
    clearSelectedCell: () => setSelectedCellIndex(null),
    clearError: () => setError(null),
  };
}
