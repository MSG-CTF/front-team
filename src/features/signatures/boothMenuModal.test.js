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
test("문제가 여럿인 부스는 메뉴 단추로 고르고 못 푼 문제부터 열며 정답이면 축제장 목록을 다시 읽는다", async () => {
  const source = readFileSync(new URL("./pages/SignatureClubPage.jsx", import.meta.url), "utf8");
  assert.match(source, /club\?\.problems\.find\(problem => !problem\.is_solved\)/);
  assert.match(source, /refresh\(\)/);
  assert.match(source, /problems=\{club\.problems\} selectedId=\{signatureId\} onSelect=\{onSelect\}/);
  const hook = readFileSync(new URL("./hooks/useSignatures.js", import.meta.url), "utf8");
  assert.match(hook, /if \(!quiet\) setState\(\{ status: "loading", data: \[\], error: "" \}\)/);
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Modal } = await server.ssrLoadModule("/src/features/signatures/components/BoothMenuModal.jsx");
    const problems = [{ signature_id: "a", title: "첫 메뉴", is_solved: true }, { signature_id: "b", title: "둘째 메뉴", is_solved: false }];
    const base = { club: { name: "동아리", problems }, status: "success", onClose() {}, challenge: { title: "둘째 메뉴", score: 150, description: "설명" } };
    const html = renderToStaticMarkup(createElement(Modal, { ...base, problems, selectedId: "b", onSelect() {} }));
    assert.match(html, /data-menu-tab="true" aria-pressed="false">메뉴 1<span aria-hidden="true"> ✓<\/span>/);
    assert.match(html, /data-menu-tab="true" aria-pressed="true">메뉴 2<span class="sr-only"> 둘째 메뉴<\/span>/);
    assert.doesNotMatch(html, />MENU</);
    const single = renderToStaticMarkup(createElement(Modal, { ...base, problems: [problems[1]], selectedId: "b", onSelect() {} }));
    assert.match(single, />MENU</);
    assert.doesNotMatch(single, /data-menu-tab/);
  } finally { await server.close(); }
});
