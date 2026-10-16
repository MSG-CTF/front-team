import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { getAdminChallenge, updateAdminChallenge, getAdminChallengeFlag, revealAdminChallengeFlag, getAdminChallengeFiles, downloadAdminChallengeFile, getAdminChallengeRepositoryFiles, getAdminReleaseFiles, configureChallengeReleaseFiles } from "./admin.js";
import { challengeDetailsDraft, challengeDetailsChanges } from "../features/admin/utils/adminChallengeSettings.js";

test("editing a statement sends only changed basic fields and keeps grading and runtime settings out", () => {
  const challenge = { title: "Example", description: null, category: "WEB", difficulty: "EASY", flag_hash: "hidden", current_score: 500 };
  const draft = challengeDetailsDraft(challenge);
  assert.deepEqual(challengeDetailsChanges(challenge, draft), {});
  assert.deepEqual(challengeDetailsChanges(challenge, { ...draft, title: " Example ", description: "첫 문단\n\n둘째 문단" }), { description: "첫 문단\n\n둘째 문단" });
  assert.deepEqual(challengeDetailsChanges({ ...challenge, description: "이전 지문" }, draft), { description: "" });
});

test("challenge settings use admin routes, explicit flag reveal, and cancellation", async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { code: "SUCCESS" }, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const signal = new AbortController().signal;
    await getAdminChallenge("challenge-a", { signal });
    await getAdminChallengeFlag("challenge-a", { signal });
    await getAdminChallengeFiles("challenge-a", { signal });
    await revealAdminChallengeFlag("challenge-a", { signal });
    await updateAdminChallenge("challenge-a", { title: "새 제목", description: "새 지문" });
    await getAdminChallengeRepositoryFiles("challenge-a", { signal });
    await downloadAdminChallengeFile("challenge-a", "file-b", { signal });
    await getAdminReleaseFiles("challenge-a", "release-c", { signal, params: { page: 2 } });
    await configureChallengeReleaseFiles("challenge-a", "release-c", { mode: "SELECTED", file_id: "file-b" }, "files-retry-key");
    await configureChallengeReleaseFiles("challenge-a", "release-c", { mode: "SELECTED", file_id: "file-b" }, "files-retry-key");
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ["get", "/admin/challenges/challenge-a"], ["get", "/admin/challenges/challenge-a/flag"],
      ["get", "/admin/challenges/challenge-a/files"], ["post", "/admin/challenges/challenge-a/flag/reveal"],
      ["patch", "/admin/challenges/challenge-a"],
      ["get", "/admin/challenges/challenge-a/repository-files"],
      ["get", "/admin/challenges/challenge-a/files/file-b/download"],
      ["get", "/admin/challenges/challenge-a/files"],
      ["post", "/admin/challenges/challenge-a/releases/release-c/files"],
      ["post", "/admin/challenges/challenge-a/releases/release-c/files"],
    ]);
    assert.ok(requests.slice(0, 4).every((request) => request.signal === signal));
    assert.deepEqual(JSON.parse(requests[3].data), {});
    assert.deepEqual(JSON.parse(requests[4].data), { title: "새 제목", description: "새 지문" });
    assert.equal(requests[3].timeout, 15000);
    assert.equal(requests[4].timeout, 15000);
    assert.equal(requests[6].timeout, 60000);
    assert.equal(requests[6].responseType, "blob");
    assert.equal(requests[6].signal, signal);
    assert.deepEqual(requests[7].params, { page: 2, release_id: "release-c" });
    assert.equal(requests[7].signal, signal);
    assert.equal(requests[8].headers.get("Idempotency-Key"), "files-retry-key");
    assert.equal(requests[9].headers.get("Idempotency-Key"), "files-retry-key");
    assert.deepEqual(JSON.parse(requests[8].data), { mode: "SELECTED", file_id: "file-b" });
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
