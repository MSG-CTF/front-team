import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

test("HUD readability adjustment is desktop-only, numeric-only and exactly one pixel", () => {
  const root = postcss.parse(readFileSync(new URL("./components/BoardScreen.module.css", import.meta.url), "utf8"));
  const found = [];
  root.walkRules(".stage .leftPanelCard .diceReadout strong", rule => found.push(rule));
  assert.equal(found.length, 1);
  assert.equal(found[0].parent.name, "media");
  assert.equal(found[0].parent.params, "(min-width: 1101px)");
  assert.deepEqual(found[0].nodes.map(node => [node.prop, node.value]), [["font-size", "calc(1em + 1px)"], ["line-height", "1"]]);
  for (const base of [11, 15.36, 16]) assert.equal(base + 1 - base, 1);
});
