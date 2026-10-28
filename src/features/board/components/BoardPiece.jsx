import { memo, useRef } from "react";
import { getBoardCellPosition } from "../utils/boardData.js";
import styles from "./BoardScreen.module.css";

export default memo(function BoardPiece({ position, transitionMs }) {
  const previousPosition = useRef(position);
  const hopCount = useRef(0);
  if (position != null && previousPosition.current !== position) hopCount.current += 1;
  previousPosition.current = position;
  if (position == null) return null;
  // 칸이 바뀔 때마다 두 keyframes를 번갈아 써서 리마운트 없이 점프를 다시 시작한다
  const hopClass = hopCount.current === 0 ? "" : hopCount.current % 2 ? styles.boardPieceHopA : styles.boardPieceHopB;
  const coordinates = getBoardCellPosition(position);
  return <img
    src="/assets/board/selection-squirrel-refined.webp"
    alt={`내 팀 말 (현재 ${position}번 칸)`}
    data-board-piece={position}
    draggable={false}
    style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%`, "--piece-transition": transitionMs == null ? undefined : `${transitionMs}ms` }}
    className={`${styles.boardPiece} ${hopClass}`}
  />;
});
