import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { mapChallengeDetail } from "./utils/challengeDetailMapper.js";

let server;
let Screen;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-static-challenge-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  Screen = (await server.ssrLoadModule(
    "/src/features/challenges/components/ChallengeDetailScreen.jsx",
  )).default;
});

after(async () => server?.close());

const driveUrl = "https://drive.google.com/drive/folders/1dXQ_Td4J-vK8BAJh7mHFe6oVh9F1WCQN";

function renderDetail(requiresInstance, readOnly = false, overrides = {}) {
  return renderToStaticMarkup(createElement(Screen, {
    loading: false,
    pageError: null,
    refreshError: null,
    refreshing: false,
    instanceError: null,
    challenge: mapChallengeDetail({
      title: "Is This Job Legit?",
      category: "FORENSIC",
      description: `증거 이미지는 ${driveUrl}에서 받으세요`,
      requires_instance: requiresInstance,
    }),
    submission: { remainingSeconds: null, blocked: false },
    instance: null,
    otherInstance: null,
    controls: { canCreate: true },
    flagValue: "",
    retrySeconds: 0,
    pendingAction: null,
    submitDisabled: false,
    instanceUnavailable: false,
    readOnly,
    ...overrides,
  }));
}

test("관리자 미리보기는 참가자 화면을 쓰면서 제출과 실행 버튼을 모두 비활성화한다", () => {
  const html = renderDetail(true, true);
  for (const label of ["인스턴스 생성", "인스턴스 TTL 연장", "인스턴스 재시작", "인스턴스 종료"]) {
    assert.match(html, new RegExp(`<button(?=[^>]*aria-label="${label}")(?=[^>]*disabled)[^>]*>`));
  }
  assert.match(html, /<input[^>]*disabled/);
});

test("정적 문제는 다운로드 링크와 플래그 제출만 보이고 인스턴스 작업은 숨긴다", () => {
  const html = renderDetail(false);
  assert.match(html, /Is This Job Legit\?/);
  assert.match(html, /href="https:\/\/drive\.google\.com\/drive\/folders\//);
  assert.match(html, /플래그 제출/);
  assert.doesNotMatch(html, /인스턴스 생성|인스턴스 작업|href="#challenge-instance"/);
});

test("실행형 문제는 인스턴스 작업을 계속 보여준다", () => {
  const html = renderDetail(true);
  assert.match(html, /인스턴스 생성/);
  assert.match(html, /href="#challenge-instance"/);
});

test("인스턴스 작업 알림과 조회 오류는 화면 아래 독이 아니라 인스턴스 버튼 바로 뒤에 둔다", () => {
  const html = renderDetail(true, false, {
    instanceFeedback: { type: "success", message: "인스턴스 생성 요청을 접수했습니다" },
    instanceError: { message: "인스턴스 정보를 불러오지 못했습니다" },
  });
  const controls = html.indexOf('aria-label="인스턴스 작업"');
  const flag = html.indexOf('id="challenge-flag"');
  for (const text of ["인스턴스 생성 요청을 접수했습니다", "인스턴스 정보를 불러오지 못했습니다", ">다시 조회<"]) {
    const at = html.indexOf(text);
    assert.ok(controls < at && at < flag, text);
  }
  assert.doesNotMatch(html, /_dock_/);
});

test("인스턴스 성공 알림만 몇 초 뒤 지우고 오류는 남긴다", () => {
  const source = readFileSync(new URL("./components/InstanceNotice.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(feedback\?\.type !== "success"\) return undefined;/);
  assert.match(source, /setTimeout\(\(\) => setHidden\(feedback\), SUCCESS_NOTICE_MS\)/);
  assert.doesNotMatch(source, /setHidden\(error/);
});

test("구버전 백엔드 응답에서는 인스턴스 작업을 유지한다", () => {
  assert.equal(mapChallengeDetail({}).requiresInstance, true);
});
