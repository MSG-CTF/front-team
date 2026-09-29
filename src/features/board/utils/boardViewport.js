import { getBoardCellPosition } from "./boardData.js";

export function getBoardZoomScrollLeft(viewportWidth, boardWidth, cellIndex, trackBounds = null) {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(boardWidth) ||
    viewportWidth <= 0 ||
    boardWidth <= viewportWidth
  ) return 0;

  const { x } = getBoardCellPosition(cellIndex);
  const validBounds = trackBounds && Number.isFinite(trackBounds.left) && Number.isFinite(trackBounds.width) &&
    trackBounds.left >= 0 && trackBounds.width > 0 && trackBounds.left + trackBounds.width <= boardWidth + 1;
  const pieceOffset = validBounds ? trackBounds.left + trackBounds.width * x / 100 : boardWidth * x / 100;
  return Math.max(0, Math.min(boardWidth - viewportWidth, pieceOffset - viewportWidth / 2));
}
