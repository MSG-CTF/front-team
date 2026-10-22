import test from "node:test";
import assert from "node:assert/strict";
import { buildContestPatch, contestStarted, describeDuration, isoFromKstInput, kstInputFromIso, shiftKstInput } from "./adminContestTime.js";

test("한국 시각 입력과 UTC ISO를 브라우저 시간대와 상관없이 오간다", () => {
  assert.equal(kstInputFromIso("2026-10-22T11:48:00Z"), "2026-10-22T20:48");
  assert.equal(isoFromKstInput("2026-10-22T20:48"), "2026-10-22T11:48:00Z");
  assert.equal(isoFromKstInput("2026-10-23T00:10"), "2026-10-22T15:10:00Z");
  assert.equal(isoFromKstInput("2026-02-30T10:00"), null);
  assert.equal(isoFromKstInput("2026-10-22 20:48"), null);
  assert.equal(kstInputFromIso("없음"), "");
});

test("빠른 조정은 분 단위로 옮기고 날짜가 넘어가도 맞다", () => {
  assert.equal(shiftKstInput("2026-10-23T08:48", 30), "2026-10-23T09:18");
  assert.equal(shiftKstInput("2026-10-22T23:50", 60), "2026-10-23T00:50");
  assert.equal(shiftKstInput("2026-10-23T08:48", -30), "2026-10-23T08:18");
  assert.equal(shiftKstInput("", 30), "");
});

test("바뀐 항목만 보내고 시작한 대회의 시작 시각은 막는다", () => {
  const before = { status: "BEFORE", started_at: "2026-10-24T01:00:00Z", ends_at: "2026-10-24T13:00:00Z" };
  const now = Date.parse("2026-10-23T00:00:00Z");
  assert.deepEqual(buildContestPatch(before, { start: "2026-10-24T10:00", end: "2026-10-24T22:00" }, now), { body: {}, changed: false, startedChange: false });
  assert.deepEqual(buildContestPatch(before, { start: "2026-10-24T09:00", end: "2026-10-24T22:00" }, now),
    { body: { started_at: "2026-10-24T00:00:00Z" }, changed: true, startedChange: false });

  const running = { status: "RUNNING", started_at: "2026-10-22T11:48:00Z", ends_at: "2026-10-22T23:48:00Z" };
  assert.deepEqual(buildContestPatch(running, { start: "2026-10-22T20:48", end: "2026-10-23T09:18" }, now),
    { body: { ends_at: "2026-10-23T00:18:00Z" }, changed: true, startedChange: false });
  assert.deepEqual(buildContestPatch(running, { start: "2026-10-22T21:00", end: "2026-10-23T09:18" }, now, { allowStarted: true }),
    { body: { force: true, started_at: "2026-10-22T12:00:00Z", ends_at: "2026-10-23T00:18:00Z" }, changed: true, startedChange: true });
  assert.equal(buildContestPatch(running, { start: "2026-10-22T21:00", end: "2026-10-23T09:18" }, now).error, "이미 시작한 대회는 시작 시각을 바꿀 수 없습니다");
  assert.equal(buildContestPatch(running, { start: "2026-10-22T20:48", end: "2026-10-22T20:00" }, now).error, "종료는 시작보다 늦어야 합니다");
  assert.equal(buildContestPatch(running, { start: "", end: "2026-10-22T20:00" }, now).error, "날짜와 시각을 모두 입력해주세요");
});

test("시작 여부는 상태나 시작 시각으로 판단하고 대회 길이를 한국어로 보인다", () => {
  assert.equal(contestStarted({ status: "RUNNING" }), true);
  assert.equal(contestStarted({ status: "BEFORE", started_at: "2026-10-22T00:00:00Z" }, Date.parse("2026-10-23T00:00:00Z")), true);
  assert.equal(contestStarted({ status: "BEFORE", started_at: "2026-10-24T00:00:00Z" }, Date.parse("2026-10-23T00:00:00Z")), false);
  assert.equal(describeDuration("2026-10-22T20:48", "2026-10-23T08:48"), "12시간");
  assert.equal(describeDuration("2026-10-22T20:48", "2026-10-23T09:18"), "12시간 30분");
  assert.equal(describeDuration("2026-10-22T20:48", "2026-10-22T21:08"), "20분");
  assert.equal(describeDuration("2026-10-22T20:48", "2026-10-22T20:00"), "");
});
