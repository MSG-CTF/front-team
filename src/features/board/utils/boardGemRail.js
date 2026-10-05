import { BOARD_CELL_FACE_OUTLINES } from "./boardCellFaces.js";

// 여섯 구역은 같은 금속/면/bevel 구조를 쓰고 보석색만 달리한다.
export const BOARD_GEM_RAIL_PALETTES = Object.freeze([
  { key: "ruby", label: "Ruby / Burgundy", dark: "#491b22", mid: "#8e3e48", light: "#b87172", edge: "#c59387", core: "#ffd6cf", bloom: "#d87887" },
  { key: "sapphire", label: "Sapphire", dark: "#182b45", mid: "#355677", light: "#7197b2", edge: "#a5bbcb", core: "#d5edff", bloom: "#689acf" },
  { key: "emerald", label: "Emerald", dark: "#183b2f", mid: "#3a6955", light: "#78a48c", edge: "#b0c7ad", core: "#dcf4d3", bloom: "#74bd96" },
  { key: "amethyst", label: "Amethyst", dark: "#32213f", mid: "#67477c", light: "#a486b2", edge: "#c3a9ce", core: "#efdcff", bloom: "#ab82cc" },
  { key: "teal", label: "Turquoise / Deep Teal", dark: "#163a40", mid: "#376f77", light: "#79a4a7", edge: "#b3c7bc", core: "#d6f5ee", bloom: "#6fb8bf" },
  { key: "amber", label: "Topaz / Deep Amber", dark: "#4a261b", mid: "#98502f", light: "#c28658", edge: "#d6ac82", core: "#ffe0b8", bloom: "#cf895b" },
].map(Object.freeze));

const CENTER = [886, 665];
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
const normalize = ([x, y]) => { const length = Math.hypot(x, y); return length ? [x / length, y / length] : [0, 0]; };
export const formatRailPoints = values => values.map(p => p.map(v => Number(v.toFixed(2))).join(",")).join(" ");

// 면의 winding을 확인해 바깥쪽 변만 선택한다. 인접 칸의 내부 경계는 포함하지 않는다.
function outerChain(index) {
  const face = BOARD_CELL_FACE_OUTLINES[index - 1];
  const centroid = face.reduce((p, q) => [p[0] + q[0] / face.length, p[1] + q[1] / face.length], [0, 0]);
  const radial = normalize(subtract(centroid, CENTER));
  const area = face.reduce((sum, p, i) => { const q = face[(i + 1) % face.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
  const selected = face.map((point, i) => {
    const [dx, dy] = normalize(subtract(face[(i + 1) % face.length], point));
    const sign = area > 0 ? 1 : -1;
    return sign * (dy * radial[0] - dx * radial[1]) > 0.45;
  });
  const starts = selected.flatMap((value, i) => value && !selected[(i + selected.length - 1) % selected.length] ? [i] : []);
  const runs = starts.map(start => {
    const chain = [face[start]];
    for (let step = 0; step < face.length && selected[(start + step) % face.length]; step++) chain.push(face[(start + step + 1) % face.length]);
    return chain;
  });
  const chain = runs.sort((a, b) => b.length - a.length)[0] || [];
  if (chain.length < 2) return [];
  const angle = point => Math.atan2(point[1] - CENTER[1], point[0] - CENTER[0]);
  const delta = angle(chain.at(-1)) - angle(chain[0]);
  return Math.atan2(Math.sin(delta), Math.cos(delta)) < 0 ? chain.reverse() : chain;
}

function trimEnd(chain, amount) {
  const result = [...chain];
  while (result.length > 1) {
    const direction = subtract(result[1], result[0]);
    const length = Math.hypot(...direction);
    if (length > amount) {
      result[0] = [result[0][0] + direction[0] * amount / length, result[0][1] + direction[1] * amount / length];
      break;
    }
    amount -= length;
    result.shift();
  }
  return result;
}

// 이미 분리/검증된 하나의 run만 만든다. 특수칸 연결은 시각적인 처리만 한다.
export function getBoardGemRailGeometry(cellIndexes, bounds = {}) {
  if (!Array.isArray(cellIndexes) || !cellIndexes.length || new Set(cellIndexes).size !== cellIndexes.length ||
      cellIndexes.some(index => !Number.isInteger(index) || index < 1 || index > 36)) return null;
  const indexes = [cellIndexes[0]];
  while (indexes.at(-1) !== cellIndexes.at(-1) && indexes.length < 36) indexes.push(indexes.at(-1) % 36 + 1);
  let chain = indexes.flatMap(outerChain).filter((point, i, all) => !i || Math.hypot(...subtract(point, all[i - 1])) > 0.01);
  if (chain.length < 2) return null;
  // 양 끝을 짧게 잘라 이웃 라인의 금속 받침끼리도 이어지지 않게 한다.
  chain = trimEnd(trimEnd(chain, 18).reverse(), 18).reverse();
  const offset = distance => chain.map((point, i) => {
    const normal = (a, b) => { const [x, y] = normalize(subtract(b, a)); return [y, -x]; };
    const previous = i ? normal(chain[i - 1], point) : normal(point, chain[i + 1]);
    const next = i + 1 < chain.length ? normal(point, chain[i + 1]) : previous;
    let miter = normalize([previous[0] + next[0], previous[1] + next[1]]);
    if (miter[0] * (point[0] - CENTER[0]) + miter[1] * (point[1] - CENTER[1]) < 0) miter = miter.map(v => -v);
    const scale = Math.min(1.7, 1 / Math.max(0.01, Math.abs(miter[0] * next[0] + miter[1] * next[1])));
    return [point[0] + miter[0] * distance * scale, point[1] + miter[1] * distance * scale];
  });
  let clipPath = null;
  if (Number.isFinite(bounds.startAngle) && Number.isFinite(bounds.endAngle) && bounds.endAngle > bounds.startAngle) {
    const steps = Math.max(2, Math.ceil((bounds.endAngle - bounds.startAngle) / (Math.PI / 36)));
    const outer = Array.from({length:steps + 1}, (_, i) => {
      const angle = bounds.startAngle + (bounds.endAngle - bounds.startAngle) * i / steps;
      return [CENTER[0] + 3400 * Math.cos(angle), CENTER[1] + 2520 * Math.sin(angle)];
    });
    // 각 라인의 기존 시작/끝 각도로 받침도 자른다. 전체를 두르는 공유 rail은 만들지 않는다.
    clipPath = `M${formatRailPoints([CENTER])} L${formatRailPoints(outer)} Z`;
  }
  return { chain, clipPath, visualCellIndexes: indexes, offset, strip: (inner, outer) => roundedRailShape([...offset(inner), ...offset(outer).reverse()]) };
}

function roundedRailShape(vertices, radius = 3) {
  const corners = vertices.map((point, i) => {
    const previous = vertices[(i + vertices.length - 1) % vertices.length];
    const next = vertices[(i + 1) % vertices.length];
    const distance = Math.min(radius, Math.hypot(...subtract(point, previous)) / 3, Math.hypot(...subtract(next, point)) / 3);
    const before = normalize(subtract(previous, point));
    const after = normalize(subtract(next, point));
    return { point, entry: [point[0] + before[0] * distance, point[1] + before[1] * distance], exit: [point[0] + after[0] * distance, point[1] + after[1] * distance] };
  });
  return `M${formatRailPoints([corners[0].entry])} ` + corners.map(({ entry, point, exit }, i) => `${i ? `L${formatRailPoints([entry])} ` : ""}Q${formatRailPoints([point, exit])}`).join(" ") + " Z";
}
