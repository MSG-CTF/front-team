import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

const fontSizes = (path, selector) => {
  const root = postcss.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const found = [];
  root.walkRules(selector, (rule) => {
    const size = rule.nodes.find((node) => node.prop === "font-size");
    if (size) found.push({ media: rule.parent.type === "atrule" ? rule.parent.params : "", size: size.value });
  });
  return found;
};

test("대회 안내 카운트다운의 STARTS IN 과 DAYS·HOURS 단위는 PC·폰 모두 11px 아래로 내려가지 않는다", () => {
  for (const selector of [".msg-intro .countdown-caption", ".msg-intro .countdown-clock small"]) {
    const sizes = fontSizes("./intro.css", selector);
    assert.ok(sizes.length >= 2, selector);
    for (const { media, size } of sizes) assert.ok(parseFloat(size) >= 11, `${selector} ${media} ${size}`);
  }
});

test("로그인 화면의 대회 안내 링크는 밝은 하늘 위에서도 읽히게 어두운 바탕을 깔고 누르는 자리는 44px 을 지킨다", () => {
  const root = postcss.parse(readFileSync(new URL("../auth/components/LoginScreen.module.css", import.meta.url), "utf8"));
  const rule = (selector) => {
    let found = null;
    root.walkRules(selector, (item) => { if (item.parent.type === "root") found = Object.fromEntries(item.nodes.map((node) => [node.prop, node.value])); });
    return found;
  };
  const link = rule(".backLink");
  assert.equal(link.background, "rgb(33 21 13 / 60%)");
  assert.equal(link["border-radius"], "999px");
  // 보이는 판 위아래로 넓힌 누르는 자리가 44px 은 된다
  const [blockInset] = rule(".backLink::before").inset.split(" ");
  assert.ok(parseFloat(link["min-height"]) - 2 * parseFloat(blockInset) >= 44);
});
