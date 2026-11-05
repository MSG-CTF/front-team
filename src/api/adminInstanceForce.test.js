import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { forceResetInstance, forceStopInstance, retryInstanceCleanup } from "./admin.js";
import { describeSchedulerObservation, needsInstanceReason, normalizeInstanceReason } from "../features/admin/utils/adminInstanceForce.js";

async function withAdapter(handler, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const adapter = apiClient.defaults.adapter;
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return handler(config);
  };
  try {
    await run(calls);
  } finally {
    apiClient.defaults.adapter = adapter;
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

const accepted = (config) => ({ status: 202, statusText: "Accepted", headers: {}, config, data: { code: "SUCCESS", data: {} } });

test("강제 재시작은 POST 본문에, 강제 종료와 정리는 DELETE 본문에 다듬은 사유를 보낸다", async () => {
  await withAdapter(accepted, async (calls) => {
    await forceResetInstance("a/b", "  운영 점검  ");
    await forceStopInstance("a/b", "참가자 요청");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, "post");
    assert.equal(calls[0].url, "/admin/instances/a%2Fb/reset");
    assert.deepEqual(JSON.parse(calls[0].data), { reason: "운영 점검" });
    assert.equal(calls[1].method, "delete");
    assert.equal(calls[1].url, "/admin/instances/a%2Fb");
    assert.deepEqual(JSON.parse(calls[1].data), { reason: "참가자 요청" });
  });
});

test("사유가 없거나 공백이거나 500자를 넘으면 요청을 보내지 않는다", async () => {
  await withAdapter(accepted, async (calls) => {
    for (const reason of [undefined, null, "", "   ", 3, "가".repeat(501)]) {
      assert.throws(() => forceResetInstance("id", reason), /사유를 1~500자로/);
      assert.throws(() => forceStopInstance("id", reason), /사유를 1~500자로/);
    }
    assert.equal(calls.length, 0);
  });
  assert.equal(normalizeInstanceReason("가".repeat(500)).length, 500);
  assert.equal(normalizeInstanceReason(` ${"가".repeat(500)} `).length, 500);
});

test("정리 재시도는 사유 없이 빈 객체 계약을 유지한다", async () => {
  await withAdapter(accepted, async (calls) => {
    await retryInstanceCleanup("id");
    assert.deepEqual(JSON.parse(calls[0].data), {});
  });
  assert.equal(needsInstanceReason("cleanup"), false);
  assert.equal(needsInstanceReason("reset"), true);
  assert.equal(needsInstanceReason("stop"), true);
});

test("Backend의 사유 검증 실패(400)는 그대로 실패로 돌려준다", async () => {
  const reject = (config) => { throw Object.assign(new Error("bad"), { response: { status: 400, data: { code: "INVALID_REQUEST", message: "사유를 입력해주세요" } }, config }); };
  await withAdapter(reject, async () => {
    await assert.rejects(forceStopInstance("id", "운영 점검"), (error) => error.response.data.code === "INVALID_REQUEST");
  });
});

const NOW = Date.parse("2026-11-06T03:00:00Z");
const fresh = "2026-11-06T02:59:40Z";

test("OK이면서 status_mismatch가 boolean일 때만 일치 또는 불일치로 보인다", () => {
  const match = describeSchedulerObservation({ status: "RUNNING", checked_at: fresh, check_status: "OK", error_code: null, status_mismatch: false }, NOW);
  assert.equal(match.state, "match");
  assert.equal(match.remoteLabel, "실행 중");
  const mismatch = describeSchedulerObservation({ status: "STOPPED", checked_at: fresh, check_status: "OK", error_code: null, status_mismatch: true }, NOW);
  assert.equal(mismatch.state, "mismatch");
  assert.equal(mismatch.tone, "bad");
  assert.match(mismatch.detail, /종료됨/);
  const unknown = describeSchedulerObservation({ status: "RUNNING", checked_at: fresh, check_status: "OK", status_mismatch: null }, NOW);
  assert.equal(unknown.state, "unchecked");
});

test("필드가 없는 구버전 응답, NOT_CHECKED, 모르는 값은 미확인이다", () => {
  for (const value of [undefined, null, "OK", {}, { check_status: "NOT_CHECKED", status: null, checked_at: null, status_mismatch: null },
    { check_status: "SOMETHING", status: "RUNNING", checked_at: fresh, status_mismatch: false }]) {
    const view = describeSchedulerObservation(value, NOW);
    assert.equal(view.state, "unchecked");
    assert.notEqual(view.tone, "good");
  }
});

test("조회 실패와 오래된 관측값은 일치로 보이지 않고 원격 상태를 지금 값처럼 내세우지 않는다", () => {
  const error = describeSchedulerObservation({ status: null, checked_at: fresh, check_status: "ERROR", error_code: "UNAVAILABLE", status_mismatch: null }, NOW);
  assert.equal(error.state, "error");
  assert.equal(error.remoteStatus, null);
  assert.match(error.detail, /응답 없음/);
  const stale = describeSchedulerObservation({ status: "CLEANED", checked_at: "2026-11-06T02:50:00Z", check_status: "STALE", error_code: null, status_mismatch: null }, NOW);
  assert.equal(stale.state, "stale");
  assert.match(stale.detail, /마지막 확인 값 정리됨/);
  assert.match(stale.detail, /다를 수 있습니다/);
});

test("Backend가 OK로 보냈어도 확인한 지 60초가 지나면 화면에서 오래된 정보로 낮춘다", () => {
  const old = describeSchedulerObservation({ status: "CLEANED", checked_at: "2026-11-06T02:58:30Z", check_status: "OK", error_code: null, status_mismatch: false }, NOW);
  assert.equal(old.state, "stale");
  const broken = describeSchedulerObservation({ status: "RUNNING", checked_at: "not-a-date", check_status: "OK", status_mismatch: false }, NOW);
  assert.equal(broken.state, "unchecked");
});
