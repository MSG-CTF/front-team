import test from "node:test";
import assert from "node:assert/strict";
import { formatAdminTime } from "./adminTime.js";

test("관리자 표 시각은 KST 24시간제 고정 폭으로 보인다", () => {
  assert.equal(formatAdminTime("2026-10-21T14:12:05Z"), "10-21 23:12:05");
  assert.equal(formatAdminTime("2026-10-21T15:00:00Z"), "10-22 00:00:00");
  assert.equal(formatAdminTime("2026-11-08T01:02:03Z", { year: true }), "2026-11-08 10:02:03");
  assert.equal(formatAdminTime("2026-11-08T01:02:03Z", { year: true, seconds: false }), "2026-11-08 10:02");
});

test("시각이 없거나 읽을 수 없으면 줄표로 비워 둔다", () => {
  for (const value of [null, undefined, "", "not-a-date"]) assert.equal(formatAdminTime(value), "-");
});
