import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { adaptMyBoard, BOARD_CELL_COUNT, BOARD_IMAGE_SIZE, getBoardCellPosition } from "./boardData.js";
import { getBoardCellMaskPath, getBoardCellMaskPoints, getBoardCellVisitState, getBoardSpentSpecialCells } from "./boardVisited.js";

function fromResponse(data) {
  const board = adaptMyBoard(data);
  const states = new Map(board.cellStates.map((cell) => [cell.cellIndex, cell]));
  return (cellIndex) => getBoardCellVisitState(cellIndex, board.consumedCellIndexes, states);
}

test("소모 목록에 있는 일반 칸과 특수 칸을 모두 어둡게 표시한다", () => {
  const visit = fromResponse({ consumed_cell_indexes: [2, 7, 16, 21, 25, 30] });
  for (const cellIndex of [2, 7, 16, 21, 25, 30]) {
    assert.deepEqual(visit(cellIndex), { isVisited: true, label: "방문함" });
  }
  assert.equal(visit(3).isVisited, false);
});

test("문제 열림과 풀이 완료도 방문으로 표시하고 상태 설명을 유지한다", () => {
  const visit = fromResponse({ cell_states: [
    { cell_index: 2, status: "CONSUMED" },
    { cell_index: 3, status: "OPENED" },
    { cell_index: 4, status: "CLEARED" },
  ] });
  assert.deepEqual(visit(2), { isVisited: true, label: "방문함" });
  assert.deepEqual(visit(3), { isVisited: true, label: "방문함, 문제 열림" });
  assert.deepEqual(visit(4), { isVisited: true, label: "방문함, 풀이 완료" });
});

test("현재 위치와 경유 경로만으로 미방문 칸을 소모하지 않는다", () => {
  const visit = fromResponse({ position: 9, movement_path: [5, 6, 7, 8, 9], consumed_cell_indexes: [2] });
  for (const cellIndex of [5, 6, 7, 8, 9]) assert.equal(visit(cellIndex).isVisited, false);
  assert.equal(visit(2).isVisited, true);
});

test("START는 처음 위치만으로 어두워지지 않고 서버가 소모했을 때만 바뀐다", () => {
  assert.equal(fromResponse({ position: 1 })(1).isVisited, false);
  assert.equal(fromResponse({ position: 1, consumed_cell_indexes: [1] })(1).isVisited, true);
});

test("서버에서 방문 기록을 초기화하면 원래 밝기로 되돌아간다", () => {
  assert.equal(fromResponse({ consumed_cell_indexes: [2] })(2).isVisited, true);
  assert.equal(fromResponse({ consumed_cell_indexes: [], cell_states: [] })(2).isVisited, false);
});

test("정보가 없거나 미방문 상태면 방문 표시를 만들지 않는다", () => {
  assert.equal(getBoardCellVisitState(2).isVisited, false);
  for (const status of ["UNVISITED", "UNKNOWN", null]) {
    assert.equal(fromResponse({ cell_states: [{ cell_index: 2, status }] })(2).isVisited, false);
  }
});

test("룰렛과 카드의 소모 표시는 도착 이력이며 보상 지급이나 카드 사용 완료가 아니다", () => {
  for (const [cellIndex, type, label] of [[16, "ROULETTE", "방문함, 룰렛 칸 소모됨"], [7, "CHANCE", "방문함, 카드 칸 소모됨"]]) {
    assert.deepEqual(getBoardCellVisitState(cellIndex, [cellIndex], new Map(), type), { isVisited: true, label });
    assert.deepEqual(getBoardCellVisitState(cellIndex, [], new Map([[cellIndex, { status: "CONSUMED" }]]), type), { isVisited: true, label });
    for (const status of ["OPENED", "CLEARED", "UNKNOWN"]) {
      assert.deepEqual(getBoardCellVisitState(cellIndex, [], new Map([[cellIndex, { status }]]), type), { isVisited: false, label: "미방문" });
      assert.deepEqual(getBoardCellVisitState(cellIndex, [cellIndex], new Map([[cellIndex, { status }]]), type), { isVisited: true, label });
    }
  }
});

test("특수칸 테두리는 실제 칸 종류와 소모 기록만 사용하고 문제나 기차 칸은 제외한다", () => {
  const cells = [
    { cellIndex: 2, type: "CHALLENGE" }, { cellIndex: 7, type: "CHANCE" },
    { cellIndex: 16, type: "ROULETTE" }, { cellIndex: 21, type: "AIRPORT" },
    { cellIndex: 25, type: "CHALLENGE" }, { cellIndex: 30, type: "ROULETTE" },
  ];
  const states = new Map([[16, { status: "CONSUMED" }], [25, { status: "CLEARED" }]]);
  assert.deepEqual(getBoardSpentSpecialCells(cells, [2,7,21,25,30], states), [
    { cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }, { cellIndex: 30, type: "ROULETTE" },
  ]);
});

