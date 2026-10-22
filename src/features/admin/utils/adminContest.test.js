import test from "node:test";
import assert from "node:assert/strict";
import { describeContest, formatCountdown } from "./adminContest.js";

test("남은 시간은 시:분:초 자릿수를 고정하고 음수는 0으로 본다", () => {
  assert.equal(formatCountdown(27000), "7:30:00");
  assert.equal(formatCountdown(59), "0:00:59");
  assert.equal(formatCountdown(-5), "0:00:00");
  assert.equal(formatCountdown("abc"), "0:00:00");
});

test("대회 시간 위젯은 시작 전, 진행 중, 종료를 시각으로 가르고 지난 비율을 함께 준다", () => {
  const start = "2026-10-22T03:00:00Z";
  const end = "2026-10-22T12:00:00Z";
  const contest = { status: "RUNNING", start_time: start, end_time: end, remaining_seconds: 1 };
  const before = describeContest(contest, Date.parse("2026-10-22T02:30:00Z"));
  assert.equal(before.label, "대회 시작 전");
  assert.equal(before.value, "0:30:00");
  assert.equal(before.progress, 0);
  const running = describeContest(contest, Date.parse("2026-10-22T04:30:00Z"));
  assert.equal(running.label, "대회 진행 중");
  assert.equal(running.value, "7:30:00");
  assert.match(running.sub, /종료 10-22 21:00/);
  assert.equal(running.range, "10-22 12:00 ~ 10-22 21:00");
  assert.ok(Math.abs(running.progress - 1.5 / 9) < 1e-9);
  const over = describeContest(contest, Date.parse("2026-10-22T13:00:00Z"));
  assert.equal(over.label, "대회 종료");
  assert.equal(over.value, "종료");
  assert.equal(over.progress, 1);
  assert.equal(describeContest({ status: "ENDED", start_time: start, end_time: end }, Date.parse("2026-10-22T04:30:00Z")).label, "대회 종료");
  assert.equal(describeContest({ status: "RUNNING", remaining_seconds: 90 }).value, "0:01:30");
  assert.equal(describeContest(null).value, "-");
});
