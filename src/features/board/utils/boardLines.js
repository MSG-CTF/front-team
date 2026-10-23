import { BOARD_CELL_COUNT, BOARD_IMAGE_SIZE, getBoardCellPosition } from "./boardData.js";
import { BOARD_CELL_FACE_OUTLINES } from "./boardCellFaces.js";
import { BOARD_GEM_RAIL_PALETTES } from "./boardGemRail.js";

// 동일한 금속 프레임 위에 얇게 사용하는 저채도 보석색
const LINE_ACCENTS = Object.freeze(BOARD_GEM_RAIL_PALETTES.map(palette => palette.mid));
export const BOARD_LINE_SPECIAL_INDEXES = Object.freeze([1, 7, 16, 21, 25, 30]);
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
  if (!line || line.payoutStatus === "unknown" || line.awaitingConfirmation === true) return null;
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

// 구역과 독점 상태는 바꾸지 않고 기존 대상 칸 순서에 시각 팔레트만 대응한다.
// 완료된 항목만 세지 않으므로 완료 여부나 입력 배열 순서가 바뀌어도 색은 같다.
export function getBoardLineAccentMap(lines) {
  const ordered = [...lines].sort((a, b) => Math.min(...a.cellIndexes) - Math.min(...b.cellIndexes) || a.lineId.localeCompare(b.lineId));
  return new Map(ordered.map((line, index) => {
    const number = line.lineNumber ?? Number(/^line-([1-6])$/.exec(line.lineId)?.[1]);
    return [line.lineId, LINE_ACCENTS[Number.isInteger(number) && number >= 1 && number <= 6 ? number - 1 : index % 6]];
  }));
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

// 서버가 지정한 라인과 현재 팀의 CLEARED 상태만 연결한다
// 지급 확인 응답이 없으므로 완료와 보너스 점수는 만들지 않는다
export function getBoardLineProgress(cells, cellStatesByIndex) {
  if (!Array.isArray(cells) || !(cellStatesByIndex instanceof Map)) return [];
  const grouped = new Map();
  for (const cell of cells) {
    if (cell?.type !== "CHALLENGE" || BOARD_LINE_SPECIAL_INDEXES.includes(cell.cellIndex)) continue;
    if (!Number.isInteger(cell?.lineNumber) || cell.lineNumber < 1 || cell.lineNumber > 6) continue;
    const indexes = grouped.get(cell.lineNumber) ?? [];
    indexes.push(cell.cellIndex);
    grouped.set(cell.lineNumber, indexes);
  }
  return prepareBoardLines([...grouped].filter(([, indexes]) => indexes.length === 5).sort(([left], [right]) => left - right).map(([number, cellIndexes]) => ({
    lineId: `line-${number}`,
    lineNumber: number,
    payoutStatus: "unknown",
    label: `${number}번 라인`,
    cellIndexes,
    solvedCellIndexes: cellIndexes.filter((index) => cellStatesByIndex.get(index)?.status === "CLEARED"),
    isCompleted: false,
    rewardScore: null,
    bonusScore: null,
  })), cells);
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
    const allProblemsCleared = solvedCellIndexes.length === cellIndexes.length;
    const isCompleted = line.payoutStatus !== "unknown" && line.isCompleted === true && allProblemsCleared;
    return {
      lineId: line.lineId, label: line.label, cellIndexes, solvedCellIndexes, isCompleted,
      lineNumber: line.lineNumber,
      payoutStatus: line.payoutStatus,
      allProblemsCleared,
      rewardScore: validScore(line.rewardScore),
      bonusScore: isCompleted ? validScore(line.bonusScore) : null,
      awaitingConfirmation: !isCompleted && solvedCellIndexes.length === cellIndexes.length,
    };
  });
}

const CENTER = { x: 886, y: 665 };

