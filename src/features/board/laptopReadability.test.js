import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

const declarations = (path, selector) => {
  const root = postcss.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const found = [];
  root.walkRules(selector, (rule) => found.push(Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]))));
  return found;
};

test("노트북(1280·1440)에서 열린 문제 창의 숫자와 머리말은 11px 아래로 내려가지 않는다", () => {
  const board = "./components/BoardScreen.module.css";
  // 문제 10 · 라인 독점 1/6 탭 숫자, 내 인스턴스 1/1 머리말, 문제 번호·라인 도장
  assert.match(declarations(board, ".openTabs button span")[0].font, /^600 max\(11px, 0\.84em\)\/1 /);
  assert.match(declarations(board, ".openInstanceHead")[0].font, /^600 max\(11px, 0\.82em\)\/1\.2 /);
  const badge = declarations(board, ".openRowNo")[0];
  assert.match(badge.font, /^700 max\(11px, 0\.72em\)\/1 /);
  assert.equal(declarations(board, ".lineSeal")[0].font, badge.font);
});

test("KoTH 팀 점수 단위와 카드 이름도 노트북에서 11px 아래로 내려가지 않는다", () => {
  const koth = "../koth/components/KothScreen.module.css";
  assert.match(declarations(koth, ".teamScore small")[0].font, /^400 max\(11px, 0\.82em\)\/1 /);
  assert.equal(declarations(koth, ".challengeCaption")[0]["font-size"], "max(11px, 0.85em)");
});

test("좁은 화면의 황금열쇠 창은 룰렛 창과 같은 세기로 뒤를 덮어 아래 보유 찬스카드 판과 겹쳐 보이지 않는다", () => {
  const root = postcss.parse(readFileSync(new URL("./components/GoldenKeyCard.module.css", import.meta.url), "utf8"));
  const found = [];
  root.walkRules(".overlay", (rule) => found.push(rule));
  const narrow = found.find((rule) => rule.parent.type === "atrule" && rule.parent.params === "(max-width: 1100px)");
  assert.ok(narrow);
  assert.equal(narrow.nodes.find((node) => node.prop === "background").value, "rgba(27, 13, 5, 0.6)");
  const roulette = readFileSync(new URL("./components/MileageRouletteModal.module.css", import.meta.url), "utf8");
  assert.match(roulette, /background: rgba\(27, 13, 5, 0\.6\);/);
});
