import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  confirmDice,
  getBoard,
  getChanceCatalog,
  getCurrentCell,
  getDiceStatus,
  getMyBoard,
  moveAirport,
  openCell,
  rollDice,
} from "../../../api/board.js";
import {
  adaptBoardDefinition,
  adaptChanceCatalog,
  adaptCurrentCell,
  adaptDiceStatus,
  adaptMovementResult,
  adaptMyBoard,
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
  const [boardDefinition, setBoardDefinition] = useState(null);
  const [myBoard, setMyBoard] = useState(null);
  const [diceStatus, setDiceStatus] = useState(null);
  const [currentCell, setCurrentCell] = useState(null);
  const [chanceCatalog, setChanceCatalog] = useState([]);
  const [displayPosition, setDisplayPosition] = useState(null);
  const [pendingRoll, setPendingRoll] = useState(null);
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
      setPendingRoll(null);
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

  const runMutation = useCallback(async (request) => {
    setIsMutating(true);
    setError(null);
    try {
      return await request();
    } catch (requestError) {
      const nextError = getBoardError(requestError);
      if (mountedRef.current) setError(nextError);
      throw requestError;
    } finally {
      if (mountedRef.current) setIsMutating(false);
    }
  }, []);

  const handleRollDice = useCallback(
    () =>
      runMutation(async () => {
        const rollResult = adaptMovementResult(
          unwrapBoardResponse(await rollDice()),
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
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleConfirmDice = useCallback(
    () =>
      runMutation(async () => {
        const confirmResult = adaptMovementResult(
          unwrapBoardResponse(await confirmDice()),
        );
        await animateMovement(confirmResult.movementPath);
        if (mountedRef.current) setPendingRoll(null);
        await syncProgress();
        return confirmResult;
      }),
    [animateMovement, runMutation, syncProgress],
  );

  const handleOpenChallenge = useCallback(
    (challengeId) =>
      runMutation(async () => {
        const openResult = unwrapBoardResponse(await openCell({ challengeId }));
        await syncProgress();
        return {
          cellIndex: openResult.cell_index,
          challengeId: openResult.challenge_id,
          openedAt: openResult.opened_at,
          solveDeadlineAt: openResult.solve_deadline_at,
          remainingSeconds: openResult.remaining_seconds,
        };
      }),
    [runMutation, syncProgress],
  );

  const handleAirportMove = useCallback(
    (destinationIndex) =>
      runMutation(async () => {
        const moveResult = adaptMovementResult(
          unwrapBoardResponse(await moveAirport({ destinationIndex })),
        );
        await animateMovement(moveResult.movementPath);
        await syncProgress();
        return moveResult;
      }),
    [animateMovement, runMutation, syncProgress],
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
    selectCell: setSelectedCellIndex,
    clearSelectedCell: () => setSelectedCellIndex(null),
    clearError: () => setError(null),
  };
}
