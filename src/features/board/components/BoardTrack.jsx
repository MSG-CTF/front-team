import { getBoardCellPosition } from "../utils/boardData.js";

// Figma node 309:78 "BoardGrid"(951x714) + 104:458 "주사위" + 100:454 "람쥐".
// 36칸은 원본 board-grid.png에 합쳐져 있으므로 분해하지 않는다. API의 36개 cell을
// 같은 궤도의 클릭 영역과 상태 표시에 결합하고, 팀 말만 현재 position으로 이동한다.
const CELL_STATE_COLORS = Object.freeze({
  CONSUMED: "bg-[#8d6035]",
  OPENED: "bg-[#2c6b8f]",
  CLEARED: "bg-[#477a38]",
});

export default function BoardTrack({
  cells,
  cellStatesByIndex,
  consumedCellIndexes,
  piecePosition,
  onSelectCell,
  onRollDice,
  canRoll,
  isRolling,
  // 기차여행(Figma 555:342) 목적지 선택 중이면 고를 수 있는 칸 집합, 아니면 null
  selectableCellIndexes = null,
  highlightedCellIndex = null,
}) {
  const pieceCoordinates = getBoardCellPosition(piecePosition);

  return (
    <div className="absolute left-[23.33%] top-[26.76%] w-[49.53%] h-[66.11%]">
      <img
        src="/assets/board/board-grid.png"
        alt="게임 보드판"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {piecePosition != null && (
        <img
          src="/assets/board/piece-squirrel.png"
          alt={`내 팀 말 (현재 ${piecePosition}번 칸)`}
          style={{ left: `${pieceCoordinates.x}%`, top: `${pieceCoordinates.y}%` }}
          className="absolute z-20 w-[12%] -translate-x-1/2 -translate-y-[78%] -scale-x-100 object-contain pointer-events-none transition-[left,top] duration-150 ease-linear"
        />
      )}

      <button
        type="button"
        onClick={onRollDice}
        disabled={!canRoll}
        aria-label={isRolling ? "주사위 처리 중" : "주사위 굴리기"}
        className="absolute left-[37.5%] top-[39%] z-20 w-[22%] h-[16%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:brightness-90"
      >
        <img
          src="/assets/board/dice.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">주사위 굴리기</span>
      </button>

      {cells.map((cell) => {
        const coordinates = getBoardCellPosition(cell.cellIndex);
        const cellState = cellStatesByIndex.get(cell.cellIndex);
        const isConsumed = consumedCellIndexes.includes(cell.cellIndex);
        const stateLabel = cellState?.status || (isConsumed ? "CONSUMED" : "미방문");
        const isSelecting = selectableCellIndexes != null;
        const isSelectable = isSelecting && selectableCellIndexes.has(cell.cellIndex);
        const isHighlighted = highlightedCellIndex === cell.cellIndex;
        const selectionClass = !isSelecting
          ? ""
          : isHighlighted
            ? "shadow-[0_0_0_0.22cqw_#ffe090,0_0_1.2cqw_0.3cqw_rgba(255,214,120,0.9)]"
            : isSelectable
              ? "shadow-[0_0_0_0.12cqw_rgba(255,224,144,0.75),0_0_0.7cqw_rgba(255,214,120,0.55)] hover:shadow-[0_0_0_0.2cqw_#ffe090,0_0_1cqw_rgba(255,214,120,0.85)]"
              : "cursor-not-allowed bg-[#1b0d05]/45";

        return (
          <button
            key={cell.cellIndex}
            type="button"
            onClick={() => onSelectCell(cell.cellIndex)}
            aria-disabled={isSelecting && !isSelectable ? true : undefined}
            aria-pressed={isSelecting ? isHighlighted : undefined}
            aria-label={`${cell.cellIndex}번 ${cell.name || cell.type} 칸, ${stateLabel}${isSelecting ? (isSelectable ? ", 이동 가능" : ", 이동 불가") : ""}`}
            style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
            className={`absolute z-10 h-[11%] w-[8.5%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-0 bg-transparent p-0 cursor-pointer transition-shadow focus-visible:outline focus-visible:outline-[0.2cqw] focus-visible:outline-[#ffe090] ${selectionClass}`}
          >
            {cellState?.status && (
              <span
                className={`absolute right-[3%] top-[4%] h-[0.55cqw] w-[0.55cqw] rounded-full border border-[#f5d793] shadow ${CELL_STATE_COLORS[cellState.status] || "bg-[#8d6035]"}`}
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {cell.cellIndex}번 {cell.name || cell.type} 칸
            </span>
          </button>
        );
      })}
    </div>
  );
}
