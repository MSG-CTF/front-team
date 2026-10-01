import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { BOARD_CELL_COUNT, getBoardCellPosition } from "../utils/boardData.js";
import { getBoardCellVisitState, getBoardSpentSpecialCells } from "../utils/boardVisited.js";
import { getBoardSolvedCellIndexes } from "../utils/boardLines.js";
import BoardLineOverlay from "./BoardLineOverlay.jsx";
import BoardSurface from "./BoardSurface.jsx";
import BoardCellTarget from "./BoardCellTarget.jsx";
import BoardPiece from "./BoardPiece.jsx";
import BoardTrain from "./BoardTrain.jsx";
import BoardStartReward from "./BoardStartReward.jsx";
import { DiceErrorBoundary, DiceFallback } from "./DiceFallback.jsx";
import styles from "./BoardScreen.module.css";

const Dice3D = lazy(() => import("./Dice3D.jsx"));

// Figma node 309:78 "BoardGrid"(951x714) + 104:458 "주사위" + 100:454 "람쥐".
// 36칸은 원본 board-grid.png에 합쳐져 있으므로 분해하지 않는다. API의 36개 cell을
// 같은 궤도의 클릭 영역과 상태 표시에 결합하고, 팀 말만 현재 position으로 이동한다.
// Temporary visual-only preview: open the board with ?diceAnimationTest=1 in Vite dev.
// Removing this flag and the branch in handleRollDice removes the test mode.
const diceAnimationTest = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("diceAnimationTest") === "1";
// ?piecePositionTest=all cycles every cell; ?piecePositionTest=17 holds one cell.
const piecePositionTestParam = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("piecePositionTest")
  : null;
const fixedPreviewCell = Number(piecePositionTestParam);
const hasFixedPreviewCell = piecePositionTestParam !== null &&
  Number.isInteger(fixedPreviewCell) && fixedPreviewCell >= 1 && fixedPreviewCell <= BOARD_CELL_COUNT;
const isPiecePositionTest = piecePositionTestParam === "all" || hasFixedPreviewCell;

