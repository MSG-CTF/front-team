import { memo } from "react";
import BoardArtwork from "./BoardArtwork.jsx";
import BoardVisitedOverlay from "./BoardVisitedOverlay.jsx";
import { BOARD_IMAGE_SIZE } from "../utils/boardData.js";

// 원판과 방문 음영은 한 SVG 안에서 함께 축소한다
export default memo(function BoardSurface({ cells, visitedCellIndexes }) {
  return (
    <svg
      viewBox={`0 0 ${BOARD_IMAGE_SIZE.width} ${BOARD_IMAGE_SIZE.height}`}
      role="img"
      aria-label="게임 보드판"
      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      data-board-layer="surface"
    >
      <BoardArtwork cells={cells} />
      <BoardVisitedOverlay cells={cells} visitedCellIndexes={visitedCellIndexes} />
    </svg>
  );
});
