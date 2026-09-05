import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  confirmChanceCard,
  confirmDice,
  createBoardIdempotencyKey,
  discardChanceCard,
  drawChanceCard,
  escapeQuarantine,
  getBoard,
  getChanceCatalog,
  getCurrentCell,
  getDiceStatus,
  getMyBoard,
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
  adaptRouletteResult,
  getBoardError,
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
      const nextCurrentCell = await requestCurrentCell();

      if (!mountedRef.current) return;
      setBoardDefinition(nextBoardDefinition);
      setMyBoard(nextMyBoard);
      setDiceStatus(nextDiceStatus);
      setChanceCatalog(nextCatalog);
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
  }, [requestCurrentCell]);

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
      const nextCurrentCell = includeCurrentCell ? await requestCurrentCell() : null;

      if (!mountedRef.current) return;
      setMyBoard(nextMyBoard);
      setDiceStatus(nextDiceStatus);
      if (includeCurrentCell) setCurrentCell(nextCurrentCell);
      if (!preserveDisplayPosition) setDisplayPosition(nextMyBoard.position);
    },
    [requestCurrentCell],
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
            solveDeadlineAt: openResult.solve_deadline_at,
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

  const handleEscapeQuarantine = useCallback(
    (code) =>
      runMutation({
        actionId: `quarantine-escape:${code}`,
        prefix: "quarantine-escape",
        request: async (idempotencyKey) => {
          const result = unwrapBoardResponse(
            await escapeQuarantine({ code, idempotencyKey }),
          );
          await syncProgress();
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
    escapeQuarantine: handleEscapeQuarantine,
    closeCellEvent: () => setCellEvent(null),
    selectCell: setSelectedCellIndex,
    clearSelectedCell: () => setSelectedCellIndex(null),
    clearError: () => setError(null),
  };
}
