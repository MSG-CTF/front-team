import { BOARD_CELL_COUNT, BOARD_IMAGE_SIZE, getBoardCellPosition } from "./boardData.js";

// 화면용 모델이며 API 계약이 아니다
// 실제 연동 전까지 라인 묶음, 완료 여부, 지급 점수를 자동으로 만들지 않는다
export function prepareBoardLines(input) {
  if (!Array.isArray(input)) return [];
  const validIndex = (index) => Number.isInteger(index) && index >= 1 && index <= BOARD_CELL_COUNT;
  const candidates = input.filter((line) =>
    line && typeof line.lineId === "string" && line.lineId.trim() &&
    typeof line.label === "string" && line.label.trim() &&
    Array.isArray(line.cellIndexes) && line.cellIndexes.length > 0 &&
    line.cellIndexes.every(validIndex) && new Set(line.cellIndexes).size === line.cellIndexes.length &&
    Array.isArray(line.solvedCellIndexes) && line.solvedCellIndexes.every(validIndex) &&
    line.solvedCellIndexes.every((index) => line.cellIndexes.includes(index)),
  );
  return candidates.filter((line) =>
    candidates.filter((other) => other.lineId === line.lineId).length === 1 &&
    !candidates.some((other) => other !== line && other.cellIndexes.some((index) => line.cellIndexes.includes(index))),
  ).map((line) => {
    const cellIndexes = [...line.cellIndexes].sort((a, b) => a - b);
    const solvedCellIndexes = [...new Set(line.solvedCellIndexes)].sort((a, b) => a - b);
    const isCompleted = line.isCompleted === true && solvedCellIndexes.length === cellIndexes.length;
    return {
      lineId: line.lineId, label: line.label, cellIndexes, solvedCellIndexes, isCompleted,
      bonusScore: isCompleted && Number.isFinite(line.bonusScore) && line.bonusScore >= 0 ? line.bonusScore : null,
      awaitingConfirmation: !isCompleted && solvedCellIndexes.length === cellIndexes.length,
    };
  });
}

const CENTER = { x: 886, y: 665 };

// 숫자와 말을 덮지 않도록 해당 라인의 원판 안쪽 공간에 완료 문장을 둔다
export function getBoardLineBadgePosition(cellIndexes) {
  if (!Array.isArray(cellIndexes) || cellIndexes.length === 0 || cellIndexes.some((index) => !Number.isInteger(index) || index < 1 || index > BOARD_CELL_COUNT)) return null;
  const vectors = cellIndexes.map((index) => {
    const position = getBoardCellPosition(index);
    const angle = Math.atan2((position.y * BOARD_IMAGE_SIZE.height / 100 - CENTER.y) / 590, (position.x * BOARD_IMAGE_SIZE.width / 100 - CENTER.x) / 790);
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
  const sum = vectors.reduce((value, vector) => ({ x: value.x + vector.x, y: value.y + vector.y }), { x: 0, y: 0 });
  // 흩어진 분야별 묶음은 공간 구역으로 오인시키지 않고 현황창에서만 완료를 표시
  if (Math.hypot(sum.x, sum.y) / vectors.length < 0.65) return null;
  const angle = Math.atan2(sum.y, sum.x);
  return { x: CENTER.x + 470 * Math.cos(angle), y: CENTER.y + 350 * Math.sin(angle) };
}

export function getBoardLineStatus(line) {
  if (line.isCompleted) return "독점 완료";
  if (line.awaitingConfirmation) return "완료 확인 중";
  return `${line.solvedCellIndexes.length}/${line.cellIndexes.length} 해결`;
}
