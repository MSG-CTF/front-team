import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createServer } from "vite";

test("부스 소개 메뉴는 실제 전달 데이터만 표시하고 풀이용 UI를 포함하지 않는다", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Modal } = await server.ssrLoadModule("/src/features/signatures/components/BoothMenuModal.jsx");
    for (const [name, title, score] of [["테스트 동아리 A", "첫 번째 안내", 135], ["다른 동아리", "다른 제목", 987]]) {
      const html = renderToStaticMarkup(createElement(Modal, { club: { name, university: "학교 데이터", problems: [] },
        challenge: { title, score, description: "설명 데이터\n".repeat(100) }, status: "success", onClose() {} }));
      for (const value of [name, title, String(score), "학교 데이터", "설명 데이터"]) assert.ok(html.includes(value));
      assert.doesNotMatch(html, /<select|<input|<form|solves|CREATE|EXTEND|RESTART|STOP|첨부파일/);
    }
  } finally { await server.close(); }
});
test("기존 부스 경로는 축제 배경과 모달을 사용하고 상세 풀이 페이지는 별개로 둔다", () => {
  const source = readFileSync(new URL("./pages/SignatureClubPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<SignatureFestivalScreen/);
  assert.match(source, /useSignatureDetail\(signatureId\)/);
  assert.doesNotMatch(source, /\.submit|FlagSubmitPanel|submitSignatureFlag/);
});
test("부스 메뉴는 상세 풀이 페이지로 가는 제출 단추만 두고 입력칸은 두지 않는다", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Modal } = await server.ssrLoadModule("/src/features/signatures/components/BoothMenuModal.jsx");
    const render = (isSolved) => renderToStaticMarkup(createElement(StaticRouter, { location: "/signatures/clubs/club-1" },
      createElement(Modal, { club: { name: "동아리", problems: [] }, status: "success", solveTo: "/signatures/problem-1", onClose() {},
        challenge: { title: "문제", score: 100, description: "설명", is_solved: isSolved } })));
    const open = render(false);
    assert.match(open, /href="\/signatures\/problem-1"/);
    assert.ok(open.includes("플래그 제출하기"));
    assert.doesNotMatch(open, /<input|<form/);
    assert.ok(render(true).includes("풀이 완료"));
  } finally { await server.close(); }
});
