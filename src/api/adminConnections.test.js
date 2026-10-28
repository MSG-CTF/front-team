import test from "node:test";
import assert from "node:assert/strict";
import apiClient from "./client.js";
import * as api from "./admin.js";
import { getExeSubmission } from "./challenges.js";
import { createImagePreparationController } from "../features/admin/utils/adminImagePreparations.js";
import { lineScoreBody, displayLineScore } from "../features/admin/utils/adminLineScore.js";
import { publicationBody, publicationRunUrl } from "../features/admin/utils/adminPublicationRequests.js";
import { remoteRetryDeadline } from "../features/challenges/utils/remoteRun.js";

test("remote run throttling respects both response cooldown and Retry-After", () => {
  const now = Date.parse("2026-10-28T00:00:00Z");
  assert.equal(remoteRetryDeadline({ data: { data: { retry_after_seconds: 20 } }, headers: { "retry-after": "25" } }, now), now + 25000);
  assert.equal(remoteRetryDeadline({ headers: { "retry-after": "Wed, 28 Oct 2026 00:01:00 GMT" } }, now), now + 60000);
  assert.equal(remoteRetryDeadline({ data: { data: { retry_after_seconds: -1 } }, headers: { "retry-after": "invalid" } }, now), now);
});

async function environment(run) {
  const adapter = apiClient.defaults.adapter, previous = Object.fromEntries(["localStorage", "sessionStorage"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const values = new Map();
  for (const key of Object.keys(previous)) Object.defineProperty(globalThis, key, { configurable: true, value: { getItem: name => values.get(key + name) || null, setItem: (name, value) => values.set(key + name, value), removeItem: name => values.delete(key + name) } });
  try { await run(); } finally { apiClient.defaults.adapter = adapter; for (const key of Object.keys(previous)) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; } }
}

test("connected admin mutations preserve exact score text, retry identity and explicit publication commands", async () => environment(async () => {
  const calls = [];
  apiClient.defaults.adapter = async config => { calls.push(config); return { status: 200, data: { code: "SUCCESS", data: {} }, config }; };
  await api.retryAdminImagePreparation("c/1", "r/2", ["failed-1"], "fixed-retry");
  await api.refreshAdminImagePreparation("c/1", "r/2");
  await api.getAdminSignatureSubmissions("sig/1", { teamId: "team", result: "INCORRECT", startAt: "2026-10-28T14:00:00+09:00", endAt: "2026-10-28T15:00:00+09:00", page: 2 });
  await api.deleteAdminChallenge("c/1"); await api.deleteAdminSignature("s/1");
  await api.updateAdminLineScore("t/1", 3, "999999999999999999.99", "보정");
  await api.getPublicationRequests({ page: 2, dispatchStatus: "DISPATCH_UNKNOWN" });
  await api.getPublicationRequest("req/1");
  await api.createPublicationRequest({ challenge_slug: "web-one", requested_sha: "a".repeat(40), runtime_smoke: false }, "stable-publication");
  await api.dispatchPublicationRequest("req/1"); await api.syncPublicationRequest("req/1");
  assert.deepEqual(calls.map(c => c.method), ["post", "post", "get", "delete", "delete", "patch", "get", "get", "post", "post", "post"]);
  assert.equal(calls[0].url, "/admin/challenges/c%2F1/image_preparations/r%2F2/retry");
  assert.deepEqual(JSON.parse(calls[0].data), { node_uids: ["failed-1"] }); assert.equal(calls[0].headers.get("Idempotency-Key"), "fixed-retry");
  assert.deepEqual(JSON.parse(calls[1].data), {});
  assert.equal(calls[2].params.start_at, "2026-10-28T14:00:00+09:00"); assert.equal(calls[2].params.team_id, "team");
  assert.deepEqual(JSON.parse(calls[5].data), { earned_score: "999999999999999999.99", reason: "보정" });
  assert.equal(calls[8].headers.get("Idempotency-Key"), "stable-publication");
  assert.equal(calls[9].url, "/admin/publication_requests/req%2F1/dispatch"); assert.deepEqual(JSON.parse(calls[9].data), {});
  assert.equal(calls[10].url, "/admin/publication_requests/req%2F1/sync");
  assert.throws(() => getExeSubmission("not-a-uuid", "not-a-uuid"));
}));

test("decimal edits preserve cents at the full storage boundary and reject rounding or exponent input", () => {
  for (const value of ["0", "0.01", "999999999999999999.99", "1000000000000000.01"]) {
    const { body, error } = lineScoreBody(value, " 점수 보정 "); assert.equal(error, undefined); assert.equal(body.reason, "점수 보정"); assert.equal(typeof body.earned_score, "string");
  }
  assert.equal(lineScoreBody("999999999999999999.99", "보정").body.earned_score, "999999999999999999.99");
  assert.equal(displayLineScore("999999999999999999.99"), "999,999,999,999,999,999.99");
  for (const invalid of ["-1", "0.001", "1e3", "NaN", "1000000000000000000", "", "1,000"]) assert.ok(lineScoreBody(invalid, "보정").error, invalid);
  assert.ok(lineScoreBody("1", " ").error); assert.ok(lineScoreBody("1", "가".repeat(501)).error);
});

test("publication intents cannot select arbitrary workflows or unsafe run links", () => {
  assert.deepEqual(publicationBody({ slug: "web-one", sha: "A".repeat(40) }).body, { challenge_slug: "web-one", requested_sha: "a".repeat(40), runtime_smoke: false });
  assert.equal(publicationBody({ slug: "web-one", sha: "" }).body.requested_sha, null);
  assert.ok(publicationBody({ slug: "../other", sha: "" }).error); assert.ok(publicationBody({ slug: "web-one", sha: "abc" }).error);
  assert.equal(publicationRunUrl("https://github.com/MSG-CTF/problem/actions/runs/123"), "https://github.com/MSG-CTF/problem/actions/runs/123");
  for (const value of ["javascript:alert(1)", "https://github.com.evil.test/MSG-CTF/a/actions/runs/1", "https://github.com@evil.test/MSG-CTF/a/actions/runs/1", "https://github.com/MSG-CTF/a/actions/runs/1?token=secret"]) assert.equal(publicationRunUrl(value), null);
});

test("ambiguous image retry restores the same owner-scoped request and cannot become a new command", async () => environment(async () => {
  const posts = [], child = { request_id: "child", parent_request_id: "parent", release_id: "release", delivery_status: "PENDING", operation_status: null, readiness_semantics: "HISTORICAL_OPERATION_ONLY" };
  let offline = true;
  apiClient.defaults.adapter = async config => {
    if (config.method === "post") { posts.push(config); if (offline) throw new Error("offline"); return { status: 200, data: { code: "SUCCESS", data: child }, config }; }
    return { status: 200, data: { code: "SUCCESS", data: { results: [child], count: 1, page: 1, page_size: 20 } }, config };
  };
  const create = userId => createImagePreparationController({ challengeId: "challenge", releaseId: "release", userId, onChange() {} });
  const first = create("admin-a"); await first.retry("parent", ["node-b", "node-a"]); const pending = first.getState().pendingRetry; assert.ok(pending); first.dispose();
  const another = create("admin-b"); assert.equal(another.getState().pendingRetry, null); another.dispose();
  const restored = create("admin-a"); assert.deepEqual(restored.getState().pendingRetry, pending); offline = false;
  await restored.retry("different-parent", ["different-node"]);
  assert.equal(posts.length, 2); assert.equal(posts[0].url, posts[1].url); assert.equal(posts[0].data, posts[1].data); assert.equal(posts[0].headers.get("Idempotency-Key"), posts[1].headers.get("Idempotency-Key"));
  assert.deepEqual(JSON.parse(posts[1].data), { node_uids: ["node-a", "node-b"] }); assert.equal(restored.getState().pendingRetry, null); restored.dispose();
}));

test("a repeated image retry click sends only one pending mutation", async () => environment(async () => {
  let posts = 0;
  const child = { request_id: "child", parent_request_id: "parent", release_id: "release", delivery_status: "PENDING", operation_status: null, readiness_semantics: "HISTORICAL_OPERATION_ONLY" };
  apiClient.defaults.adapter = async config => {
    let data;
    if (config.method === "post") { posts++; await new Promise(resolve => setTimeout(resolve, 5)); data = child; }
    else data = { results: [child], count: 1, page: 1, page_size: 20 };
    return { status: 200, data: { code: "SUCCESS", data }, config };
  };
  const controller = createImagePreparationController({ challengeId: "double-click", releaseId: "release", userId: "admin", onChange() {} });
  await Promise.all([controller.retry("parent", ["failed"]), controller.retry("parent", ["failed"])]);
  assert.equal(posts, 1); controller.dispose();
}));
