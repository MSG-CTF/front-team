import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BOARD_CELL_COUNT, getBoardCellPosition } from "../utils/boardData.js";
import { getBoardCellVisitState, getBoardSpentSpecialCells } from "../utils/boardVisited.js";
import { getBoardSolvedCellIndexes } from "../utils/boardLines.js";
import { DICE_INTRO_KEY } from "../utils/boardIntro.js";
import BoardLineOverlay from "./BoardLineOverlay.jsx";
import BoardSurface from "./BoardSurface.jsx";
import BoardCellTarget from "./BoardCellTarget.jsx";
import BoardCellTooltip from "./BoardCellTooltip.jsx";
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
  pieceTransitionMs,
  trainTravel,
  startRewardEvent = null,
  onSelectCell,
  onInspectCell,
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
  // 처음 들어올 때 판이 생기는 연출 단계 pending 은 준비를 기다림, playing 은 재생 중, done 은 평소 화면
  assembly = "done",
  onAssemblyReady,
}) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const tooltipId = useId();
  const dismissTooltip = useCallback(() => setHoveredCell(null), []);
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
  const [showIntro, setShowIntro] = useState(() => {
    try { return sessionStorage.getItem(DICE_INTRO_KEY) === "1"; } catch { return false; }
  });
  const visitedCellIndexes = useMemo(() => cells
    .filter((cell) => getBoardCellVisitState(cell.cellIndex, consumedCellIndexes, cellStatesByIndex, cell.type).isVisited)
    .map((cell) => cell.cellIndex), [cells, consumedCellIndexes, cellStatesByIndex]);
  const linesByCell = useMemo(() => new Map(lines.flatMap((line) => line.cellIndexes.map((index) => [index, line]))), [lines]);
  const solvedCellIndexes = useMemo(() => getBoardSolvedCellIndexes(cells, cellStatesByIndex), [cells, cellStatesByIndex]);
  const spentSpecialCells = useMemo(() => getBoardSpentSpecialCells(cells, consumedCellIndexes, cellStatesByIndex), [cells, consumedCellIndexes, cellStatesByIndex]);

  // 3D 주사위까지 준비되면 판이 생기는 연출을 시작한다 무거운 준비가 끝난 뒤라 연출이 끊기지 않는다
  useEffect(() => {
    if (assembly === "pending" && diceReady && cells.length > 0) onAssemblyReady?.();
  }, [assembly, diceReady, cells.length, onAssemblyReady]);
  const startPosition = getBoardCellPosition(1);

  const handleRollDice = async () => {
    if ((!canRoll && !diceAnimationTest) || !diceReady || rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    try { sessionStorage.removeItem(DICE_INTRO_KEY); } catch { /* 저장 불가 시 현재 화면에서만 숨김 */ }
    setShowIntro(false);
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
    <div data-board-layer="track" data-assembly={assembly === "done" ? undefined : assembly} style={{ visibility: isHidden ? "hidden" : undefined }} className={styles.track}>
      <BoardSurface cells={cells} visitedCellIndexes={visitedCellIndexes} />
      <BoardLineOverlay lines={lines} boardCells={cells} solvedCellIndexes={solvedCellIndexes} spentSpecialCells={spentSpecialCells} selectedLineId={selectedLineId} onSelectLine={onSelectLine}
        isInteractive={!isRolling && !rolling && !trainTravel?.journey && selectableCellIndexes == null} />
      {assembly === "playing" && <>
        {/* START 에서 시작한 금빛이 판을 따라 한 바퀴 돌며 칸을 드러내고, 다시 START 에 닿으면 빛난다 */}
        <span className={styles.assemblyGlow} aria-hidden="true" />
        <span className={styles.assemblyStart} style={{ left: `${startPosition.x}%`, top: `${startPosition.y}%` }} aria-hidden="true" />
      </>}
      <BoardStartReward reward={startRewardEvent} />

      {trainTravel?.journey
        ? <BoardTrain journey={trainTravel.journey} onComplete={trainTravel.finish} onProgress={trainTravel.onProgress} onStart={trainTravel.onStart} onStop={trainTravel.onStop} />
        : <BoardPiece position={renderedPiecePosition} transitionMs={pieceTransitionMs} />}

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
        data-board-dice="true"
        className="absolute left-[28%] top-[31%] z-20 w-[44%] h-[32%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:brightness-90"
      >
        <DiceErrorBoundary fallback={<DiceFallback ref={diceRef} onReady={() => setDiceReady(true)} />}>
          <Suspense fallback={<img src="/assets/board/dice.webp" alt="" className="absolute left-[15.91%] top-1/4 w-[68.18%] h-1/2 object-contain" />}>
            <Dice3D ref={diceRef} onReady={() => setDiceReady(true)} />
          </Suspense>
        </DiceErrorBoundary>
        {showIntro && canRoll && diceReady && !isRolling && !rolling && assembly === "done" && (
          <span aria-hidden="true" className={styles.diceIntro}>
            <span className={styles.diceIntroCircle} />
            <span className={styles.diceIntroText}>주사위를 눌러 시작하세요!</span>
          </span>
        )}
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
            onClick={() => {
              dismissTooltip();
              if (!isSelecting && window.matchMedia("(max-width: 1100px)").matches) onInspectCell?.(cell);
              if (!isSelecting || isSelectable) onSelectCell(cell.cellIndex);
            }}
            onPointerEnter={event => {
              if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
              const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
              setHoveredCell({ cell, anchor: { left, right, top, bottom } });
            }}
            onPointerLeave={dismissTooltip}
            onPointerCancel={dismissTooltip}
            aria-describedby={hoveredCell?.cell.cellIndex === cell.cellIndex ? tooltipId : undefined}
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
      {!isHidden && !isRolling && !trainTravel?.journey && <BoardCellTooltip hovered={hoveredCell} id={tooltipId} onDismiss={dismissTooltip} />}
    </div>
  );
}
