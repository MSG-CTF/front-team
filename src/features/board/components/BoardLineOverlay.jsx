import { getBoardLineAccentMap, getBoardLineAccentSegments, getBoardLineStatus } from "../utils/boardLines.js";
import { BOARD_CELL_COUNT } from "../utils/boardData.js";
import styles from "./BoardScreen.module.css";
import BoardGemRail from "./BoardGemRail.jsx";
import { BOARD_GEM_RAIL_PALETTES } from "../utils/boardGemRail.js";

function LineCells({ line, accent, boardCells, onSelect, selected, isInteractive }) {
  const solved = new Set(line.solvedCellIndexes);
  const segments = line.isCompleted ? getBoardLineAccentSegments(line.cellIndexes, boardCells) : [];
  const palette = BOARD_GEM_RAIL_PALETTES.find(value => value.mid === accent);
  const canInspect = segments.length > 0 && isInteractive;
  const label = `${line.label}, ${getBoardLineStatus(line)}${canInspect ? ", 상세 보기" : ""}`;
  return (
    <g data-line-id={line.lineId} data-completed={line.isCompleted} data-selected={selected} style={{ "--line-accent": accent }}>
      <title>{`${line.label}, ${getBoardLineStatus(line)}`}</title>
      {/* 풀이 상태와 BoardSurface의 방문 음영은 유지하고 완료 표시는 바깥 보석 rail에만 그린다 */}
      {line.cellIndexes.map((cellIndex) => <g key={cellIndex} data-line-cell={cellIndex} data-solved={solved.has(cellIndex)} />)}
      {segments.length > 0 && <g
        className={`${styles.lineAccent} ${canInspect ? styles.lineAccentControl : ""}`}
        data-line-accent={line.lineId} role={canInspect ? "button" : undefined} tabIndex={canInspect ? 0 : undefined}
        aria-label={label} aria-controls={canInspect ? "board-open-challenges-panel" : undefined}
        onClick={canInspect ? () => onSelect?.(line.lineId) : undefined}
        onKeyDown={canInspect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(line.lineId); } } : undefined}>
        <title>{label}</title>
        {segments.map((segment) => <g key={segment.cellIndexes[0]} data-line-segment={segment.cellIndexes.join(",")}>
          <BoardGemRail cellIndexes={segment.cellIndexes} startAngle={segment.startAngle} endAngle={segment.endAngle} palette={palette} isInteractive={canInspect} />
        </g>)}
      </g>}
    </g>
  );
}

export default function BoardLineOverlay({ lines = [], boardCells = [], solvedCellIndexes = [], spentSpecialCells = [], selectedLineId, onSelectLine, isInteractive = true }) {
  const specialCells = [...new Map((Array.isArray(spentSpecialCells) ? spentSpecialCells : [])
    .filter((cell) => cell && ["CHANCE", "ROULETTE"].includes(cell.type) &&
      Number.isInteger(cell.cellIndex) && cell.cellIndex >= 1 && cell.cellIndex <= BOARD_CELL_COUNT)
    .map((cell) => [cell.cellIndex, cell])).values()];
  const specialIndexes = new Set(specialCells.map((cell) => cell.cellIndex));
  const challengeLines = lines.filter((line) => !line.cellIndexes.some((index) => specialIndexes.has(index)));
  const accents = getBoardLineAccentMap(challengeLines);
  // 칸별 풀이 정보는 유지하되 안쪽 면에는 테두리를 추가하지 않는다
  const solvedCells = [...new Set([...(Array.isArray(solvedCellIndexes) ? solvedCellIndexes : []),
    ...challengeLines.flatMap((line) => line.solvedCellIndexes)]
    .filter((cellIndex) => Number.isInteger(cellIndex) && cellIndex >= 1 && cellIndex <= BOARD_CELL_COUNT && !specialIndexes.has(cellIndex)))]
    .sort((a, b) => a - b);
  if (challengeLines.length === 0 && solvedCells.length === 0 && specialCells.length === 0) return null;
  return (
    <svg viewBox="0 0 1772 1330" preserveAspectRatio="xMidYMid meet" className={styles.lineOverlay} role="group" aria-label="문제 풀이, 특수칸 소모 및 라인 완성 현황">
      {specialCells.length > 0 && <g aria-label="소모된 룰렛·카드 칸">
        {specialCells.map(({ cellIndex, type }) => <g key={cellIndex} data-spent-special-cell={cellIndex}>
          <title>{`${cellIndex}번 칸, ${type === "CHANCE" ? "카드" : "룰렛"} 칸 소모됨`}</title>
        </g>)}
      </g>}
      {solvedCells.length > 0 && <g aria-label="풀이 완료 칸">
        {solvedCells.map((cellIndex) => <g key={cellIndex} data-solved-cell={cellIndex}>
          <title>{`${cellIndex}번 칸, 풀이 완료`}</title>
        </g>)}
      </g>}
      {challengeLines.map((line) => <LineCells key={line.lineId} line={line} accent={accents.get(line.lineId)} boardCells={boardCells}
        onSelect={onSelectLine} selected={line.lineId === selectedLineId} isInteractive={isInteractive} />)}
    </svg>
  );
}
