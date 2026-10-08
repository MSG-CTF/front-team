import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("룰북은 메인 배경 한 장 위에 모서리 마커 없는 누끼 보드와 가로줄 없는 패널만 올린다", () => {
  const screen = read("./components/RulesScreen.jsx");
  const panel = read("./components/RulesPanel.jsx");
  const css = read("./components/RulesScreen.module.css");
  // 풍경+보드가 함께 그려진 그림을 무대에 다시 깔지 않는다(배경 두 겹 방지)
  assert.doesNotMatch(screen, /rules-background\.png/);
  assert.match(screen, /\/assets\/challenge-detail\/panel-board\.png/);
  assert.match(css, /\.page\s*\{[^}]*background-plaza\.png/);
  // 가로줄이 그려진 원래 패널 대신 줄을 지운 패널
  assert.doesNotMatch(panel, /rules-panel\.png/);
  assert.match(panel, /rules-panel-clean\.png/);
  assert.match(css, /\.rulesList\s*\{[^}]*overflow-y: auto/);
});
