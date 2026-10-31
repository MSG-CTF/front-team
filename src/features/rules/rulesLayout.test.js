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
  assert.match(screen, /\/assets\/challenge-detail\/panel-board\.webp/);
  assert.match(css, /\.page\s*\{[^}]*background-plaza\.webp/);
  // 가로줄이 그려진 원래 패널 대신 줄을 지운 패널
  assert.doesNotMatch(panel, /rules-panel\.png/);
  assert.match(panel, /rules-panel-clean\.webp/);
  assert.match(css, /\.rulesList\s*\{[^}]*overflow-y: auto/);
});

test("게임 규칙에 문제 서버 제한을 참가 안내와 같은 기준으로 적는다", () => {
  const page = read("./pages/RulesPage.jsx");
  assert.match(page, /title: "문제 서버"/);
  assert.match(page, /팀장·팀원 각자 1개씩, 팀 전체 최대 2개까지 켤 수 있습니다/);
  assert.match(page, /다른 문제에서 새로 생성하면 켜 둔 인스턴스는 종료되고/);
  assert.match(page, /팀원이 켠 인스턴스는 문제 상세에서 접속 주소를 같이 보고 쓸 수 있습니다/);
  const guide = read("../intro/IntroGuidePage.jsx");
  assert.match(guide, /참가자마다 최대 1개, 팀 전체 최대 2개/);
});
