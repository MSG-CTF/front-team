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
test("부스 경로는 축제 배경 위 메뉴판에서 바로 제출하고 상세 풀이 페이지로 보내지 않는다", () => {
  const source = readFileSync(new URL("./pages/SignatureClubPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<SignatureFestivalScreen/);
  assert.match(source, /useSignatureDetail\(signatureId\)/);
  assert.match(source, /onSubmit: detail\.submit/);
  assert.doesNotMatch(source, /signatureDetail\(|solveTo|<Link/);
  // 처음에는 아직 못 푼 첫 문제를 열고, 정답이면 목록을 비우지 않고 다시 읽는다
  assert.match(source, /club\?\.problems\.find\(problem => !problem\.is_solved\)/);
  assert.match(source, /refresh\(\)/);
  const hook = readFileSync(new URL("./hooks/useSignatures.js", import.meta.url), "utf8");
  assert.match(hook, /if \(!quiet\) setState\(\{ status: "loading", data: \[\], error: "" \}\)/);
  const preview = readFileSync(new URL("./preview/BoothMenuPreviewPage.jsx", import.meta.url), "utf8");
  assert.match(preview, /flagPreview/);
  assert.doesNotMatch(preview, /solveTo/);
});
test("부스 메뉴판 아래 띠에서 플래그를 내고 결과와 풀이 완료를 그 자리에서 보인다", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  try {
    const { default: Modal } = await server.ssrLoadModule("/src/features/signatures/components/BoothMenuModal.jsx");
    const problems = [
      { signature_id: "a", title: "첫 메뉴", is_solved: true },
      { signature_id: "b", title: "둘째 메뉴", is_solved: false },
    ];
    const render = (props) => renderToStaticMarkup(createElement(Modal, { club: { name: "동아리", problems }, status: "success", onClose() {},
      challenge: { title: "둘째 메뉴", score: 150, description: "설명", is_solved: false }, ...props }));
    const flag = { value: "MSG{x}", onChange() {}, onSubmit() {}, busy: false, retrySeconds: 0, solved: false, disabled: false,
      feedback: { type: "error", code: "INCORRECT_FLAG", message: "정답이 아닙니다 플래그를 다시 확인해주세요" } };
    const open = render({ flag, problems, selectedId: "b", onSelect() {} });
    assert.match(open, /<form[^>]*aria-label="플래그 제출"/);
    assert.match(open, /<input[^>]*name="flag"[^>]*value="MSG\{x\}"/);
    assert.match(open, /aria-invalid="true"/);
    assert.match(open, /role="alert">정답이 아닙니다 플래그를 다시 확인해주세요/);
    assert.match(open, /팀 점수에만 반영됩니다 마일리지와 추가 주사위는 지급되지 않습니다/);
    assert.doesNotMatch(open, /href=|플래그 제출하기|문제 다시 보기/);
    // 메뉴가 둘이면 MENU 대신 메뉴 단추를 두고 푼 메뉴에는 체크를 단다
    assert.match(open, /data-menu-tab="true" aria-pressed="false">메뉴 1<span aria-hidden="true"> ✓<\/span>/);
    assert.match(open, /data-menu-tab="true" aria-pressed="true">메뉴 2<span class="sr-only"> 둘째 메뉴<\/span>/);
    assert.doesNotMatch(open, />MENU</);
    const waiting = render({ flag: { ...flag, feedback: null, retrySeconds: 12, disabled: true } });
    assert.match(waiting, /disabled="">12초<\/button>/);
    assert.match(waiting, /12초 후 다시 제출할 수 있습니다/);
    const solved = render({ flag: { ...flag, solved: true, feedback: { type: "success", code: "SUCCESS", message: "정답입니다 팀 점수에 반영됐습니다" } } });
    assert.match(solved, /풀이 완료<\/strong><span>정답입니다 팀 점수에 반영됐습니다/);
    assert.doesNotMatch(solved, /<input|<form/);
    const preview = render({ flagPreview: true });
    assert.match(preview, /<input[^>]*disabled=""/);
    assert.match(preview, /미리보기에서는 제출하지 않습니다/);
    assert.match(render({}), />MENU</);
  } finally { await server.close(); }
});
