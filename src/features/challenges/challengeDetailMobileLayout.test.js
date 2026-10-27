import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
const mobile = css.split("@media (max-width: 1100px), (max-height: 619px) {")[1]?.split("@media (prefers-reduced-motion")[0];

test("문제 상세 모바일 레이아웃은 PC 캔버스와 분리하고 safe area를 고려한다", () => {
  assert.ok(mobile);
  assert.match(mobile, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(min-width: 1101px\) and \(min-height: 620px\)/);
  assert.match(mobile, /\.sectionNav\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("모바일 긴 본문과 접속 정보는 잘리지 않고 알림이 입력창을 덮지 않는다", () => {
  assert.match(mobile, /\.descriptionBody\s*\{[^}]*max-height: none;[^}]*overflow: visible;/);
  assert.match(mobile, /\.descriptionBody pre\s*\{[^}]*overflow-x: auto;/);
  assert.match(mobile, /\.connectionText\s*\{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
  assert.match(mobile, /\.dock\s*\{[^}]*position: static;/);
});

test("인스턴스 작업 알림은 PC에서 버튼 줄 바로 위에 뜨고 모바일에서는 버튼 아래 흐름에 남는다", () => {
  const desktop = css.split("@media (min-width: 1101px) and (min-height: 620px) {")[1]?.split("\n@media")[0];
  const controlsTop = Number(/\n {2}\.controls\s*\{[^}]*top: calc\(var\(--u\) \* (\d+)\)/.exec(desktop)?.[1]);
  const noticeBottom = 1080 - Number(/\.instanceNotices\s*\{[^}]*bottom: calc\(var\(--u\) \* (\d+)\)/.exec(desktop)?.[1]);
  assert.ok(noticeBottom <= controlsTop && controlsTop - noticeBottom <= 8, `${noticeBottom} / ${controlsTop}`);
  assert.match(desktop, /\.instanceNotices\s*\{[^}]*pointer-events: none;/);
  assert.doesNotMatch(mobile, /\.instanceNotices/);
  assert.match(css, /^\.instanceNotices\s*\{[^}]*display: grid;/m);
});

test("모바일 파일 다운로드와 입력·확인 버튼의 터치 영역을 유지한다", () => {
  assert.match(mobile, /\.attachmentButton,[\s\S]*?min-height: 44px;/);
  assert.match(mobile, /\.flagInput\s*\{[^}]*font-size: 18px;/);
  assert.match(mobile, /\.submitButton\s*\{[^}]*width: 100%;/);
  assert.match(mobile, /\.confirmDialog\s*\{[^}]*max-height:/);
});
