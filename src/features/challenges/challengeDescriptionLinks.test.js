import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let ChallengeDescriptionPanel;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-challenge-description-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ChallengeDescriptionPanel = (await server.ssrLoadModule(
    "/src/features/challenges/components/ChallengeDescriptionPanel.jsx",
  )).default;
});

after(async () => server?.close());

test("문제 설명의 Google Drive 주소를 안전한 다운로드 링크로 보여준다", () => {
  const url = "https://drive.google.com/drive/folders/1dXQ_Td4J-vK8BAJh7mHFe6oVh9F1WCQN";
  const html = renderToStaticMarkup(createElement(ChallengeDescriptionPanel, {
    description: `증거 이미지는 아래에서 받으세요.\n${url}`,
  }));

  assert.match(html, new RegExp(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`));
});

test("설명 속 HTML과 비 HTTPS 주소는 링크나 코드로 실행되지 않는다", () => {
  const html = renderToStaticMarkup(createElement(ChallengeDescriptionPanel, {
    description: '<img src=x onerror=alert(1)> javascript:alert(1)',
  }));

  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img|href="javascript:/);
});
