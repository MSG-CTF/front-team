import { BOARD_CELL_COUNT, BOARD_IMAGE_SIZE, getBoardCellPosition } from "./boardData.js";
import { BOARD_CELL_FACE_OUTLINES } from "./boardCellFaces.js";

const LINE_ACCENTS = Object.freeze(["#83b9b2", "#8fbd95", "#bea2d1", "#c78f9c", "#8cafcf", "#d39c85"]);
const validScore = (score) => Number.isFinite(score) && score >= 0 ? (score === 0 ? 0 : score) : null;
export const BOARD_LINE_SCORE_UNIT = "pts";

export function formatBoardLineScoreValue(score) {
  const value = validScore(score);
  if (value === null) return null;
  // 표시 자리수 제한으로 유효 배점을 반올림하거나 0점으로 바꾸지 않는다
  const text = String(value);
  if (text.includes("e-")) return text;
  if (text.includes("e+")) return value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  const [integer, fraction] = text.split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}

export function formatBoardLineScore(score) {
  const value = formatBoardLineScoreValue(score);
  return value === null ? null : `${value} ${BOARD_LINE_SCORE_UNIT}`;
}

// 소수 배점을 합쳐도 0.30000000000000004처럼 보이지 않도록 십진수로 합산한다
function sumKnownScores(scores) {
  if (scores.some((score) => score === null)) return null;
  const parts = scores.map((score) => {
    const [coefficient, exponent = "0"] = String(score).split("e");
    return { digits: BigInt(coefficient.replace(".", "")), scale: (coefficient.split(".")[1]?.length ?? 0) - Number(exponent) };
  });
  const scale = Math.max(0, ...parts.map((part) => part.scale));
  const total = parts.reduce((sum, part) => sum + part.digits * 10n ** BigInt(scale - part.scale), 0n);
  return validScore(Number(`${total}e-${scale}`));
}

// 예정 배점과 지급된 보너스는 다른 값이다 완료 확정 대기는 0점으로 숨기지 않는다
export function getBoardLineEarnedScore(line) {
  if (!line || line.awaitingConfirmation === true) return null;
  return line.isCompleted === true ? validScore(line.bonusScore) : 0;
}

export function getBoardLineScoreTotals(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return { rewardScore: null, earnedScore: null };
  return {
    rewardScore: sumKnownScores(Array.from(lines, (line) => validScore(line?.rewardScore))),
    earnedScore: sumKnownScores(Array.from(lines, getBoardLineEarnedScore)),
  };
}

// 표시 순서가 바뀌어도 같은 라인의 테두리 색은 유지한다
export function getBoardLineAccent(lineId) {
  const hash = Array.from(String(lineId ?? "")).reduce((value, character) => (value * 31 + character.codePointAt(0)) >>> 0, 0);
  return LINE_ACCENTS[hash % LINE_ACCENTS.length];
}

// 라인 계약이 없어도 서버가 정답 처리한 문제 칸은 개별로 표시할 수 있다
export function getBoardSolvedCellIndexes(cells, cellStatesByIndex) {
  if (!Array.isArray(cells) || !(cellStatesByIndex instanceof Map)) return [];
  return [...new Set(cells.filter((cell) =>
    cell?.type === "CHALLENGE" && Number.isInteger(cell.cellIndex) &&
    cell.cellIndex >= 1 && cell.cellIndex <= BOARD_CELL_COUNT &&
    cellStatesByIndex.get(cell.cellIndex)?.status === "CLEARED",
  ).map((cell) => cell.cellIndex))].sort((a, b) => a - b);
}

