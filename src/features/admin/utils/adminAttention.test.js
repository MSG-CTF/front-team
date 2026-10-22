import test from "node:test";
import assert from "node:assert/strict";
import { ATTENTION_QUERIES, canForceStop, describeAttention, formatAge, selectAttentionInstances, summarizeAttention } from "./adminAttention.js";

const now = Date.parse("2026-10-22T05:00:00Z");
const at = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString();

test("실패한 인스턴스와 5분 넘게 준비 중인 인스턴스만 오래된 순서로 고른다", () => {
  const rows = [
    { instance_id: "a", status: "RUNNING", created_at: at(40) },
    { instance_id: "b", status: "FAILED", created_at: at(3) },
    { instance_id: "c", status: "PROVISIONING", created_at: at(1) },
    { instance_id: "d", status: "PROVISIONING", created_at: at(9) },
    { instance_id: "e", status: "STOPPING", created_at: at(70) },
    { instance_id: "f", status: "FAILED", created_at: at(60) },
    { instance_id: "g", status: "REQUESTED", created_at: "not a date" },
  ];
  assert.deepEqual(selectAttentionInstances(rows, now).map((row) => row.instance_id), ["f", "d", "b"]);
  assert.deepEqual(selectAttentionInstances(undefined, now), []);
});

test("원인과 경과 시간을 사람이 읽는 말로 바꾼다", () => {
  assert.deepEqual(describeAttention({ status: "FAILED", error_code: "RESOURCE_UNAVAILABLE", created_at: at(19) }, now),
    { kind: "failed", label: "가용 노드 부족", age: "19분 경과" });
  assert.equal(describeAttention({ status: "FAILED", error_code: "NEW_CODE", created_at: at(0) }, now).label, "NEW_CODE");
  assert.equal(describeAttention({ status: "FAILED", error_code: null, created_at: at(0) }, now).label, "실패");
  assert.deepEqual(describeAttention({ status: "PROVISIONING", created_at: at(125) }, now),
    { kind: "stuck", label: "PROVISIONING 상태에 머묾", age: "2시간 5분 경과" });
  assert.equal(formatAge(at(0), now), "방금");
  assert.equal(formatAge("", now), "");
});

test("실패는 상태로 따로 물어 받은 줄이 일부여도 total_count로 센다", () => {
  assert.deepEqual(ATTENTION_QUERIES.map((query) => query.status), ["FAILED", "REQUESTED", "SCHEDULING", "PROVISIONING"]);
  const failedRows = Array.from({ length: 20 }, (_, index) => ({ instance_id: `f${index}`, status: "FAILED", created_at: at(index) }));
  const summary = summarizeAttention([
    { status: "FAILED", instances: failedRows, total_count: 57 },
    { status: "REQUESTED", instances: [], total_count: 0 },
    { status: "SCHEDULING", instances: [{ instance_id: "s1", status: "SCHEDULING", created_at: at(2) }], total_count: 1 },
    { status: "PROVISIONING", instances: [{ instance_id: "p1", status: "PROVISIONING", created_at: at(30) }, { instance_id: "p2", status: "PROVISIONING", created_at: at(1) }], total_count: 2 },
  ], now);
  assert.equal(summary.count, 58);
  assert.equal(summary.partial, false);
  assert.equal(summary.rows[0].instance_id, "p1");
  assert.equal(summary.rows.length, 21);
});

test("준비 단계 줄이 다 오지 않았거나 서버가 상태 조건을 무시하면 일부만 셌다고 알린다", () => {
  const pending = summarizeAttention([
    { status: "FAILED", instances: [], total_count: 0 },
    { status: "PROVISIONING", instances: [{ instance_id: "p1", status: "PROVISIONING", created_at: at(9) }], total_count: 140 },
  ], now);
  assert.deepEqual([pending.count, pending.partial], [1, true]);

  // 상태 조건이 빠진 응답: 다른 상태 줄은 버리고 total_count 대신 받은 실패 줄만 센다
  const mixed = [
    { instance_id: "a", status: "RUNNING", created_at: at(40) },
    { instance_id: "b", status: "FAILED", created_at: at(3) },
    { instance_id: "c", status: "PROVISIONING", created_at: at(8) },
  ];
  const ignored = summarizeAttention(ATTENTION_QUERIES.map(({ status }) => ({ status, instances: mixed, total_count: 300 })), now);
  assert.deepEqual(ignored.rows.map((row) => row.instance_id), ["c", "b"]);
  assert.deepEqual([ignored.count, ignored.partial], [2, true]);

  // 두 상태로 겹쳐 온 인스턴스는 먼저 받은 실패 쪽만 남겨 두 번 세지 않는다
  const moved = summarizeAttention([
    { status: "FAILED", instances: [{ instance_id: "x", status: "FAILED", created_at: at(20) }], total_count: 1 },
    { status: "PROVISIONING", instances: [{ instance_id: "x", status: "PROVISIONING", created_at: at(20) }], total_count: 1 },
  ], now);
  assert.deepEqual([moved.count, moved.rows.length, moved.rows[0].status], [1, 1, "FAILED"]);
  assert.deepEqual(summarizeAttention(undefined, now), { rows: [], count: 0, partial: false });
});

test("종료는 아직 끝나지 않은 인스턴스에만 보인다", () => {
  assert.equal(canForceStop({ status: "PROVISIONING" }), true);
  assert.equal(canForceStop({ status: "RUNNING" }), true);
  for (const status of ["FAILED", "STOPPED", "EXPIRED", "CLEANED"]) assert.equal(canForceStop({ status }), false);
});
