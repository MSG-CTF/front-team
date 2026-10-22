import test from "node:test";
import assert from "node:assert/strict";
import { buildNodeAllocation, formatResourceAmount, formatResourcePercent, resourceCount } from "./adminNodeAllocation.js";

function allocation(instanceId, challengeId, cpu, memory, extra = {}) {
  return {
    instance_id: instanceId, challenge_id: challengeId, challenge_title: challengeId,
    team_name: `Team ${instanceId}`, status: "RUNNING",
    resources: { cpu_millicores: cpu, memory_mib: memory }, ...extra,
  };
}

function snapshot(allocations = [], extra = {}) {
  return { resource_allocation: {
    allocatable: { cpu_millicores: 4000, memory_mib: 8192 },
    other_reserved: { cpu_millicores: 0, memory_mib: 0 },
    complete: true, allocations, ...extra,
  } };
}

test("legacy usage and instance counts never fabricate challenge allocations or free space", () => {
  const model = buildNodeAllocation({ running_instances: 4, cpu_usage_percent: 60, memory_usage_percent: 70 });
  assert.equal(model.available, false);
  assert.deepEqual(model.challenges, []);
  assert.ok(model.dimensions.every((dimension) => dimension.remaining === null && dimension.capacity === null));
});

test("same challenge on multiple teams sums its actual instance reservations, not the current release", () => {
  const model = buildNodeAllocation(snapshot([
    allocation("one", "web", 500, 512), allocation("two", "web", 1000, 2048), allocation("three", "pwn", 2000, 4096),
  ]));
  const web = model.challenges.find((challenge) => challenge.key === "web");
  assert.equal(web.instances.length, 2);
  assert.equal(web.resources.cpu_millicores.known, 1500);
  assert.equal(web.resources.memory_mib.known, 2560);
  assert.equal(model.dimensions[0].remaining, 500);
  assert.equal(model.dimensions[1].remaining, 1536);
  assert.equal(model.dimensions[0].segments.find((segment) => segment.key === "web").width, 37.5);
});

test("STOPPING and CLEANUP_PENDING reservations stay occupied until the source removes them", () => {
  const model = buildNodeAllocation(snapshot([
    allocation("one", "web", 500, 512, { status: "STOPPING" }),
    allocation("two", "web", 1000, 1024, { status: "CLEANUP_PENDING" }),
  ]));
  assert.equal(model.dimensions[0].known, 1500);
  assert.equal(model.dimensions[0].remaining, 2500);
});

test("partial snapshots never claim their unaccounted portion is free", () => {
  const model = buildNodeAllocation(snapshot([allocation("one", "web", 500, 512)], { complete: false }));
  assert.equal(model.dimensions[0].known, 500);
  assert.equal(model.dimensions[0].segments[0].width, 12.5);
  assert.equal(model.dimensions[0].remaining, null);
});

test("one missing memory measurement leaves CPU usable but memory free capacity unknown", () => {
  const model = buildNodeAllocation(snapshot([allocation("one", "web", 500, null)]));
  assert.equal(model.dimensions[0].remaining, 3500);
  assert.equal(model.dimensions[1].remaining, null);
  assert.equal(model.challenges[0].resources.memory_mib.complete, false);
});

test("missing miscellaneous reservations do not default to zero", () => {
  const model = buildNodeAllocation(snapshot([allocation("one", "web", 500, 512)], { other_reserved: null }));
  assert.equal(model.dimensions[0].known, 500);
  assert.equal(model.dimensions[0].remaining, null);
});

test("miscellaneous reservations are counted separately from challenge allocations", () => {
  const model = buildNodeAllocation(snapshot([allocation("one", "web", 500, 512)], {
    other_reserved: { cpu_millicores: 1000, memory_mib: 1024 },
  }));
  assert.equal(model.dimensions[0].known, 1500);
  assert.equal(model.dimensions[0].other, 1000);
  assert.equal(model.dimensions[0].remaining, 2500);
});

test("overcommit stays explicit and all segments fit without negative free capacity", () => {
  const model = buildNodeAllocation(snapshot([allocation("one", "web", 3000, 2048), allocation("two", "pwn", 2000, 1024)]));
  const cpu = model.dimensions[0];
  assert.equal(cpu.percent, 125);
  assert.equal(cpu.overflow, 1000);
  assert.equal(cpu.remaining, 0);
  assert.equal(cpu.segments.reduce((sum, segment) => sum + segment.width, 0), 100);
  assert.equal(cpu.capacity / cpu.denominator, .8);
});

