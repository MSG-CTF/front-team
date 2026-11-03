import test from "node:test";
import assert from "node:assert/strict";
import { describeStaticFile, isStaticFileChoice, newerCollectedFile, uncollectedPublication } from "./adminStaticFiles.js";

const file = (revision, sha = String(revision).repeat(40).slice(0, 40), createdAt = `2026-11-0${revision}T00:00:00Z`) =>
  ({ file_id: `file-${revision}`, registry_revision: revision, source_sha: sha, created_at: createdAt, download_available: true });
const publication = (overrides = {}) => ({ challenge_slug: "rev-basic", has_files_artifact: true, workflow_state: "success",
  source_sha: "f".repeat(40), published_at: "2026-11-03T09:00:00Z", artifact_id: 91, ...overrides });

test("파일만 주는 문제에서만 고정을 열고 실행 설정만 있는 문제와 배포 버전은 빼낸다", () => {
  assert.equal(isStaticFileChoice({ release_id: null, status: "available", mode: "LATEST" }), true);
  assert.equal(isStaticFileChoice({ release_id: null, status: "pending", mode: "LATEST" }), true);
  assert.equal(isStaticFileChoice({ release_id: null, status: "no_release", mode: "LATEST" }), false);
  assert.equal(isStaticFileChoice({ release_id: "release-1", status: "available", mode: "MATCH_REVISION" }), false);
  assert.equal(isStaticFileChoice(null), false);
});

test("지금 주는 파일은 감사 로그와 같은 말로 적는다", () => {
  assert.equal(describeStaticFile(file(2), false), "최신 자동 발행 #2");
  assert.equal(describeStaticFile(file(1), true), "발행 #1 고정");
  assert.equal(describeStaticFile(null, true), "없음");
});

test("고정 중일 때만 더 높은 발행번호를 알린다", () => {
  assert.equal(newerCollectedFile({ mode: "SELECTED", current_file: file(1), latest_file: file(3) }).registry_revision, 3);
  assert.equal(newerCollectedFile({ mode: "SELECTED", current_file: file(3), latest_file: file(3) }), null);
  assert.equal(newerCollectedFile({ mode: "LATEST", current_file: file(3), latest_file: file(3) }), null);
});

test("아직 수집되지 않은 이 문제의 가장 새 첨부파일 발행본만 고른다", () => {
  const data = { current_file: file(2), latest_file: file(2), history: [file(1)] };
  const older = publication({ source_sha: "e".repeat(40), published_at: "2026-11-03T08:00:00Z", artifact_id: 90 });
  assert.equal(uncollectedPublication([older, publication()], "rev-basic", data).artifact_id, 91);
  assert.equal(uncollectedPublication([publication({ challenge_slug: "web-basic" })], "rev-basic", data), null);
  assert.equal(uncollectedPublication([publication({ has_files_artifact: false })], "rev-basic", data), null);
  for (const state of ["failed", "running"]) assert.equal(uncollectedPublication([publication({ workflow_state: state })], "rev-basic", data), null);
  // 같은 커밋이 이미 수집됐거나 마지막 수집보다 먼저 발행된 것은 다시 알리지 않는다
  assert.equal(uncollectedPublication([publication({ source_sha: file(1).source_sha })], "rev-basic", data), null);
  assert.equal(uncollectedPublication([publication({ published_at: "2026-11-01T00:00:00Z" })], "rev-basic", data), null);
  // 아무것도 수집되지 않은 문제는 성공한 발행본이 있으면 알린다
  assert.equal(uncollectedPublication([publication()], "rev-basic", { current_file: null, latest_file: null, history: [] }).artifact_id, 91);
  assert.equal(uncollectedPublication([publication()], "", data), null);
});
