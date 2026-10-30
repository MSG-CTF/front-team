import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import apiClient from "../../../api/client.js";
import * as subject from "./adminImagePreparations.js";

let adapter;
let previousStorage;
let previousLocal;
let persisted;
let changes;
let calls;
let handler;
let sequence = 0;

function record(overrides = {}) {
  return {
    request_id: "request-1", release_id: "release-1", parent_request_id: null,
    spec: { release_id: "release-1", architecture: "AMD64", isolation_profile: "WEB", containers: [], target_ids: ["target-1"] },
    operation_id: null, image_set_id: null, expected_image_set_id: "sha256:abc", delivery_status: "PENDING",
    operation_status: null, progress: {}, attempts: 0, last_error_code: null, requires_review: false,
    next_attempt_at: null, last_checked_at: null, created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z",
    created_by: "operator", readiness_semantics: "HISTORICAL_OPERATION_ONLY", activation_status: null, ...overrides,
  };
}
const envelope = (data) => ({ code: "SUCCESS", data });
const history = (results = [record()], page = 1) => ({ count: results.length, page, page_size: 20, results });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const tick = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  adapter = apiClient.defaults.adapter;
  previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  previousLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  persisted = new Map(); changes = []; calls = [];
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key) => persisted.get(key) ?? null, setItem: (key, value) => persisted.set(key, value), removeItem: (key) => persisted.delete(key),
  } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  handler = async () => history();
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return { status: 200, config, data: envelope(await handler(config)) };
  };
});
afterEach(() => {
  apiClient.defaults.adapter = adapter;
  for (const [key, descriptor] of [["sessionStorage", previousStorage], ["localStorage", previousLocal]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});
function create(releaseId = "release-1", challengeId = `challenge-${++sequence}`) {
  assert.equal(typeof subject.createImagePreparationController, "function");
  return subject.createImagePreparationController({ challengeId, releaseId, onChange: (state) => changes.push(state) });
}

test("opening history and refreshing a selected request performs GETs only", async () => {
  const controller = create();
  assert.equal(calls.length, 0);
  await controller.load();
  assert.equal(controller.getState().records[0].request_id, "request-1");
  handler = async () => record({ operation_status: "SUCCEEDED", delivery_status: "ACCEPTED" });
  await controller.view("request-1");
  assert.equal(controller.getState().detail.operation_status, "SUCCEEDED");
  assert.deepEqual(calls.map((call) => call.method), ["get", "get"]);
  assert.match(calls[1].url, /image_preparations\/request-1$/);
  controller.dispose();
});

test("rapid duplicate clicks are single-flight and accepted requests clear the retained key", async () => {
  const controller = create();
  const wait = deferred(); handler = (config) => config.method === "post" ? wait.promise : history();
  const first = controller.submit();
  const duplicate = controller.submit();
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(controller.getState().submitting, true);
  assert.equal(persisted.size, 1);
  wait.resolve(record()); await first; await duplicate;
  assert.equal(controller.getState().detail.request_id, "request-1");
  assert.match(controller.getState().notice, /접수/);
  assert.equal(controller.getState().submitting, false);
  assert.equal(persisted.size, 0);
  controller.dispose();
});

test("an ambiguous response reuses its persisted key after remount and isolates other releases", async () => {
  const challengeId = `challenge-${++sequence}`;
  const first = create("release-1", challengeId);
  handler = async () => { throw new Error("Network Error"); };
  await first.submit();
  assert.equal(first.getState().ambiguous, true);
  const key = calls[0].headers.get("Idempotency-Key");
  assert.ok(key);
  first.dispose();
  const remounted = create("release-1", challengeId);
  assert.equal(remounted.getState().ambiguous, true);
  handler = async (config) => config.method === "post" ? record() : history();
  await remounted.submit();
  assert.equal(calls[1].headers.get("Idempotency-Key"), key);
  const other = create("release-2", challengeId);
  handler = async (config) => config.method === "post" ? record({ release_id: "release-2" }) : history([record({ release_id: "release-2" })]);
  await other.submit();
  assert.notEqual(calls.filter((call) => call.method === "post")[2].headers.get("Idempotency-Key"), key);
  remounted.dispose(); other.dispose();
});

test("a stale history response cannot overwrite newer state and disposal aborts requests", async () => {
  const controller = create();
  const wait = deferred(); handler = () => wait.promise;
  const first = controller.load(); await tick();
  handler = async () => history([], 2);
  await controller.load(2);
  assert.equal(calls[0].signal.aborted, true);
  wait.resolve(history()); await first;
  assert.equal(controller.getState().page, 2);
  const latest = deferred(); handler = () => latest.promise;
  const pending = controller.view("request-1"); await tick();
  const changeCount = changes.length;
  controller.dispose();
  assert.equal(calls.at(-1).signal.aborted, true);
  latest.resolve(record()); await pending;
  assert.equal(changes.length, changeCount);
});

test("wrong-release or malformed responses never become accepted history or request details", async () => {
  const controller = create();
  handler = async () => history([record({ release_id: "another-release" })]);
  await controller.load();
  assert.equal(controller.getState().records.length, 0);
  assert.ok(controller.getState().error);
  handler = async () => record({ request_id: "another-request" });
  await controller.view("request-1");
  assert.equal(controller.getState().detail, null);
  handler = async () => ({});
  await controller.submit();
  assert.equal(controller.getState().detail, null);
  assert.equal(controller.getState().ambiguous, true);
  assert.equal(persisted.size, 1);
  controller.dispose();
});

test("Backend business errors stay visible and status 404 never creates a replacement request", async () => {
  const controller = create();
  handler = async () => { throw Object.assign(new Error("not found"), { response: { status: 404, data: { code: "IMAGE_PREPARATION_NOT_FOUND" } } }); };
  await controller.view("missing-request");
  assert.match(controller.getState().error, /찾|없/);
  assert.deepEqual(calls.map((call) => call.method), ["get"]);
  handler = async () => { throw Object.assign(new Error("disabled"), { response: { status: 503, data: { code: "IMAGE_PREPARATION_DISABLED" } } }); };
  await controller.submit();
  assert.match(controller.getState().error, /비활성|설정/);
  assert.equal(controller.getState().submitting, false);
  controller.dispose();
});

test("only deployable Linux K3s AMD64 or ARM64 WEB/PWN releases offer preparation", () => {
  assert.equal(typeof subject.imagePreparationDisabledReason, "function");
  const supported = { is_deployable: true, runtime_type: "KUBERNETES", architecture: "AMD64", isolation_profile: "WEB" };
  assert.equal(subject.imagePreparationDisabledReason(supported), "");
  assert.equal(subject.imagePreparationDisabledReason({ ...supported, architecture: "ARM64", isolation_profile: "PWN" }), "");
  for (const change of [{ is_deployable: false }, { runtime_type: "DOCKER" }, { runtime_type: "WINDOWS" }, { architecture: "WINDOWS_AMD64" }, { isolation_profile: "KOTH" }]) {
    assert.ok(subject.imagePreparationDisabledReason({ ...supported, ...change }));
  }
});

test("submitting from an older history page never relabels that page as the first page", async () => {
  const controller = create();
  handler = async () => ({ count: 21, page: 2, page_size: 20, results: [record({ request_id: "old-request" })] });
  await controller.load(2);
  handler = async (config) => config.method === "post" ? record({ request_id: "new-request" })
    : { count: 22, page: 2, page_size: 20, results: [record({ request_id: "old-request" })] };
  await controller.submit();
  assert.equal(controller.getState().page, 2);
  assert.deepEqual(controller.getState().records.map((row) => row.request_id), ["old-request"]);
  assert.equal(controller.getState().detail.request_id, "new-request");
  assert.equal(controller.getState().count, 22);
  controller.dispose();
});

test("an HTTP 200 failure envelope cannot report acceptance and definitive rejection releases its key", async () => {
  const controller = create();
  apiClient.defaults.adapter = async (config) => ({ status: 200, config, data: { code: "RELEASE_NOT_APPROVED", data: null } });
  await controller.submit();
  assert.match(controller.getState().error, /승인/);
  assert.equal(controller.getState().detail, null);
  assert.equal(controller.getState().ambiguous, false);
  assert.equal(persisted.size, 0);
  controller.dispose();
});

test("configuration errors distinguish rollout blockers from an unknown network outcome", async () => {
  const controller = create();
  handler = async () => { throw Object.assign(new Error("invalid config"), { response: { status: 503, data: { code: "IMAGE_PREPARATION_CONFIG_INVALID" } } }); };
  await controller.load();
  assert.match(controller.getState().error, /Backend 설정/);
  controller.dispose();
});

test("a definitive disabled/config rejection can be tried again with a new key after rollout", async () => {
  const controller = create();
  handler = async () => { throw Object.assign(new Error("disabled"), { response: { status: 503, data: { code: "IMAGE_PREPARATION_DISABLED" } } }); };
  await controller.submit();
  assert.equal(controller.getState().ambiguous, false);
  assert.equal(persisted.size, 0);
  const firstKey = calls[0].headers.get("Idempotency-Key");
  handler = async (config) => config.method === "post" ? record() : history();
  await controller.submit();
  assert.notEqual(calls[1].headers.get("Idempotency-Key"), firstKey);
  controller.dispose();
});

test("an idempotency conflict can mean the first command is still running and retains that command key", async () => {
  const controller = create();
  handler = async () => { throw Object.assign(new Error("same request processing"), { response: { status: 409, data: { code: "IDEMPOTENCY_KEY_CONFLICT" } } }); };
  await controller.submit();
  const firstKey = calls[0].headers.get("Idempotency-Key");
  assert.equal(controller.getState().ambiguous, true);
  assert.match(controller.getState().error, /동일 요청|처리 중/);
  handler = async (config) => config.method === "post" ? record() : history();
  await controller.submit();
  assert.equal(calls[1].headers.get("Idempotency-Key"), firstKey);
  controller.dispose();
});

test("replaying an ambiguous accepted request uses canonical history count even from an older page", async () => {
  const controller = create();
  handler = async () => { throw new Error("accepted but response lost"); };
  await controller.submit();
  const firstKey = calls[0].headers.get("Idempotency-Key");
  const olderPage = { count: 22, page: 2, page_size: 20, results: [record({ request_id: "older-request" })] };
  handler = async () => olderPage;
  await controller.load(2);
  assert.equal(controller.getState().count, 22);
  handler = async (config) => config.method === "post" ? record({ request_id: "already-accepted-request" }) : olderPage;
  await controller.submit();
  assert.equal(controller.getState().count, 22);
  assert.equal(controller.getState().page, 2);
  assert.deepEqual(controller.getState().records.map((row) => row.request_id), ["older-request"]);
  assert.equal(controller.getState().detail.request_id, "already-accepted-request");
  assert.equal(calls.filter((call) => call.method === "post")[1].headers.get("Idempotency-Key"), firstKey);
  assert.equal(calls.at(-1).method, "get");
  assert.deepEqual(calls.at(-1).params, { page: 2 });
  controller.dispose();
});

test("a failed canonical history GET preserves a successful acknowledgement without guessing a new count", async () => {
  const controller = create();
  handler = async () => ({ count: 21, page: 1, page_size: 20, results: [record()] });
  await controller.load();
  handler = async (config) => { if (config.method === "post") return record({ request_id: "accepted-new" }); throw new Error("history offline"); };
  await controller.submit();
  assert.equal(controller.getState().detail.request_id, "accepted-new");
  assert.equal(controller.getState().count, 21);
  assert.match(controller.getState().notice, /접수/);
  assert.match(controller.getState().error, /접수.*이력|이력.*조회/);
  assert.equal(controller.getState().ambiguous, false);
  assert.equal(persisted.size, 0);
  assert.equal(calls.at(-1).method, "get");
  controller.dispose();
});
