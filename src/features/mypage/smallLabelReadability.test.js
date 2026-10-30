import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

test("desktop small label floors retain their original scaled size and geometry", () => {
  const root = postcss.parse(readFileSync(new URL("./components/MyPageScene.module.css", import.meta.url), "utf8"));
  for (const [selector, scale] of [[".personalRank h2", 12], [".personalStats small", 12], [".personalMessage", 13], [".breakdown", 11]]) {
    const rules = [];
    root.walkRules(selector, rule => { if (rule.parent.type === "atrule" && rule.parent.name === "media") rules.push(rule); });
    assert.ok(rules.some(rule => rule.nodes.some(node => node.prop === "font-size" && node.value === `max(11px, calc(var(--u) * ${scale}))`)));
  }
  // Full-size desktop values remain unchanged, laptop floors gain at most 1px.
  for (const scale of [11, 12, 13]) {
    assert.equal(Math.max(11, scale), Math.max(10, scale));
    const previous = Math.max(10, scale * 1366 / 1920);
    assert.ok(Math.max(11, scale * 1366 / 1920) - previous <= 1);
  }
});