test("duplicates across a source snapshot do not inflate reservations and invalidate free-space claims", () => {
  const record = allocation("same-instance", "web", 500, 512);
  const model = buildNodeAllocation(snapshot([record, { ...record }]));
  assert.equal(model.challenges[0].instances.length, 1);
  assert.equal(model.dimensions[0].known, 500);
  assert.equal(model.dimensions[0].remaining, null);
});

test("same challenge name with distinct IDs remains separate", () => {
  const model = buildNodeAllocation(snapshot([
    allocation("one", "web-a", 500, 512, { challenge_title: "동일 제목" }),
    allocation("two", "web-b", 1000, 1024, { challenge_title: "동일 제목" }),
  ]));
  assert.equal(model.challenges.length, 2);
  assert.notEqual(model.challenges[0].key, model.challenges[1].key);
});

test("null, negative, infinite and string measurements are not treated as collected", () => {
  for (const value of [null, undefined, -1, Infinity, NaN, "500"]) {
    const model = buildNodeAllocation(snapshot([allocation("one", "web", value, 512)]));
    assert.equal(model.dimensions[0].remaining, null);
    assert.equal(formatResourceAmount(value, "cpu_millicores"), "미수집");
  }
});

test("zero or missing capacity does not produce Infinity, NaN or guessed ratios", () => {
  for (const value of [0, null, undefined, -1]) {
    const model = buildNodeAllocation(snapshot([allocation("one", "web", 500, 512)], { allocatable: { cpu_millicores: value } }));
    assert.equal(model.dimensions[0].percent, null);
    assert.equal(model.dimensions[0].remaining, null);
    assert.equal(model.dimensions[0].segments[0].width, 0);
  }
});

test("a complete empty allocation list is distinguishable from an absent list", () => {
  const empty = buildNodeAllocation(snapshot());
  const missing = buildNodeAllocation(snapshot(undefined, { allocations: null }));
  assert.equal(empty.available, true);
  assert.equal(empty.dimensions[0].remaining, 4000);
  assert.equal(missing.available, false);
  assert.equal(missing.dimensions[0].remaining, null);
});

test("unidentified instances cannot be silently assigned to a known challenge", () => {
  const model = buildNodeAllocation(snapshot([
    allocation("one", null, 500, 512), allocation(null, "web", 1000, 1024), null,
  ]));
  assert.equal(model.challenges.length, 1);
  assert.equal(model.challenges[0].challengeId, null);
  assert.equal(model.dimensions[0].remaining, null);
});

test("current container counts and legacy running-instance counts keep their distinct units", () => {
  assert.deepEqual(resourceCount({ container_count: 0, running_instances: 5 }), { label: "컨테이너", value: 0 });
  assert.deepEqual(resourceCount({ container_count: null, running_instances: 5 }), { label: "컨테이너", value: null });
  assert.deepEqual(resourceCount({ running_instances: 5 }), { label: "실행 인스턴스", value: 5 });
});

test("quantities use cores and binary memory units without rounding small usage to whole cores", () => {
  assert.equal(formatResourceAmount(500, "cpu_millicores"), "0.5 코어");
  assert.equal(formatResourceAmount(1, "cpu_millicores"), "1 mCPU");
  assert.equal(formatResourceAmount(1536, "memory_mib"), "1.5 GiB");
  assert.equal(formatResourceAmount(512, "memory_mib"), "512 MiB");
  assert.equal(formatResourcePercent(12.54), "12.5%");
  assert.equal(formatResourcePercent(.01), "0.1% 미만");
});

test("node snapshots are independent and refreshing does not preserve removed reservations", () => {
  const record = allocation("one", "web", 500, 512);
  const full = buildNodeAllocation(snapshot([record]));
  const refreshed = buildNodeAllocation(snapshot());
  assert.equal(full.dimensions[0].remaining, 3500);
  assert.equal(refreshed.dimensions[0].remaining, 4000);
  assert.equal(refreshed.challenges.length, 0);
});
