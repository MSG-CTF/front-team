import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let View;
let Panel;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom",
    cacheDir: "node_modules/.vite-image-preparation-tests", optimizeDeps: { noDiscovery: true, include: [] } });
  const module = await server.ssrLoadModule("/src/features/admin/components/AdminImagePreparationPanel.jsx");
  View = module.AdminImagePreparationView; Panel = module.default;
});
after(async () => server?.close());

const release = { release_id: "release-1", version: 3, runtime_type: "KUBERNETES", architecture: "AMD64", isolation_profile: "WEB", is_deployable: true };
const state = { records: [], detail: null, page: 1, count: 0, pageSize: 20, loading: false, submitting: false, loaded: true, error: "", notice: "", ambiguous: false };
const row = { request_id: "request-1", release_id: "release-1", delivery_status: "ACCEPTED", operation_status: "SUCCEEDED",
  operation_id: "operation-1", last_error_code: null, requires_review: false, created_at: "2026-10-28T00:00:00Z", last_checked_at: "2026-10-28T00:01:00Z",
  spec: { target_ids: ["target-1"], architecture: "AMD64" },
  progress: { nodes: [{ node_uid: "node-uid-1", node_name: "node-one", target_id: "target-1", status: "READY",
    images: [{ image: "ghcr.io/example@sha256:abc", status: "READY", error_code: null }] }] } };
function render(overrides = {}) {
  assert.equal(typeof View, "function");
  return renderToStaticMarkup(createElement(View, { release, state, onSubmit() {}, onLoad() {}, onView() {}, ...overrides }));
}

test("selected release offers explicit preparation and history GET refresh without claiming current readiness", () => {
  const html = render();
  assert.match(html, /버전 3 이미지 준비/);
  assert.match(html, /release-1/);
  assert.match(html, />이미지 준비 요청</);
  assert.match(html, />이미지 준비 이력 새로고침</);
  assert.match(html, /현재 노드.*준비 상태.*보증하지 않습니다/);
  assert.match(html, /요청 이력이 없습니다/);
});

test("history and detail preserve raw operation status and label node results as historical", () => {
  const html = render({ state: { ...state, records: [row], detail: row, count: 1 } });
  for (const value of ["request-1", "operation-1", "ACCEPTED", "SUCCEEDED", "node-one", "target-1", "ghcr.io/example@sha256:abc"]) assert.ok(html.includes(value), value);
  assert.match(html, /선택 요청 상태 새로고침/);
  assert.match(html, /과거 작업 결과/);
  assert.doesNotMatch(html, /현재 준비 완료|현재 사용 가능/);
});

test("in-flight, ambiguous, unsupported and failed states give bounded actionable controls", () => {
  assert.match(render({ state: { ...state, submitting: true } }), /disabled=""[^>]*>요청 중…/);
  assert.match(render({ state: { ...state, ambiguous: true } }), /같은 이미지 준비 요청 다시 확인/);
  assert.match(render({ release: { ...release, runtime_type: "DOCKER" } }), /disabled=""[^>]*>이미지 준비 요청/);
  const failed = render({ state: { ...state, error: "Backend 배포 상태를 확인해주세요" } });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Backend 배포 상태/);
});

test("the mounted panel initially renders no credential or configuration inputs", () => {
  assert.equal(typeof Panel, "function");
  const html = renderToStaticMarkup(createElement(Panel, { challengeId: "challenge-1", release }));
  assert.match(html, /이미지 준비/);
  assert.doesNotMatch(html, /<input|<select|<textarea/);
});
