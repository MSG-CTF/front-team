import test from "node:test";
import assert from "node:assert/strict";
import { allocationStatus, buildNodeAllocation } from "./adminNodeAllocation.js";

test("reservations remain visible through cleanup until broker removes them", () => {
  const allocation = { instance_id: "instance", challenge_id: "challenge", reservation_status: "COMMITTED", resources: { cpu_millicores: 250, memory_mib: 512 } };
  for (const status of ["RUNNING", "STOPPING", "CLEANUP_PENDING", "CLEANED", "FAILED"]) {
    const node = { resource_allocation: { complete: true, allocatable: { cpu_millicores: 1000, memory_mib: 2048 }, other_reserved: { cpu_millicores: 0, memory_mib: 0 }, allocations: [{ ...allocation, status }] } };
    assert.equal(buildNodeAllocation(node).dimensions[0].remaining, 750);
    node.resource_allocation.allocations = [];
    assert.equal(buildNodeAllocation(node).dimensions[0].remaining, 1000);
  }
  assert.equal(allocationStatus({ ...allocation, status: "STOPPING" }), "정리 중 · 예약 유지");
  assert.equal(allocationStatus({ ...allocation, status: "FAILED" }), "예약 반납 대기");
  assert.equal(allocationStatus({ reservation_status: "HELD" }), "실행 준비 · 예약 중");
});

test("legacy instance identifiers still occupy space by their reservation UUID", () => {
  const node = { resource_allocation: { complete: true, allocatable: { cpu_millicores: 1000, memory_mib: 2048 }, other_reserved: { cpu_millicores: 0, memory_mib: 0 },
    allocations: [{ reservation_id: "00000000-0000-4000-8000-000000000001", instance_id: null, challenge_id: "challenge", resources: { cpu_millicores: 250, memory_mib: 512 } }] } };
  assert.equal(buildNodeAllocation(node).dimensions[0].remaining, 750);
  assert.equal(buildNodeAllocation(node).challenges.length, 1);
});
