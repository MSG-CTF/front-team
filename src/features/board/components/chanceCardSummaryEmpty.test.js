import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("보유 찬스카드가 없어도 패널은 유지되고 찬스카드 없음을 보여준다", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Summary } = await server.ssrLoadModule("/src/features/board/components/ChanceCardSummary.jsx");
    const html = renderToStaticMarkup(createElement(Summary, { cards: [], cells: [], consumedCellIndexes: [], isMutating: false }));
    assert.ok(html.includes("보유 찬스카드"));
    assert.ok(html.includes("찬스카드 없음"));
    assert.doesNotMatch(html, /<li/);
  } finally { await server.close(); }
});
