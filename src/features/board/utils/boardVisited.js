import { BOARD_CELL_COUNT } from "./boardData.js";
import { BOARD_CELL_FACE_OUTLINES } from "./boardCellFaces.js";

const VISITED_LABELS = Object.freeze({
  CONSUMED: "방문함",
  OPENED: "방문함, 문제 열림",
  CLEARED: "방문함, 풀이 완료",
});

const SPENT_SPECIAL_LABELS = Object.freeze({
  CHANCE: "방문함, 카드 칸 소모됨",
  ROULETTE: "방문함, 룰렛 칸 소모됨",
});

export function getBoardCellVisitState(cellIndex, consumedCellIndexes, cellStatesByIndex, cellType) {
  const status = cellStatesByIndex?.get(cellIndex)?.status;
  const isConsumed = Array.isArray(consumedCellIndexes) && consumedCellIndexes.includes(cellIndex);
  if (Object.hasOwn(SPENT_SPECIAL_LABELS, cellType)) {
    // 도착 시 칸이 먼저 소모되므로 보상 지급이나 카드 사용 완료로 표시하지 않는다
    return status === "CONSUMED" || isConsumed
      ? { isVisited: true, label: SPENT_SPECIAL_LABELS[cellType] }
      : { isVisited: false, label: "미방문" };
  }
  if (Object.hasOwn(VISITED_LABELS, status)) {
    return { isVisited: true, label: VISITED_LABELS[status] };
  }
  if (isConsumed) {
    return { isVisited: true, label: VISITED_LABELS.CONSUMED };
  }
  // 현재 말 위치나 이동 경로는 방문 이력이 아니다
  return { isVisited: false, label: "미방문" };
}

export function getBoardSpentSpecialCells(cells, consumedCellIndexes, cellStatesByIndex) {
  if (!Array.isArray(cells)) return [];
  const spent = new Map();
  for (const cell of cells) {
    if (!cell || !Object.hasOwn(SPENT_SPECIAL_LABELS, cell.type) ||
      !Number.isInteger(cell.cellIndex) || cell.cellIndex < 1 || cell.cellIndex > BOARD_CELL_COUNT) continue;
    if (getBoardCellVisitState(cell.cellIndex, consumedCellIndexes, cellStatesByIndex, cell.type).isVisited) {
      spent.set(cell.cellIndex, { cellIndex: cell.cellIndex, type: cell.type });
    }
  }
  return [...spent.values()].sort((a, b) => a.cellIndex - b.cellIndex);
}

const MASK_POLYGONS = BOARD_CELL_FACE_OUTLINES.map((points) => points.map((point) => point.join(",")).join(" "));

// 원본의 얇은 곡면 모서리를 각진 삼각형으로 남기지 않도록 최대 2px만 둥글린다
// 확대해도 같은 원본 좌표를 쓰므로 화면별 경계 보정값은 필요하지 않다
const MASK_PATHS = BOARD_CELL_FACE_OUTLINES.map((points) => {
  const toward = (from, to) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const ratio = Math.min(1 / 3, 2 / Math.hypot(dx, dy));
    return [from[0] + dx * ratio, from[1] + dy * ratio];
  };
  const format = (point) => point.map((coordinate) => Number(coordinate.toFixed(2))).join(" ");
  return points.map((point, index) => {
    const before = toward(point, points[(index + points.length - 1) % points.length]);
    const after = toward(point, points[(index + 1) % points.length]);
    return `${index === 0 ? "M" : "L"}${format(before)} Q${format(point)} ${format(after)}`;
  }).join(" ") + " Z";
});

export function getBoardCellMaskPoints(cellIndex) {
  if (!Number.isInteger(cellIndex) || cellIndex < 1 || cellIndex > BOARD_CELL_COUNT) {
    return null;
  }
  return MASK_POLYGONS[cellIndex - 1];
}

export function getBoardCellMaskPath(cellIndex) {
  if (!Number.isInteger(cellIndex) || cellIndex < 1 || cellIndex > BOARD_CELL_COUNT) {
    return null;
  }
  return MASK_PATHS[cellIndex - 1];
}
