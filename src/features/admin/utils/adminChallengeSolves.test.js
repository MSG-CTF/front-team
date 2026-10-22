import assert from "node:assert/strict";
import test from "node:test";
import { formatSolveTime, quickSolveRange, solveHourLabel, solvePeriodQuery } from "./adminChallengeSolves.js";

test("Korean time filters and output do not depend on the browser timezone", () => {
  assert.deepEqual(solvePeriodQuery("2026-10-14T00:00", "2026-10-14T01:00"), {
    startAt: "2026-10-13T15:00:00.000Z", endAt: "2026-10-13T16:00:00.000Z",
  });
  assert.equal(formatSolveTime("2026-10-13T15:00:00Z"), "2026-10-14 00:00:00");
  assert.equal(solveHourLabel("2026-10-13T14:00:00Z", "2026-10-13T15:00:00Z"), "10-13 23:00 ~ 00:00");
  assert.deepEqual(solvePeriodQuery("", ""), { startAt: undefined, endAt: undefined });
  assert.equal(formatSolveTime(null), "-");
});

test("invalid dates and reversed or empty time intervals are rejected", () => {
  for (const [start, end] of [["2026-02-30T12:00", ""], ["2026-10-14T24:01", ""],
    ["2026-10-14T01:00", "2026-10-14T00:00"], ["2026-10-14T00:00", "2026-10-14T00:00"]]) {
    assert.throws(() => solvePeriodQuery(start, end));
  }
});

test("quick ranges count back from now in Korean time and stay open-ended", () => {
  const now = Date.parse("2026-10-14T05:30:45Z"); // 한국 시각 10-14 14:30:45
  assert.deepEqual(quickSolveRange("1h", now), { start: "2026-10-14T13:30", end: "" });
  assert.deepEqual(quickSolveRange("3h", now), { start: "2026-10-14T11:30", end: "" });
  assert.deepEqual(quickSolveRange("today", now), { start: "2026-10-14T00:00", end: "" });
  const afterMidnight = Date.parse("2026-10-13T15:10:00Z"); // 한국 시각 10-14 00:10
  assert.deepEqual(quickSolveRange("1h", afterMidnight), { start: "2026-10-13T23:10", end: "" });
  assert.deepEqual(quickSolveRange("today", afterMidnight), { start: "2026-10-14T00:00", end: "" });
  for (const key of ["1h", "3h", "today"]) assert.doesNotThrow(() => solvePeriodQuery(quickSolveRange(key, now).start, ""));
  assert.throws(() => quickSolveRange("week", now));
});
