import { useId } from "react";
import { BOARD_IMAGE_SIZE } from "../utils/boardData.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";
import styles from "./BoardScreen.module.css";
import BoardArtwork from "./BoardArtwork.jsx";

export default function BoardVisitedOverlay({ visitedCellIndexes, cells = [] }) {
  const clipId = `board-visited-${useId().replace(/:/g, "")}`;
  const visitedCells = [...new Set(visitedCellIndexes)]
    .map((cellIndex) => ({ cellIndex, path: getBoardCellMaskPath(cellIndex) }))
    .filter((cell) => cell.path);

  if (visitedCells.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${BOARD_IMAGE_SIZE.width} ${BOARD_IMAGE_SIZE.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={styles.visitedOverlay}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${clipId}-shade`} cx="43%" cy="35%" r="76%">
          <stop offset="0.2" stopColor="#160d08" stopOpacity="0" />
          <stop offset="0.65" stopColor="#160d08" stopOpacity="0.12" />
          <stop offset="1" stopColor="#160d08" stopOpacity="0.46" />
        </radialGradient>
        <linearGradient id={`${clipId}-patina`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor="#bca789" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#49352a" stopOpacity="0.02" />
          <stop offset="1" stopColor="#21130c" stopOpacity="0.2" />
        </linearGradient>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {visitedCells.map(({ cellIndex, path }) => (
            <path key={cellIndex} d={path} data-visited-cell={cellIndex} />
          ))}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <BoardArtwork cells={cells} className={styles.visitedArtwork} />
        {visitedCells.map(({ cellIndex, path }) => (
          <g key={cellIndex} data-visited-surface={cellIndex}>
            <path d={path} fill={`url(#${clipId}-shade)`} />
            <path d={path} fill={`url(#${clipId}-patina)`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
