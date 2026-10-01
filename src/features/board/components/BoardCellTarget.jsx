import { memo, useId } from "react";
import { BOARD_IMAGE_SIZE, getBoardCellPosition } from "../utils/boardData.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";
import styles from "./BoardScreen.module.css";

// 클릭 버튼 크기는 유지하고 선택선만 원본 칸의 금테 안쪽 면에 붙인다
export default memo(function BoardCellTarget({ cellIndex }) {
  const clipId = `board-target-${useId().replace(/:/g, "")}`;
  const path = getBoardCellMaskPath(cellIndex);
  if (!path) return null;
  const { x, y } = getBoardCellPosition(cellIndex);
  const width = BOARD_IMAGE_SIZE.width * 0.085;
  const height = BOARD_IMAGE_SIZE.height * 0.11;
  const left = BOARD_IMAGE_SIZE.width * x / 100 - width / 2;
  const top = BOARD_IMAGE_SIZE.height * y / 100 - height / 2;

  return (
    <svg viewBox={`${left} ${top} ${width} ${height}`} className={styles.cellTargetLayer}
      aria-hidden="true" data-cell-target={cellIndex}>
      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={path} /></clipPath></defs>
      <path d={path} clipPath={`url(#${clipId})`} className={styles.cellTargetOutline}
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
});