// 같은 라인 색은 유지하되 특수칸에는 rail을 씌우지 않는다.
export function getBoardLineAccentSegments(cellIndexes) {
  if (!Array.isArray(cellIndexes) || cellIndexes.length === 0 ||
    cellIndexes.some((index) => !Number.isInteger(index) || index < 1 || index > BOARD_CELL_COUNT) ||
    new Set(cellIndexes).size !== cellIndexes.length) return [];

  const indexes = [...cellIndexes].sort((a, b) => a - b);
  const runs = [];
  for (const index of indexes) {
    if (runs.length && runs.at(-1).at(-1) + 1 === index) runs.at(-1).push(index);
    else runs.push([index]);
  }
  // 36번 다음 1번도 실제로 인접하므로 배열 순서와 무관하게 연결한다.
  if (runs.length > 1 && indexes[0] === 1 && indexes.at(-1) === BOARD_CELL_COUNT) {
    runs[0] = [...runs.pop(), ...runs[0]];
  }

  const angleOf = (index) => {
    const face = BOARD_CELL_FACE_OUTLINES[index - 1];
    const x = face.reduce((sum, point) => sum + point[0], 0) / face.length;
    const y = face.reduce((sum, point) => sum + point[1], 0) / face.length;
    return Math.atan2((y - CENTER.y) / 630, (x - CENTER.x) / 850);
  };
  const forwardAngle = (from, to) => (to - from + Math.PI * 2) % (Math.PI * 2);
  const format = (point) => point.map((value) => Number(value.toFixed(2))).join(" ");
  return runs.map((run) => {
    const first = run[0];
    const last = run.at(-1);
    const firstAngle = angleOf(first);
    const lastAngle = angleOf(last);
    const startBoundary = firstAngle - forwardAngle(angleOf(first === 1 ? BOARD_CELL_COUNT : first - 1), firstAngle) / 2;
    const fullSpan = run.length === BOARD_CELL_COUNT ? Math.PI * 2 :
      firstAngle - startBoundary + forwardAngle(firstAngle, lastAngle) + forwardAngle(lastAngle, angleOf(last === BOARD_CELL_COUNT ? 1 : last + 1)) / 2;
    // 양 끝을 2도씩 줄여 이웃 라인과 시각적인 간격을 남긴다.
    const inset = Math.min(Math.PI / 90, fullSpan / 4);
    const start = startBoundary + inset;
    const span = fullSpan - inset * 2;
    const steps = Math.max(2, Math.ceil(span / (Math.PI / 72)));
    const points = Array.from({ length: steps + 1 }, (_, index) => getOuterRailPoint(start + span * index / steps));
    // 곡선은 전체 보드 외곽을 따라 흐른다. 각 칸의 옆면이나 내부 경계는 추적하지 않는다.
    const path = `M${format(points[0])} ` + points.slice(1, -1).map((point, index) => {
      const next = points[index + 2];
      return `Q${format(point)} ${format([(point[0] + next[0]) / 2, (point[1] + next[1]) / 2])}`;
    }).join(" ") + ` L${format(points.at(-1))}`;
    return {
      cellIndexes: run,
      startAngle: start,
      endAngle: start + span,
      points,
      path,
    };
  });
}

// 원본 36칸 전체의 외곽 envelope를 한 번 계산한다. 칸별 outline이 아니다.
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const outerBoardHull = (() => {
  const points = BOARD_CELL_FACE_OUTLINES.flat().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (input) => {
    const hull = [];
    for (const point of input) {
      while (hull.length > 1) {
        const a = hull.at(-2);
        const b = hull.at(-1);
        if (cross2([b[0] - a[0], b[1] - a[1]], [point[0] - a[0], point[1] - a[1]]) > 0) break;
        hull.pop();
      }
      hull.push(point);
    }
    return hull.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())];
})();

function getOuterRailPoint(angle) {
  const direction = [850 * Math.cos(angle), 630 * Math.sin(angle)];
  let distance = Infinity;
  outerBoardHull.forEach((point, index) => {
    const next = outerBoardHull[(index + 1) % outerBoardHull.length];
    const edge = [next[0] - point[0], next[1] - point[1]];
    const relative = [point[0] - CENTER.x, point[1] - CENTER.y];
    const divisor = cross2(direction, edge);
    if (Math.abs(divisor) < 1e-9) return;
    const ray = cross2(relative, edge) / divisor;
    const alongEdge = cross2(relative, direction) / divisor;
    if (ray >= 0 && alongEdge >= 0 && alongEdge <= 1) distance = Math.min(distance, ray);
  });
  // 기존 금테 바로 바깥으로 붙인다. 이전 32px 이격을 18px로 줄인다.
  const offset = 18 / Math.hypot(...direction);
  return [CENTER.x + direction[0] * (distance + offset), CENTER.y + direction[1] * (distance + offset)];
}

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

// 열린 문제 패널의 라인 독점 탭 숫자와 요약 칸에 쓴다
// 지급 확인 응답이 없는 동안은 독점 수 대신 모든 문제를 푼 라인 수를 센다
export function getBoardLineCounts(lines) {
  const list = Array.isArray(lines) ? lines : [];
  const payoutUnknown = list.some((line) => line.payoutStatus === "unknown");
  const cleared = list.filter((line) => line.allProblemsCleared).length;
  const completed = list.filter((line) => line.isCompleted).length;
  return { total: list.length, cleared, completed, payoutUnknown, done: payoutUnknown ? cleared : completed };
}

export function getBoardLineStatus(line) {
  if (line.payoutStatus === "unknown" && line.allProblemsCleared) return "풀이 완료 / 지급 미확인";
  if (line.isCompleted) return "독점 완료";
  if (line.awaitingConfirmation) return "완료 확인 중";
  return `${line.solvedCellIndexes.length}/${line.cellIndexes.length} 해결`;
}
