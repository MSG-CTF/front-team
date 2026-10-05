import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOARD_GEM_RAIL_PALETTES, getBoardGemRailGeometry } from "./boardGemRail.js";
import { getBoardLineAccentSegments } from "./boardLines.js";

const groups = [[2,3,4,5,6],[8,9,10,11,12],[13,14,15,17,18],[19,20,22,23,24],[26,27,28,29,31],[32,33,34,35,36]];
const cells = Array.from({length:36}, (_, i) => ({cellIndex:i + 1, type: ({16:"ROULETTE",21:"AIRPORT",30:"CHANCE"})[i + 1] || "CHALLENGE"}));

test("6개의 별도 보석 팔레트에는 청록과 금테보다 짙은 주황갈색 앰버가 있다", () => {
  assert.deepEqual(BOARD_GEM_RAIL_PALETTES.map(p => p.key), ["ruby","sapphire","emerald","amethyst","teal","amber"]);
  assert.equal(new Set(BOARD_GEM_RAIL_PALETTES.map(p => p.mid)).size, 6);
  assert.equal(BOARD_GEM_RAIL_PALETTES[5].mid, "#98502f");
});

test("6개의 rail은 각각 별도 mesh이며 내부 특수칸만 연결하고 다음 구역은 포함하지 않는다", () => {
  const meshes = groups.map(indexes => {
    const segments = getBoardLineAccentSegments(indexes, cells);
    assert.equal(segments.length, 1);
    const mesh = getBoardGemRailGeometry(segments[0].cellIndexes, segments[0]);
    assert.ok(mesh.clipPath);
    assert.doesNotMatch(mesh.clipPath, /NaN|Infinity/);
    assert.doesNotMatch(mesh.strip(17,31), /NaN|Infinity/);
    assert.equal((mesh.strip(17,31).match(/M/g) || []).length, 1);
    assert.ok(mesh.chain.length > 10);
    return mesh;
  });
  assert.deepEqual(meshes[2].visualCellIndexes,[13,14,15,16,17,18]);
  assert.deepEqual(meshes[3].visualCellIndexes,[19,20,21,22,23,24]);
  assert.deepEqual(meshes[4].visualCellIndexes,[26,27,28,29,30,31]);
  const segments = groups.map(indexes => getBoardLineAccentSegments(indexes, cells)[0]);
  for (let i = 0; i < 5; i++) {
    const gap = (segments[i + 1].startAngle - segments[i].endAngle + Math.PI * 2) % (Math.PI * 2);
    assert.ok(gap >= Math.PI / 45 - 1e-8);
  }
  const component = readFileSync(new URL("../components/BoardGemRail.jsx", import.meta.url), "utf8");
  assert.match(component, /clipPath=\{geometry.clipPath \? url\("boundary"\)/);
});

test("모든 색은 같은 금속/bevel과 안쪽 core·약한 bloom을 쓰며 배지나 칸 내부 테두리를 추가하지 않는다", () => {
  const component = readFileSync(new URL("../components/BoardGemRail.jsx", import.meta.url), "utf8");
  assert.match(component,/strip\(17, 31\)/);
  assert.match(component,/strip\(20, 28\)/);
  assert.match(component,/strip\(18.5, 20.5\)/);
  assert.doesNotMatch(component, /strokeWidth|stroke=|feDropShadow|<image|<text|500/);
  assert.match(component, /geometry.strip\(inner - 3, outer - 3\)/);
  assert.match(component, /data-rail-reflection="true"/);
  assert.match(component, /data-rail-bloom="true"/);
  assert.match(component, /data-rail-core="true"/);
  assert.match(component, /feGaussianBlur stdDeviation="2.4"/);
  assert.match(component, /feGaussianBlur stdDeviation="1.1"/);
  assert.equal(new Set(BOARD_GEM_RAIL_PALETTES.map(p => p.bloom)).size, 6);
  assert.equal(getBoardGemRailGeometry([]),null);
  assert.equal(getBoardGemRailGeometry([0,1]),null);
});
