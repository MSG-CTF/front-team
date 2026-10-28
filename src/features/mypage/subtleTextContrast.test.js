import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

test("subtle contrast overrides are text-only and scoped to QR and mileage history", () => {
  const css = readFileSync(new URL("./components/MyPageScene.module.css", import.meta.url), "utf8");
  const root = postcss.parse(css);
  for (const selector of [".qrIssueButton:disabled span", ".mileageHistory .historyTable"]) {
    const rules = root.nodes.filter(node => node.selector === selector);
    assert.equal(rules.length, 1);
    assert.deepEqual(rules[0].nodes.map(node => node.prop), ["color"]);
  }
  assert.match(css, /--ink-soft: #9b7449;/);
  assert.match(css, /--minus: #9f4343;/);
  assert.match(css, /\.cellPoints\s*\{\s*color: var\(--gold\);/);
  for (const selector of [".qrHint", ".qrStatus"]) {
    const rule = root.nodes.find(node => node.selector === selector);
    assert.equal(rule.nodes.find(node => node.prop === "color").value, "#6f532e");
  }
});
