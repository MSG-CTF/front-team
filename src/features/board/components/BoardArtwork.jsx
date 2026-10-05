import { useId } from "react";
import { BOARD_IMAGE_SIZE } from "../utils/boardData.js";
import { getBoardCellMaskPath } from "../utils/boardVisited.js";

// 원판과 방문 음영이 같은 그림을 사용한다.
// 16번 칸은 board-grid 원본에 25번 룰렛 면을 이미 합성해 두어 무인도 문양이 없다.
export default function BoardArtwork({ cells = [], className }) {
  const clipId = `board-chance-${useId().replace(/:/g, "")}`;
  const replacesChance = cells.some((cell) => cell.cellIndex === 7 && cell.type === "CHANCE");

  return (
    <g className={className} data-board-artwork="true">
      <image href="/assets/board/board-grid.webp" width={BOARD_IMAGE_SIZE.width} height={BOARD_IMAGE_SIZE.height} />
      {replacesChance && <>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={getBoardCellMaskPath(7)} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`} data-cell-artwork="7-chance">
          <image href="/assets/board/board-grid.webp" width={BOARD_IMAGE_SIZE.width} height={BOARD_IMAGE_SIZE.height}
            transform="translate(1802 77) scale(-1 1)" />
        </g>
      </>}
    </g>
  );
}
