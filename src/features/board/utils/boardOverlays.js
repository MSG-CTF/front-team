// 보드 위 오버레이 3종(열린 문제 패널 / 기차여행 목적지 선택 / 마일리지 룰렛) 공용 규칙.
// Figma node 518:300 "열린 문제", 555:342 "기차여행", 555:306 "룰렛".

// 기능 명세(2026-09-28): 룰렛은 50·100·150·200 마일리지 중 하나를 준다.
// Figma 시안의 휠 숫자(20/30/300/500 등)는 명세와 달라 명세 값으로 8칸을 구성한다.
export const ROULETTE_VALUES = Object.freeze([50, 100, 150, 200]);
export const ROULETTE_SEGMENTS = Object.freeze([50, 100, 150, 200, 50, 100, 150, 200]);
export const ROULETTE_SEGMENT_ANGLE = 360 / ROULETTE_SEGMENTS.length;
const ROULETTE_BASE_TURNS = 5;

// 원판 조각과 숫자를 같은 극좌표로 그린다 CSS transform 정렬값과 섞지 않는다
export function getRouletteSegmentGeometry(index) {
  if (!Number.isInteger(index) || index < 0 || index >= ROULETTE_SEGMENTS.length) return null;
  const angle = index * ROULETTE_SEGMENT_ANGLE;
  const labelAngle = angle + ROULETTE_SEGMENT_ANGLE / 2;
  const pointAt = (degrees, radius) => {
    const radians = (degrees - 90) * Math.PI / 180;
    return [160 + Math.cos(radians) * radius, 160 + Math.sin(radians) * radius];
  };
  const start = pointAt(angle, 144);
  const end = pointAt(angle + ROULETTE_SEGMENT_ANGLE, 144);
  const [labelX, labelY] = pointAt(labelAngle, 101);
  return {
    path: `M160 160 L${start.join(" ")} A144 144 0 0 1 ${end.join(" ")} Z`,
    labelX,
    labelY,
    labelAngle,
  };
}

// 휠의 i번째 칸은 [i*각도, (i+1)*각도) 구간(12시 방향 기준 시계방향)에 그려진다.
// 12시 포인터 아래에 targetIndex 칸의 가운데가 오도록 하는 누적 회전각을 돌려준다.
export function getRouletteRotation(mileage, currentRotation = 0, pick = Math.random) {
  const matches = ROULETTE_SEGMENTS.flatMap((value, index) => (value === mileage ? [index] : []));
  if (matches.length === 0) return null;
  const targetIndex = matches[Math.min(matches.length - 1, Math.floor(pick() * matches.length))];
  const segmentCenter = targetIndex * ROULETTE_SEGMENT_ANGLE + ROULETTE_SEGMENT_ANGLE / 2;
  const targetAngle = (360 - segmentCenter) % 360;
  const currentAngle = ((currentRotation % 360) + 360) % 360;
  const delta = (targetAngle - currentAngle + 360) % 360;
  return currentRotation + ROULETTE_BASE_TURNS * 360 + delta;
}

export function getRouletteSegmentAt(rotation) {
  const pointerAngle = (((360 - (rotation % 360)) % 360) + 360) % 360;
  return ROULETTE_SEGMENTS[Math.floor(pointerAngle / ROULETTE_SEGMENT_ANGLE) % ROULETTE_SEGMENTS.length];
}

export function buildRouletteGradient(colors = ["#7a2420", "#f1e2c2"]) {
  const stops = ROULETTE_SEGMENTS.map((_, index) => {
    const color = colors[index % colors.length];
    return `${color} ${index * ROULETTE_SEGMENT_ANGLE}deg ${(index + 1) * ROULETTE_SEGMENT_ANGLE}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// 기차여행(Airport): 팀당 1회, 아직 소모하지 않은 칸으로만 이동할 수 있다.
// 주사위 결과 확정, 카드 선택, 카드 폐기처럼 먼저 끝내야 하는 단계가 있으면 선택 모드를 띄우지 않는다.
export function isAirportSelectionMode({ currentCell, myBoard, pendingRoll, pendingChanceChoice, awaitingDiscard, blockedReason, cellEvent }) {
  return Boolean(
    currentCell?.type === "AIRPORT" &&
      myBoard &&
      !myBoard.airportMoveUsed &&
      !pendingRoll &&
      !pendingChanceChoice &&
      !awaitingDiscard &&
      blockedReason !== "PENDING_CONFIRM" &&
      !cellEvent,
  );
}

export function getAirportSelectableCellIndexes(cells, consumedCellIndexes = [], currentPosition = null) {
  const consumed = new Set(consumedCellIndexes);
  return new Set(
    (cells ?? [])
      .map((cell) => cell.cellIndex)
      .filter((cellIndex) => !consumed.has(cellIndex) && cellIndex !== currentPosition),
  );
}

// 열린 문제 패널 - 연 순서(opened_at 오름차순) 그대로 번호를 붙인다.
export function formatOpenChallengeNumber(index) {
  return String(index + 1).padStart(2, "0");
}
