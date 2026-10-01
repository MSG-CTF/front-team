import { useId } from "react";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";

export default function BoardVisitedOverlay({ cells = [], visitedCellIndexes = [] }) {
  const clipId = `board-visited-${useId().replace(/:/g, "")}`;
  const specialIndexes = new Set(cells.filter((cell) => ["CHANCE", "ROULETTE"].includes(cell.type)).map((cell) => cell.cellIndex));
  const visitedCells = [...new Set(visitedCellIndexes)]
    .map((cellIndex) => ({ cellIndex, path: getBoardCellMaskPath(cellIndex) }))
    .filter((cell) => cell.path);

  if (visitedCells.length === 0) return null;

  return (
    <g aria-hidden="true" pointerEvents="none" data-board-visited="true">
      <defs>
        <radialGradient id={`${clipId}-shade`} cx="43%" cy="35%" r="76%">
          <stop offset="0.2" stopColor="#160d08" stopOpacity="0.02" />
          <stop offset="0.65" stopColor="#160d08" stopOpacity="0.14" />
          <stop offset="1" stopColor="#160d08" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`${clipId}-patina`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor="#bca789" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#49352a" stopOpacity="0.02" />
          <stop offset="1" stopColor="#21130c" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {visitedCells.map(({ cellIndex, path }) => (
        <g key={cellIndex} data-visited-surface={cellIndex} data-visited-special={specialIndexes.has(cellIndex) || undefined}>
          <path d={path} fill="#170e0a" fillOpacity={specialIndexes.has(cellIndex) ? "0.44" : "0.62"} data-visited-cell={cellIndex} />
          <path d={path} fill={`url(#${clipId}-shade)`} />
          <path d={path} fill={`url(#${clipId}-patina)`} />
        </g>
      ))}
    </g>
  );
}
