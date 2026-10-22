import test from "node:test";
import assert from "node:assert/strict";
import { contestGateState, formatWaiting, isGatedPath } from "./contestGate.js";

const before = { status: "BEFORE", start_time: "2026-10-24T01:00:00Z", name: "MSG CTF 2026" };
const now = Date.parse("2026-10-24T00:00:00Z");

test("게임 화면만 막고 규칙, 타이머, 마이페이지는 연다", () => {
  for (const path of ["/board", "/challenges/abc", "/signatures/clubs/x", "/koth", "/leaderboard"]) assert.equal(isGatedPath(path), true, path);
  for (const path of ["/rules", "/timer", "/mypage", "/boards", "/admin/koth"]) assert.equal(isGatedPath(path), false, path);
});

test("시작 전 참가자는 남은 시간과 함께 막히고 관리자는 지나간다", () => {
  const gate = contestGateState({ timer: before, role: "PARTICIPANT", pathname: "/board", now });
  assert.equal(gate.blocked, true);
  assert.equal(gate.secondsLeft, 3600);
  assert.equal(contestGateState({ timer: before, role: "ADMIN", pathname: "/board", now }).blocked, false);
  assert.equal(contestGateState({ timer: before, role: "PARTICIPANT", pathname: "/rules", now }).blocked, false);
});

test("시작 시각이 지났거나 진행 중이거나 타이머가 없으면 막지 않는다", () => {
  assert.equal(contestGateState({ timer: before, role: "PARTICIPANT", pathname: "/board", now: Date.parse("2026-10-24T01:00:01Z") }).blocked, false);
  assert.equal(contestGateState({ timer: { ...before, status: "RUNNING" }, role: "PARTICIPANT", pathname: "/board", now }).blocked, false);
  assert.equal(contestGateState({ timer: null, role: "PARTICIPANT", pathname: "/board", now }).blocked, false);
  assert.equal(contestGateState({ timer: before, role: "PARTICIPANT", pathname: "/board", now, offsetMs: 3600 * 1000 }).blocked, false);
});

test("남은 시간은 시:분:초, 하루가 넘으면 일을 붙인다", () => {
  assert.equal(formatWaiting(3661), "01:01:01");
  assert.equal(formatWaiting(90061), "1일 01:01:01");
  assert.equal(formatWaiting(null), "-");
});
