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

  const withoutDigitSpans = html.replace(/<span class="[^"]*descriptionDigits[^"]*">([0-9]+)<\/span>/g, "$1");
  assert.match(withoutDigitSpans, new RegExp(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`));
});

test("설명 속 HTML과 비 HTTPS 주소는 링크나 코드로 실행되지 않는다", () => {
  const html = renderToStaticMarkup(createElement(ChallengeDescriptionPanel, {
    description: '<img src=x onerror=alert(1)> javascript:alert(1)',
  }));

  assert.match(html.replace(/<span[^>]*>([0-9]+)<\/span>/g, "$1"), /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img|href="javascript:/);
});

test("DESCRIPTION의 ASCII 숫자만 감싸고 문장, 줄바꿈, 문단을 유지한다", () => {
  const paragraph = "2026년에 발견된 파일 3개\n시간 12:30 / ABC 1000! １２③";
  const longText = "긴 설명과 English 문장 42. ".repeat(100);
  const html = renderToStaticMarkup(createElement(ChallengeDescriptionPanel, {
    description: `${paragraph}\n\n${longText}`,
  }));
  const body = html.match(/aria-label="문제 설명 본문"[^>]*>([\s\S]*?)<\/div>/)[1];
  const spans = [...body.matchAll(/<span class="([^"]+)">([^<]*)<\/span>/g)];
  assert.deepEqual(spans.slice(0, 5).map((match) => match[2]), ["2026", "3", "12", "30", "1000"]);
  assert.equal(spans.length, 105);
  assert.ok(spans.every((match) => match[1].includes("descriptionDigits") && /^[0-9]+$/.test(match[2])));
  assert.equal(body.replace(/<span[^>]*>([0-9]+)<\/span>/g, "$1"), `<p>${paragraph}</p><p>${longText}</p>`);
  assert.doesNotMatch(html.slice(html.indexOf("첨부파일")), /descriptionDigits/);
});

test("숫자가 없는 설명에는 폰트 span을 추가하지 않는다", () => {
  const html = renderToStaticMarkup(createElement(ChallengeDescriptionPanel, {
    description: "한글 English : ! **기존 텍스트**",
  }));
  assert.doesNotMatch(html, /descriptionDigits/);
  assert.ok(html.includes("한글 English : ! **기존 텍스트**"));
});
