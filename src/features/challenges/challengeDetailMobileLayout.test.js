import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
const mobile = css.split("@media (max-width: 1100px), (max-height: 619px) {")[1]?.split("@media (prefers-reduced-motion")[0];
const desktop = css.split("@media (min-width: 1101px) and (min-height: 620px) {")[1]?.split("\n@media")[0];

// 8비트 RGBA PNG의 알파 값만 읽는다
function readPngAlpha(url) {
  const png = readFileSync(url);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.deepEqual([png[24], png[25], png[28]], [8, 6, 0]);
  const data = [];
  for (let offset = 8; offset < png.length; offset += png.readUInt32BE(offset) + 12) {
    if (png.subarray(offset + 4, offset + 8).toString("ascii") === "IDAT") data.push(png.subarray(offset + 8, offset + 8 + png.readUInt32BE(offset)));
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y ? pixels[(y - 1) * stride + x - 4] : 0;
      const p = left + up - upLeft;
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft) ? left : Math.abs(p - up) <= Math.abs(p - upLeft) ? up : upLeft;
      const predictor = [0, left, up, (left + up) >> 1, paeth][filter];
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, alpha: (x, y) => pixels[y * stride + x * 4 + 3] };
}

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

test("폰에서는 인스턴스 준비 단계를 한 줄에 하나씩 쌓아 이름이 잘리지 않고 PC만 세 칸으로 나눈다", () => {
  assert.match(css, /^\.createSteps\s*\{[^}]*display: grid;/m);
  const columnRules = [...css.matchAll(/\.createSteps\s*\{[^}]*\}/g)].filter(([rule]) => rule.includes("grid-template-columns"));
  assert.equal(columnRules.length, 1);
  assert.match(desktop, /\.createSteps\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
});

test("모바일에서 어둡게 쓰는 난이도 칩 그림은 모서리 바깥이 투명해 네모 테두리가 비치지 않는다", () => {
  assert.match(css, /@media \(max-width: 1100px\), \(max-height: 619px\) \{[^@]*\.pillDifficulty::before\s*\{[^}]*pill-difficulty\.png[^}]*filter: brightness\(\.75\)/);
  const { width, height, alpha } = readPngAlpha(new URL("../../../public/assets/challenge-detail/pill-difficulty.png", import.meta.url));
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1], [1, 1], [width - 2, height - 2]]) {
    assert.ok(alpha(x, y) <= 8, `${x},${y} alpha ${alpha(x, y)}`);
  }
  assert.equal(alpha(width >> 1, height >> 1), 255);
  assert.equal(alpha(4, height >> 1), 255);
});