export default function BoardTrack({
  cells,
  cellStatesByIndex,
  consumedCellIndexes,
  piecePosition,
  trainTravel,
  startRewardEvent = null,
  onSelectCell,
  onRollDice,
  canRoll,
  isRolling,
  lines = [],
  selectedLineId = null,
  onSelectLine,
  // 기차여행(Figma 555:342) 목적지 선택 중이면 고를 수 있는 칸 집합, 아니면 null
  selectableCellIndexes = null,
  highlightedCellIndex = null,
  isHidden = false,
}) {
  const [previewCell, setPreviewCell] = useState(hasFixedPreviewCell ? fixedPreviewCell : 1);
  useEffect(() => {
    if (piecePositionTestParam !== "all") return undefined;
    const timerId = window.setInterval(() => {
      setPreviewCell((cell) => (cell % BOARD_CELL_COUNT) + 1);
    }, 900);
    return () => window.clearInterval(timerId);
  }, []);
  const renderedPiecePosition = isPiecePositionTest ? previewCell : piecePosition;
  const pieceCoordinates = getBoardCellPosition(renderedPiecePosition);
  const diceRef = useRef(null);
  const rollingRef = useRef(false);
  const [rolling, setRolling] = useState(false);
  const [diceReady, setDiceReady] = useState(false);
  const visitedCellIndexes = useMemo(() => cells
    .filter((cell) => getBoardCellVisitState(cell.cellIndex, consumedCellIndexes, cellStatesByIndex, cell.type).isVisited)
    .map((cell) => cell.cellIndex), [cells, consumedCellIndexes, cellStatesByIndex]);
  const linesByCell = useMemo(() => new Map(lines.flatMap((line) => line.cellIndexes.map((index) => [index, line]))), [lines]);
  const solvedCellIndexes = useMemo(() => getBoardSolvedCellIndexes(cells, cellStatesByIndex), [cells, cellStatesByIndex]);
  const spentSpecialCells = useMemo(() => getBoardSpentSpecialCells(cells, consumedCellIndexes, cellStatesByIndex), [cells, consumedCellIndexes, cellStatesByIndex]);

  const handleRollDice = async () => {
    if ((!canRoll && !diceAnimationTest) || !diceReady || rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    try {
      if (diceAnimationTest) {
        const diceA = Math.floor(Math.random() * 6) + 1;
        const diceB = Math.floor(Math.random() * 6) + 1;
        await diceRef.current?.startRoll({ diceA, diceB });
      } else {
        await onRollDice({ onDiceResult: (result) => diceRef.current?.startRoll(result) });
      }
    } finally {
      rollingRef.current = false;
      setRolling(false);
    }
  };

  return (
    <div data-board-layer="track" style={{ visibility: isHidden ? "hidden" : undefined }} className={`${styles.track} absolute left-[23.33%] top-[26.76%] w-[49.53%] h-[66.11%]`}>
      <BoardSurface cells={cells} visitedCellIndexes={visitedCellIndexes} />
      <BoardLineOverlay lines={lines} solvedCellIndexes={solvedCellIndexes} spentSpecialCells={spentSpecialCells} selectedLineId={selectedLineId} onSelectLine={onSelectLine}
        isInteractive={!isRolling && !rolling && !trainTravel?.journey && selectableCellIndexes == null} />
      <BoardStartReward reward={startRewardEvent} />

      {trainTravel?.journey
        ? <BoardTrain journey={trainTravel.journey} onComplete={trainTravel.finish} onProgress={trainTravel.onProgress} onStart={trainTravel.onStart} onStop={trainTravel.onStop} />
        : <BoardPiece position={renderedPiecePosition} />}

      {isPiecePositionTest && (
        <>
          <span
            style={{ left: `${pieceCoordinates.x}%`, top: `${pieceCoordinates.y}%` }}
            className="absolute z-30 aspect-square w-[1.3%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-cyan-300/25 pointer-events-none"
            aria-hidden="true"
          />
          <span className="absolute left-1/2 top-[22%] z-30 -translate-x-1/2 rounded bg-[#2b1609]/90 px-2 py-1 text-sm text-[#fff0c4] pointer-events-none">
            말 위치 검증: {previewCell}/{BOARD_CELL_COUNT}
          </span>
        </>
      )}

      <button
        type="button"
        onClick={handleRollDice}
        disabled={(!canRoll && !diceAnimationTest) || !diceReady || rolling}
        aria-label={isRolling || rolling ? "주사위 처리 중" : "주사위 굴리기"}
        className="absolute left-[28%] top-[31%] z-20 w-[44%] h-[32%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:brightness-90"
      >
        <DiceErrorBoundary fallback={<DiceFallback ref={diceRef} onReady={() => setDiceReady(true)} />}>
          <Suspense fallback={<img src="/assets/board/dice.png" alt="" className="absolute left-[15.91%] top-1/4 w-[68.18%] h-1/2 object-contain" />}>
            <Dice3D ref={diceRef} onReady={() => setDiceReady(true)} />
          </Suspense>
        </DiceErrorBoundary>
        <span className="sr-only">주사위 굴리기</span>
      </button>

      {cells.map((cell) => {
        const coordinates = getBoardCellPosition(cell.cellIndex);
        const cellLine = linesByCell.get(cell.cellIndex);
        const visitState = getBoardCellVisitState(cell.cellIndex, consumedCellIndexes, cellStatesByIndex, cell.type);
        const isSelecting = selectableCellIndexes != null;
        const isSelectable = isSelecting && selectableCellIndexes.has(cell.cellIndex);
        const isHighlighted = highlightedCellIndex === cell.cellIndex;
        const selectionState = !isSelecting ? undefined : !isSelectable ? "unavailable" : isHighlighted ? "selected" : "available";

        return (
          <button
            key={cell.cellIndex}
            type="button"
            disabled={isRolling || Boolean(trainTravel?.journey)}
            onClick={() => { if (!isSelecting || isSelectable) onSelectCell(cell.cellIndex); }}
            tabIndex={isSelecting && !isSelectable ? -1 : undefined}
            aria-disabled={isSelecting && !isSelectable ? true : undefined}
            aria-pressed={isSelecting ? isHighlighted : undefined}
            aria-label={`${cell.cellIndex}번 ${cell.name || cell.type} 칸, ${visitState.label}${cellLine ? `, ${cellLine.label}${cellLine.isCompleted ? ", 라인 독점 완료" : ""}` : ""}${isSelecting ? (isSelectable ? ", 이동 가능" : ", 이동 불가") : ""}`}
            data-visited={visitState.isVisited}
            data-selection-state={selectionState}
            style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
            className={styles.boardCellButton}
          >
            <BoardCellTarget cellIndex={cell.cellIndex} />
            <span className="sr-only">
              {cell.cellIndex}번 {cell.name || cell.type} 칸
            </span>
          </button>
        );
      })}
    </div>
  );
}