// 화면용 모델이며 API 계약이 아니다
// 실제 연동 전까지 라인 묶음, 완료 여부, 지급 점수를 자동으로 만들지 않는다
// 칸 소모나 방문 완료는 문제 정답 처리와 별개다
export function prepareBoardLines(input, cells) {
  if (!Array.isArray(input)) return [];
  if (cells !== undefined && !Array.isArray(cells)) return [];
  const validIndex = (index) => Number.isInteger(index) && index >= 1 && index <= BOARD_CELL_COUNT;
  const cellTypes = cells === undefined ? null : new Map();
  for (const cell of cells ?? []) {
    if (!cell || !validIndex(cell.cellIndex)) continue;
    cellTypes.set(cell.cellIndex, cellTypes.has(cell.cellIndex) ? null : cell.type);
  }
  const candidates = input.filter((line) =>
    line && typeof line.lineId === "string" && line.lineId.trim() &&
    typeof line.label === "string" && line.label.trim() &&
    Array.isArray(line.cellIndexes) && line.cellIndexes.length > 0 &&
    line.cellIndexes.every(validIndex) && new Set(line.cellIndexes).size === line.cellIndexes.length &&
    // 특수칸이 섞인 묶음은 임의로 줄여 새 라인으로 만들지 않고 표시에서 제외한다
    (!cellTypes || line.cellIndexes.every((index) => cellTypes.get(index) === "CHALLENGE")) &&
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
      rewardScore: validScore(line.rewardScore),
      bonusScore: isCompleted ? validScore(line.bonusScore) : null,
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

// 라인 가운데 칸의 실제 면 안에 획득 점수를 넣는다
// 가장자리의 기울기와 잘린 모서리를 고려해 세 높이에서 공통으로 들어가는 너비만 쓴다
export function getBoardLineTileLabelPosition(cellIndexes) {
  const region = getBoardLineBadgePosition(cellIndexes);
  if (!region || new Set(cellIndexes).size !== cellIndexes.length) return null;
  const angle = Math.atan2((region.y - CENTER.y) / 350, (region.x - CENTER.x) / 470);
  const cellIndex = [...cellIndexes].sort((a, b) => a - b).reduce((nearest, index) => {
    const distance = (candidate) => {
      const position = getBoardCellPosition(candidate);
      const cellAngle = Math.atan2((position.y * BOARD_IMAGE_SIZE.height / 100 - CENTER.y) / 590, (position.x * BOARD_IMAGE_SIZE.width / 100 - CENTER.x) / 790);
      return Math.abs(Math.atan2(Math.sin(cellAngle - angle), Math.cos(cellAngle - angle)));
    };
    return distance(index) < distance(nearest) ? index : nearest;
  });
  const face = BOARD_CELL_FACE_OUTLINES[cellIndex - 1];
  const candidates = [-45, -30, -15, 0, 15, 30, 45].flatMap((rotation) => {
    const angle = rotation * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localFace = face.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos]);
    const minY = Math.min(...localFace.map((point) => point[1]));
    const maxY = Math.max(...localFace.map((point) => point[1]));
    const y = (minY + maxY) / 2;
    const height = Math.min(70, (maxY - minY) * 0.55);
    const sections = [-height / 2, 0, height / 2].map((offset) => {
      const row = y + offset;
      const intersections = localFace.flatMap((point, index) => {
        const next = localFace[(index + 1) % localFace.length];
        if ((point[1] <= row && next[1] > row) || (next[1] <= row && point[1] > row)) {
          return [point[0] + (row - point[1]) / (next[1] - point[1]) * (next[0] - point[0])];
        }
        return [];
      }).sort((a, b) => a - b);
      return { left: intersections[0], right: intersections.at(-1) };
    });
    if (sections.some((section) => !Number.isFinite(section.left) || !Number.isFinite(section.right))) return [];
    const left = Math.max(...sections.map((section) => section.left)) + 7;
    const right = Math.min(...sections.map((section) => section.right)) - 7;
    if (right - left < 36) return [];
    const x = (left + right) / 2;
    const width = Math.min(126, right - left);
    const legibility = Math.min(height * 0.62, (width - 10) / 2.8) - Math.abs(rotation) * 0.045;
    return [{ cellIndex, x: x * cos - y * sin, y: x * sin + y * cos, width, height, rotation, legibility }];
  });
  const best = candidates.sort((a, b) => b.legibility - a.legibility || Math.abs(a.rotation) - Math.abs(b.rotation))[0];
  if (!best) return null;
  return { cellIndex: best.cellIndex, x: best.x, y: best.y, width: best.width, height: best.height, rotation: best.rotation };
}

export function getBoardLineStatus(line) {
  if (line.isCompleted) return "독점 완료";
  if (line.awaitingConfirmation) return "완료 확인 중";
  return `${line.solvedCellIndexes.length}/${line.cellIndexes.length} 해결`;
}
