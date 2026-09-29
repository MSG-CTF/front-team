import { BOARD_CELL_COUNT, BOARD_IMAGE_SIZE, getBoardCellPosition } from "./boardData.js";
import { TRAIN_CAR_OFFSETS, TRAIN_FLOOR_PROJECTION, TRAIN_WORLD_SCALE, relativeTrainCarPose } from "./trainLayout.js";

const validCell = (value) => Number.isInteger(value) && value >= 1 && value <= BOARD_CELL_COUNT;

// 이동 응답은 그대로 보존한다 이 경로는 기차 연출에만 쓰며 방문/보상에 반영하지 않는다
export function createTrainJourney(result) {
  if (!validCell(result?.previousPosition) || !validCell(result?.currentPosition)) return null;
  const start = result.previousPosition;
  const end = result.currentPosition;
  if (start === end) return null;
  const reported = (Array.isArray(result.movementPath) ? result.movementPath : []).filter(validCell);
  const cells = [start];
  // 순간이동 응답처럼 목적지만 있어도 보드 바깥 궤도로 달린다
  // 서버가 여러 경유지를 주면 그 순서를 유지한다
  for (const destination of [...reported, end]) {
    let cursor = cells.at(-1);
    if (cursor === destination) continue;
    // 비정상적으로 긴 응답이 브라우저에서 무한 경로를 만들지 않도록 제한한다
    if (cells.length > BOARD_CELL_COUNT * 2) break;
    while (cursor !== destination) {
      cursor = cursor % BOARD_CELL_COUNT + 1;
      cells.push(cursor);
    }
  }
  if (cells.at(-1) !== end) return createTrainJourney({ previousPosition: start, currentPosition: end });
  // 출발 전에 뒤쪽 객차가 놓일 궤도도 포함하되 방문 경로에는 추가하지 않는다
  const leadCount = 10;
  const leadCells = Array.from({ length: leadCount }, (_, index) => (start - 1 - leadCount + index + BOARD_CELL_COUNT) % BOARD_CELL_COUNT + 1);
  const points = [...leadCells, ...cells].map((cellIndex) => {
    const point = getBoardCellPosition(cellIndex);
    return { x: point.x / 100 * BOARD_IMAGE_SIZE.width, y: point.y / 100 * BOARD_IMAGE_SIZE.height, cellIndex };
  });
  const samples = [{ ...points[0], distance: 0 }];
  const curve = (a, b, c, d, t) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[Math.max(0, index - 1)];
    const b = points[index];
    const c = points[index + 1];
    const d = points[Math.min(points.length - 1, index + 2)];
    for (let step = 1; step <= 12; step += 1) {
      const t = step / 12;
      const x = curve(a.x, b.x, c.x, d.x, t);
      const y = curve(a.y, b.y, c.y, d.y, t);
      const previous = samples.at(-1);
      samples.push({ x, y, cellIndex: t < .5 ? b.cellIndex : c.cellIndex, distance: previous.distance + Math.hypot(x - previous.x, (y - previous.y) / TRAIN_FLOOR_PROJECTION) });
    }
  }
  const originDistance = samples[leadCount * 12].distance;
  samples.forEach(sample => { sample.distance -= originDistance; });
  return { cells, samples, distance: samples.at(-1).distance, duration: Math.min(3100, 1250 + (cells.length - 1) * 65) };
}

function sampleDistance(journey, distance) {
  const samples = journey.samples;
  let high = samples.findIndex((sample) => sample.distance >= distance);
  high = Math.max(1, high < 0 ? samples.length - 1 : high);
  const before = samples[high - 1];
  const after = samples[high];
  const fraction = Math.max(0, Math.min(1, (distance - before.distance) / Math.max(.0001, after.distance - before.distance)));
  return {
    x: before.x + (after.x - before.x) * fraction,
    y: before.y + (after.y - before.y) * fraction,
    heading: -Math.atan2((after.y - before.y) / TRAIN_FLOOR_PROJECTION, after.x - before.x),
    cellIndex: after.cellIndex,
    distance,
  };
}

export function sampleTrainJourney(journey, progress) {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const distance = t * t * (3 - 2 * t) * journey.distance;
  const head = sampleDistance(journey, distance);
  const cars = TRAIN_CAR_OFFSETS.map(offset => relativeTrainCarPose(head, sampleDistance(journey, distance - offset * TRAIN_WORLD_SCALE)));
  return { ...head, x: head.x / BOARD_IMAGE_SIZE.width * 100, y: head.y / BOARD_IMAGE_SIZE.height * 100,
    cellIndex: t === 1 ? journey.cells.at(-1) : head.cellIndex, cars };
}

// 장식 실패/화면 종료가 이미 성공한 이동 요청의 오류나 재전송으로 바뀌면 안 된다
export async function presentTrainJourney(result, present, fallback) {
  if (typeof present !== "function") return fallback(result.movementPath);
  try { await present(result); } catch { /* 연출만 생략하고 서버 결과로 동기화 */ }
}
