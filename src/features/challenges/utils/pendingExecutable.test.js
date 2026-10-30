import test from "node:test";
import assert from "node:assert/strict";
import { executableIntent } from "./pendingExecutable.js";
import { currentQueuePosition, isActiveRun, mapRemoteRun, mapRemoteRuns } from "./remoteRun.js";
import { remoteRunChanges, remoteRunDraft } from "../../admin/utils/adminRemoteRun.js";

const requestId = "5e32b846-2c35-47b4-85bb-4cf089338230";
const digest = "a".repeat(64);

test("team queue positions expire without changing the active execution slot", () => {
  const observed = "2026-10-28T07:00:00Z", now = Date.parse(observed);
  const run = mapRemoteRun({ submission_id: "queued", status: "QUEUED", queue_policy: "TEAM_FIFO", queue_position: 3, queue_observed_at: observed });
  assert.equal(currentQueuePosition(run, now), 3);
  assert.equal(currentQueuePosition(run, now + 15000), 3);
  assert.equal(currentQueuePosition(run, now + 15001), null);
  assert.equal(currentQueuePosition(run, now - 1), null);
  assert.equal(currentQueuePosition({ ...run, queueObservedAt: null }, now), null);
  assert.equal(currentQueuePosition({ ...run, status: "RUNNING" }, now), null);
  assert.equal(isActiveRun(run), true);
  for (const queue_position of [true, -1, 0, "3", 1.5])
    assert.equal(currentQueuePosition(mapRemoteRun({ submission_id: "bad", status: "QUEUED", queue_position }), now), null);
});
const store = () => {
  const data = new Map();
  return { getItem: (id) => data.get(id) ?? null, setItem: (id, value) => data.set(id, value), removeItem: (id) => data.delete(id) };
};
const options = (storage, values = {}) => ({ userId: "user", teamId: "team", challengeId: "challenge", storage, createKey: () => requestId, ...values });

test("response loss, reload and a second tab retain the original executable request key", () => {
  const storage = store();
  const first = executableIntent(options(storage)).prepare(digest);
  const secondTab = executableIntent(options(storage, { createKey: () => { throw new Error("must reuse key"); } }));
  assert.deepEqual(secondTab.prepare(digest), first);
  assert.throws(() => secondTab.prepare("b".repeat(64)), /같은 파일/);
  secondTab.clear("another-key");
  assert.deepEqual(secondTab.read(), first);
  secondTab.clear(requestId);
  assert.equal(secondTab.read(), null);
});

test("pending uploads are scoped to the account, team and challenge", () => {
  const storage = store();
  executableIntent(options(storage)).prepare(digest);
  for (const change of [{ userId: "other" }, { teamId: "other" }, { challengeId: "other" }])
    assert.equal(executableIntent(options(storage, change)).read(), null);
  assert.equal(executableIntent(options(storage, { userId: null })), null);
});

test("storage failure refuses to create a request that cannot survive a reload", () => {
  const storage = { ...store(), setItem() { throw new Error("storage full"); } };
  assert.throws(() => executableIntent(options(storage)).prepare(digest), /storage full/);
});

test("cleanup and uncertain starts continue to block another execution after a terminal response", () => {
  for (const status of ["QUEUED", "PREPARING", "RUNNING", "CLEANUP_PENDING", "START_UNKNOWN"])
    assert.equal(isActiveRun(mapRemoteRun({ submission_id: "job", status })), true);
  assert.equal(isActiveRun(mapRemoteRun({ submission_id: "job", status: "COMPLETED", release_pending: true })), true);
  assert.equal(isActiveRun(mapRemoteRun({ submission_id: "job", status: "COMPLETED", release_pending: false })), false);
});

test("confirmed pool results permit the next execution while VM cleanup continues", () => {
  const completed = { submission_id: "job", status: "CLEANUP_PENDING", release_pending: true,
    finished_at: "2026-10-28T06:30:16Z", requires_review: false };
  for (const execution_status of ["COMPLETED", "CRASH", "TIMEOUT", "INFRA_ERROR"])
    assert.equal(isActiveRun(mapRemoteRun({ ...completed, execution_status })), false);
  for (const change of [{ requires_review: true }, { requires_review: undefined }, { finished_at: null },
    { finished_at: "invalid" }, { status: "START_UNKNOWN" }, { status: "RUNNING" },
    { execution_status: "RUNNING" }, { execution_status: undefined }])
    assert.equal(isActiveRun(mapRemoteRun({ ...completed, execution_status: "COMPLETED", ...change })), true);
});

test("real backend output uses submission_id and distinguishes absent output from an empty stream", () => {
  const missing = mapRemoteRun({ submission_id: "job", status: "TIMEOUT", output: null });
  const empty = mapRemoteRun({ submission_id: "job", status: "COMPLETED", output: { stdout: "", stderr: "" } });
  assert.equal(missing.status, "TIMED_OUT");
  assert.equal(missing.outputAvailable, false);
  assert.equal(empty.outputAvailable, true);
  assert.equal(mapRemoteRuns({ runs: [], max_attempts: 3 }).maxAttempts, null);
});

test("admin settings send a request interval and enforce the same limits as the backend", () => {
  const draft = remoteRunDraft({ environment: "Windows", executable: "pe-amd64", rate_limit_seconds: 45 });
  const result = remoteRunChanges(draft);
  assert.equal(result.error, "");
  assert.equal(result.payload.rate_limit_seconds, 45);
  assert.equal(result.payload.max_attempts, undefined);
  for (const change of [{ rateLimitSeconds: "0" }, { timeoutSeconds: "181" }, { maxMegabytes: "11" }, { amd64: false }])
    assert.notEqual(remoteRunChanges({ ...draft, ...change }).error, "");
});

test("editing the request interval preserves a previously configured fractional megabyte limit", () => {
  const draft = remoteRunDraft({ environment: "Windows", executable: "pe-amd64", max_file_bytes: 512000, rate_limit_seconds: 30 });
  const result = remoteRunChanges({ ...draft, rateLimitSeconds: "45" });
  assert.equal(result.error, "");
  assert.equal(result.payload.max_file_bytes, 512000);
  assert.equal(result.payload.rate_limit_seconds, 45);
});
