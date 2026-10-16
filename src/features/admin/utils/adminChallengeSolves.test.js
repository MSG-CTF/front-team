import assert from "node:assert/strict";
import test from "node:test";
import { formatSolveTime, solveHourLabel, solvePeriodQuery } from "./adminChallengeSolves.js";

test("Korean time filters and output do not depend on the browser timezone", () => {
  assert.deepEqual(solvePeriodQuery("2026-10-14T00:00", "2026-10-14T01:00"), {
    startAt: "2026-10-13T15:00:00.000Z", endAt: "2026-10-13T16:00:00.000Z",
  });
  assert.equal(formatSolveTime("2026-10-13T15:00:00Z"), "2026-10-14 00:00:00");
  assert.equal(solveHourLabel("2026-10-13T14:00:00Z", "2026-10-13T15:00:00Z"), "10-13 23:00 ~ 00:00");
  assert.deepEqual(solvePeriodQuery("", ""), { startAt: undefined, endAt: undefined });
  assert.equal(formatSolveTime(null), "—");
});

test("invalid dates and reversed or empty time intervals are rejected", () => {
  for (const [start, end] of [["2026-02-30T12:00", ""], ["2026-10-14T24:01", ""],
    ["2026-10-14T01:00", "2026-10-14T00:00"], ["2026-10-14T00:00", "2026-10-14T00:00"]]) {
    assert.throws(() => solvePeriodQuery(start, end));
  }
});