test("현재 위치와 이벤트 결과나 보유 카드 정보만으로 특수칸 테두리를 만들지 않는다", () => {
  const cells = [{ cellIndex: 7, type: "CHANCE" }, { cellIndex: 16, type: "ROULETTE" }];
  for (const event of [{ status: "ready" }, { status: "loading" }, { status: "error" }, { status: "success", mileageGained: 200 }]) {
    const states = new Map([[7, { ...event, used: true, discarded: true }], [16, { ...event, position: 16, movementPath: [7,16] }]]);
    assert.deepEqual(getBoardSpentSpecialCells(cells, [], states), []);
    assert.equal(getBoardSpentSpecialCells(cells, [7,16], states).length, 2);
  }
});

test("특수칸 기록이 초기화되면 테두리도 사라지고 잘못된 번호나 중복은 표시하지 않는다", () => {
  const cells = [30,7,7,0,37,"16"].map(cellIndex => ({ cellIndex, type: "CHANCE" }));
  assert.deepEqual(getBoardSpentSpecialCells(cells, [30,7,0,37,"16"], new Map()), [
    { cellIndex: 7, type: "CHANCE" }, { cellIndex: 30, type: "CHANCE" },
  ]);
  assert.deepEqual(getBoardSpentSpecialCells(cells, [], new Map()), []);
  for (const data of [undefined, null, {}]) assert.deepEqual(getBoardSpentSpecialCells(data, [7], new Map()), []);
});

const parsePolygon = (points) => points.split(" ").map((point) => point.split(",").map(Number));
function isInside([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test("36개 마스크는 각자의 중심만 감싸고 다른 칸의 중심을 덮지 않는다", () => {
  for (let cellIndex = 1; cellIndex <= BOARD_CELL_COUNT; cellIndex++) {
    const polygon = parsePolygon(getBoardCellMaskPoints(cellIndex));
    assert.ok(polygon.length >= 8, `${cellIndex}번 칸의 개별 윤곽`);
    assert.ok(polygon.flat().every(Number.isFinite));
    for (let other = 1; other <= BOARD_CELL_COUNT; other++) {
      const { x, y } = getBoardCellPosition(other);
      const point = [x / 100 * BOARD_IMAGE_SIZE.width, y / 100 * BOARD_IMAGE_SIZE.height];
      assert.equal(isInside(point, polygon), other === cellIndex, `${cellIndex}번 마스크 / ${other}번 중심`);
    }
  }
});

test("칸 사이 금테와 보석을 공유하지 않고 36개 안쪽 면을 따로 표시한다", () => {
  const faces = Array.from({ length: BOARD_CELL_COUNT }, (_, index) => parsePolygon(getBoardCellMaskPoints(index + 1)));
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let first = 0; first < faces.length; first++) {
    for (let second = first + 1; second < faces.length; second++) {
      const a = faces[first], b = faces[second];
      assert.ok(a.every((point) => !isInside(point, b)), `${first + 1}번과 ${second + 1}번 윤곽 겹침`);
      assert.ok(b.every((point) => !isInside(point, a)), `${second + 1}번과 ${first + 1}번 윤곽 겹침`);
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
          const p = a[i], q = a[(i + 1) % a.length], r = b[j], s = b[(j + 1) % b.length];
          assert.ok(!(cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0), `${first + 1}번과 ${second + 1}번 변 교차`);
        }
      }
    }
  }
  for (const gem of [[750,1130],[729,1275],[614,1108],[553,1229],[198,789],[55,832],[178,619],[33,607],[360,308],[261,226],[739,140],[712,35],[845,133],[840,21],[1056,151],[1093,42],[1155,173],[1211,72],[1423,321],[1523,239],[1596,633],[1740,624],[1563,805],[1709,850],[1257,1077],[1331,1189],[1013,1132],[1033,1275]]) {
    assert.ok(faces.every((polygon) => !isInside(gem, polygon)), `보석 ${gem} 침범`);
  }
});

test("윤곽 경로는 모서리 곡선을 포함하고 원본 그림 밖으로 벗어나지 않는다", () => {
  for (let cellIndex = 1; cellIndex <= BOARD_CELL_COUNT; cellIndex++) {
    const path = getBoardCellMaskPath(cellIndex);
    assert.match(path, /^M/);
    assert.match(path, / Q/);
    assert.match(path, / Z$/);
    assert.doesNotMatch(path, /NaN|Infinity/);
    for (const [x, y] of parsePolygon(getBoardCellMaskPoints(cellIndex))) {
      assert.ok(x > 0 && x < BOARD_IMAGE_SIZE.width);
      assert.ok(y > 0 && y < BOARD_IMAGE_SIZE.height);
    }
  }
});

test("원본 보드 이미지가 바뀌면 칸 윤곽도 다시 검수해야 한다", () => {
  // 2026-10-05: 16번 무인도 면을 25번 룰렛 면으로 교체(칸 윤곽 안쪽만 변경, 금테·좌표는 그대로)
  const source = readFileSync(new URL("../../../../public/assets/board/board-grid.png", import.meta.url));
  assert.equal(createHash("sha256").update(source).digest("hex"), "d73206c69f2f6024fb0ffb92d3e5e7fb349671c754274bd341fbd88a8cc75f23");
});

test("잘못된 칸 번호가 START 마스크로 대체되지 않는다", () => {
  for (const cellIndex of [0, 37, -1, 1.5, "2", null, undefined, NaN]) {
    assert.equal(getBoardCellMaskPoints(cellIndex), null);
    assert.equal(getBoardCellMaskPath(cellIndex), null);
  }
});
