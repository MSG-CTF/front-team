import { memo } from "react";
import { getBoardCellPosition } from "../utils/boardData.js";
import styles from "./BoardScreen.module.css";

export default memo(function BoardPiece({ position }) {
  if (position == null) return null;
  const coordinates = getBoardCellPosition(position);
  return <img
    src="/assets/board/selection-squirrel-refined.webp"
    alt={`내 팀 말 (현재 ${position}번 칸)`}
    data-board-piece={position}
    draggable={false}
    style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
    className={styles.boardPiece}
  />;
});
