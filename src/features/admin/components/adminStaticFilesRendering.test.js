import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let View;
let Notice;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom",
    cacheDir: "node_modules/.vite-static-files-tests", optimizeDeps: { noDiscovery: true, include: [] } });
  const module = await server.ssrLoadModule("/src/features/admin/components/AdminCollectedFilesPanel.jsx");
  View = module.CollectedFilesView; Notice = module.UncollectedNotice;
});
after(async () => server?.close());

const file = (revision, overrides = {}) => ({ file_id: `file-${revision}`, file_name: "user-files.zip", present: true, download_available: true,
  file_size: 2048, file_count: 3, uncompressed_size_bytes: 4096, registry_revision: revision, source_sha: `${revision}`.repeat(40),
  sha256: "a".repeat(64), created_at: `2026-11-0${revision}T00:00:00Z`, ...overrides });
const latest = { status: "available", mode: "LATEST", release_id: null, release_version: null, registry_revision: 2, is_current: false,
  selected_by: null, selected_at: null, current_file: file(2), latest_file: file(2), matching_file: null, history: [file(1)],
  history_has_more: false, history_next_page: null, storage: { provider: "gcs", bucket: "msgctf-files" } };
const pinned = { ...latest, mode: "SELECTED", registry_revision: 1, selected_by: "root", selected_at: "2026-11-03T08:20:00Z",
  current_file: file(1), latest_file: file(3), history: [file(3), file(2)] };
function render(data, overrides = {}) {
  assert.equal(typeof View, "function");
  return renderToStaticMarkup(createElement(View, { data, challengeId: "challenge-1", onChoose() {}, onReason() {}, onConfirm() {}, onCancel() {}, ...overrides }));
}

test("파일만 주는 문제는 최신 자동을 알리고 지금 ZIP과 이전 발행본을 고정할 수 있다", () => {
  const html = render(latest);
  assert.match(html, />최신 자동</);
  assert.match(html, /가장 높은 발행번호의 ZIP을 자동으로 주고/);
  assert.match(html, />이 ZIP으로 고정</);
  assert.match(html, /<details[^>]*open=""/);
  assert.match(html, /<th>참가자 제공<\/th>/);
  assert.match(html, /aria-label="발행 1 ZIP으로 고정"[^>]*>이 ZIP 사용</);
});

test("고정 중이면 누가 언제 고정했는지와 더 높은 발행번호를 보이고 최신 자동으로 돌릴 길을 준다", () => {
  const html = render(pinned);
  assert.match(html, />고정</);
  assert.match(html, /root 고정/);
  assert.match(html, /더 높은 발행 #3이 수집돼 있습니다/);
  assert.equal(html.match(/>최신 자동으로 돌리기</g).length, 1);
  assert.doesNotMatch(html, />이 ZIP으로 고정</);
  assert.match(html, /발행 3 <span[^>]*>최신</);
  // 고정한 ZIP이 가장 높은 발행번호면 지금 카드에서 바로 돌린다
  const top = render({ ...pinned, latest_file: file(1), history: [] });
  assert.doesNotMatch(top, /더 높은 발행/);
  assert.match(top, />최신 자동으로 돌리기</);
});

test("배포 버전이 있는 문제와 실행 설정만 있는 문제에는 고정 단추를 두지 않는다", () => {
  for (const data of [{ ...latest, release_id: "release-1", release_version: 4, mode: "MATCH_REVISION" }, { ...latest, status: "no_release", current_file: null }]) {
    const html = render(data);
    assert.doesNotMatch(html, /이 ZIP으로 고정|이 ZIP 사용|최신 자동|참가자 제공/);
    assert.doesNotMatch(html, /<details[^>]*open=""/);
  }
  assert.match(render({ ...latest, status: "no_release", current_file: null }), /배포 버전을 선택하면/);
});

test("전환 확인은 지금과 바뀔 파일, 사유 칸을 보이고 사유가 길면 막는다", () => {
  const html = render(latest, { choice: { mode: "SELECTED", file: file(1) } });
  assert.match(html, /aria-label="참가자 파일 전환 확인"/);
  assert.match(html, /지금: <strong>최신 자동 발행 #2<\/strong> → <strong>발행 #1 고정<\/strong>/);
  assert.match(html, /전환 사유/);
  assert.match(html, />고정 확인</);
  const back = render(pinned, { choice: { mode: "LATEST" } });
  assert.match(back, /지금: <strong>발행 #1 고정<\/strong> → <strong>최신 자동 발행 #3<\/strong>/);
  assert.doesNotMatch(back, /더 높은 발행 #3이 수집돼 있습니다/);
  const long = render(latest, { choice: { mode: "SELECTED", file: file(1) }, reason: "가".repeat(501) });
  assert.match(long, /role="alert"[^>]*>사유는 500자 이하로 입력해주세요/);
  assert.match(long, /disabled=""[^>]*>고정 확인</);
});

test("아직 수집되지 않은 GitHub 발행본은 가져오기 단추와 함께 알린다", () => {
  assert.equal(typeof Notice, "function");
  const html = renderToStaticMarkup(createElement(Notice, { publication: { source_sha: "f".repeat(40), published_at: "2026-11-03T09:00:00Z" }, onImport() {} }));
  assert.match(html, /GitHub에 아직 수집되지 않은 발행본이 있습니다/);
  assert.match(html, /소스 ffffffff/);
  assert.match(html, />가져오기</);
});
