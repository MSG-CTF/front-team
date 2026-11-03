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
  // 가로줄이 그려진 원래 패널 대신 줄과 DESCRIPTION 글자를 지운 패널을 9조각으로 쓴다
  assert.doesNotMatch(panel, /rules-panel\.png|rules-panel-clean/);
  assert.match(css, /\.rulesPanel::before \{[^}]*border-image: url\("\/assets\/rules\/rules-panel-blank\.webp"\) 150 70 70 fill \/ 6\.0664cqw 2\.831cqw 2\.831cqw stretch;/);
  assert.match(css, /\.rulesList\s*\{[^}]*overflow-y: auto/);
});

test("넓은 화면의 규칙 판은 RULES 제목 아래 두 단으로 나눠 스크롤 없이 한 판에 담는다", () => {
  const panel = read("./components/RulesPanel.jsx");
  const css = read("./components/RulesScreen.module.css");
  // 문제 상세 판을 그대로 쓰던 DESCRIPTION 대신 같은 Caslon 대문자로 RULES 를 쓴다
  assert.match(panel, /className=\{styles\.panelLabel\} aria-hidden="true">RULES</);
  assert.match(css, /\.panelLabel \{[^}]*font: 400 1\.9cqw\/1 "Detail Caslon"/);
  // 앞 세 항목과 뒤 세 항목을 두 단으로 나란히 두고, 좁은 화면은 두 단 묶음을 풀어 한 줄로 잇는다
  assert.match(panel, /rules\.slice\(0, half\), rules\.slice\(half\)/);
  assert.match(css, /\.rulesList \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.rulesList \{ position: static; grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.rulesList > \* \+ \*, \.rulesColumn > \* \+ \* \{ padding-top: 20px; border-top/);
  // 로고를 2/3 로 줄인 만큼 판을 보드 안쪽 아래까지 키운다 아래를 흐리게 지우던 가림은 쓰지 않는다
  assert.match(css, /\.rulesPanel \{[^}]*top: 29\.5%;[^}]*height: 60%;/);
  assert.match(css, /\.logo \{[^}]*width: 15\.86%;[^}]*height: 28\.19%;/);
  assert.doesNotMatch(css, /mask-image: linear-gradient/);
  assert.match(css, /\.ruleDescription \{[^}]*font-size: clamp\(14px, 1\.1cqw, 22px\);/);
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
