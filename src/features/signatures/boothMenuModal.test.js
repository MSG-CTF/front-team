import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
test("부스 경로는 축제 배경 위 모달에서 상세 훅으로 바로 제출하고 별도 풀이 페이지는 없다", () => {
  const source = readFileSync(new URL("./pages/SignatureClubPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<SignatureFestivalScreen/);
  assert.match(source, /useSignatureDetail\(signatureId\)/);
  assert.match(source, /submission=\{detail\}/);
  assert.equal(existsSync(new URL("./pages/SignatureDetailPage.jsx", import.meta.url)), false);
});
test("부스 메뉴는 제출 정보가 있을 때만 플래그 입력칸을 그리고 풀이 완료면 입력칸을 숨긴다", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Modal } = await server.ssrLoadModule("/src/features/signatures/components/BoothMenuModal.jsx");
    const base = { club: { name: "동아리", problems: [] }, status: "success", onClose() {},
      challenge: { title: "문제", score: 100, description: "설명" } };
    const submission = { flag: "", setFlag() {}, submit() {}, disabled: true, busy: false, solved: false, retrySeconds: 0, feedback: null };
    const open = renderToStaticMarkup(createElement(Modal, { ...base, submission }));
    assert.match(open, /<input/);
    assert.ok(open.includes("플래그 제출"));
    const solved = renderToStaticMarkup(createElement(Modal, { ...base, submission: { ...submission, solved: true } }));
    assert.ok(solved.includes("풀이 완료"));
    assert.doesNotMatch(solved, /<input/);
  } finally { await server.close(); }
});
