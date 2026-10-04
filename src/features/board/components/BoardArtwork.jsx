import { useId } from "react";
import { BOARD_IMAGE_SIZE } from "../utils/boardData.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";

// 원판과 방문 음영이 같은 그림을 사용한다.
// 25번 룰렛 면을 16번 면에 투영하며 금테와 보석, 나머지 35칸은 원본을 유지한다.
export default function BoardArtwork({ cells = [], className }) {
  const clipId = `board-roulette-${useId().replace(/:/g, "")}`;
  const replacesCell16 = cells.some((cell) => cell.cellIndex === 16 && cell.type === "ROULETTE");
  const replacesChance = cells.some((cell) => cell.cellIndex === 7 && cell.type === "CHANCE");

  return (
    <g className={className} data-board-artwork="true">
      <image href="/assets/board/board-grid.webp" width={BOARD_IMAGE_SIZE.width} height={BOARD_IMAGE_SIZE.height} />
      {replacesCell16 && <>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={getBoardCellMaskPath(16)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`} data-cell-artwork="16-roulette">
          <image href="/assets/board/board-grid.webp" width={BOARD_IMAGE_SIZE.width} height={BOARD_IMAGE_SIZE.height}
            transform="matrix(0.93366834 0.51356784 -0.0158794 1.01688442 -844.71336683 -965.43135678)" />
        </g>
      </>}
      {replacesChance && <>
        <defs>
          <clipPath id={`${clipId}-chance`} clipPathUnits="userSpaceOnUse">
            <path d={getBoardCellMaskPath(7)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId}-chance)`} data-cell-artwork="7-chance">
          <image href="/assets/board/board-grid.webp" width={BOARD_IMAGE_SIZE.width} height={BOARD_IMAGE_SIZE.height}
            transform="translate(1802 77) scale(-1 1)" />
        </g>
      </>}
    </g>
  );
}
