import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boothMenuWidth } from "./utils/boothMenuSize.js";

test("부스 메뉴판은 넓은 PC 화면에서 장면 폭에 비례해 커지고 화면 높이 안에 머문다", () => {
  const desktop = { base: 300, grow: 0.26, cap: 520 };
  // 1920×1080 에서 부스 한 채만 한 크기, 1280×720 에서도 원래 300px 보다 크다
  assert.equal(Math.round(boothMenuWidth({ width: 1880, height: 1032, ...desktop })), 489);
  assert.equal(Math.round(boothMenuWidth({ width: 1400, height: 852, ...desktop })), 364);
  assert.equal(Math.round(boothMenuWidth({ width: 1240, height: 672, ...desktop })), 322);
  // 아주 넓어도 520px 을 넘지 않고, 낮은 창에서는 3:4 메뉴판과 제출 칸이 화면 높이에 들어오는 만큼만 큰다
  assert.equal(boothMenuWidth({ width: 3800, height: 2000, ...desktop }), 520);
  assert.equal(Math.round(boothMenuWidth({ width: 2400, height: 600, ...desktop })), 356);
  // 기본 폭보다 작아지지는 않는다
  assert.equal(boothMenuWidth({ width: 1000, height: 300, ...desktop }), 300);
});

test("폰과 키우지 않는 화면은 기본 폭 그대로이고 화면보다 넓어지지 않는다", () => {
  assert.equal(boothMenuWidth({ width: 350, height: 740, base: 390 }), 350);
  assert.equal(boothMenuWidth({ width: 900, height: 900, base: 300 }), 300);
  assert.equal(boothMenuWidth({ width: 900, height: 900, base: 300, grow: 0, cap: 300 }), 300);
});

test("넓은 PC 에서만 키우는 비율을 켜고 메뉴판의 가장 작은 글자는 11px 아래로 내려가지 않는다", () => {
  const css = readFileSync(new URL("./components/BoothMenuModal.module.css", import.meta.url), "utf8");
  assert.match(css, /\.dialog \{ --menu-max: 300px; --menu-grow: 0; --menu-cap: 300px;/);
  assert.match(css, /@media \(min-width: 1101px\) and \(min-height: 620px\) \{ \.dialog \{ --menu-grow: 0\.26; --menu-cap: 520px; \} \}/);
  for (const selector of [".brand", ".kicker", ".description h4"]) {
    const rule = new RegExp(`${selector.replace(/[.]/g, "\\.")} \\{[^}]*font-size: clamp\\(11px,`);
    assert.match(css, rule, selector);
  }
  const modal = readFileSync(new URL("./components/BoothMenuModal.jsx", import.meta.url), "utf8");
  assert.match(modal, /boothMenuWidth\(\{ width, height, base, grow: number\("--menu-grow"\) \|\| 0, cap: number\("--menu-cap"\) \|\| base \}\)/);
});
