import assert from "node:assert/strict";
import test from "node:test";
import { mergePublications, publicationAttempt, publicationFileLabel } from "./adminPublications.js";

test("publication pairs across pages merge but separate workflow runs stay selectable", () => {
  const old = [{ challenge_slug: "web-test", run_id: 10, artifact_id: 7, has_release_artifact: true, has_files_artifact: false }];
  const files = { challenge_slug: "web-test", run_id: 10, artifact_id: 6, has_release_artifact: false, has_files_artifact: true };
  const merged = mergePublications(old, [files, { ...files, run_id: 9 }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].has_release_artifact, true);
  assert.equal(merged[0].has_files_artifact, true);
  assert.equal(old[0].has_files_artifact, false);
});

test("a failed import keeps its request key; a new preview or difficulty uses another key", () => {
  let counter = 0;
  const key = () => `key-${++counter}`;
  const body = { preview_token: "selected-version", difficulty: "EASY" };
  const first = publicationAttempt(null, body, key);
  assert.equal(publicationAttempt(first, { ...body }, key), first);
  assert.equal(publicationAttempt(first, { ...body, difficulty: "HARD" }, key).key, "key-2");
  assert.equal(publicationAttempt(first, { ...body, preview_token: "new-version" }, key).key, "key-3");
  assert.equal(publicationAttempt(first, { ...body, update_metadata: false }, key), first);
  assert.equal(publicationAttempt(first, { ...body, update_metadata: true }, key).key, "key-4");
});

test("missing artifact is distinguished from a published empty attachment", () => {
  assert.equal(publicationFileLabel({ status: "pending" }), "파일 발행 대기");
  assert.equal(publicationFileLabel({ status: "none" }), "첨부파일 없음");
  assert.equal(publicationFileLabel({ status: "available", file_count: 3, size_bytes: 1024 }), "ZIP 1개 · 파일 3개 · 1 KB");
});
