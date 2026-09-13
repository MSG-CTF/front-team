import test from "node:test";
import assert from "node:assert/strict";
import { validateAdminAccount, validateAdminSettings, createRequestGuard, getAdminRequestError, summarizeAdminResources, validateAdminChallenge } from "./adminValidation.js";

const account = { loginId: "qa", password: " 123456 ", nickname: "테스트", role: "PARTICIPANT", isLeader: false, teamMode: "NONE", teamId: "" };
test("비밀번호는 공백을 보존하고 8~128자 경계를 검사한다", () => {
  assert.equal(validateAdminAccount(account), "");
  assert.equal(account.password, " 123456 ");
  for (const password of ["1234567", "a".repeat(129), "😀".repeat(4)]) assert.notEqual(validateAdminAccount({ ...account, password }), "");
  assert.equal(validateAdminAccount({ ...account, password: "a".repeat(128) }), "");
});
test("관리자와 팀장 동시 지정 및 지원하지 않는 신규 팀 요청을 거부한다", () => {
  assert.notEqual(validateAdminAccount({ ...account, role: "ADMIN", isLeader: true }), "");
  assert.notEqual(validateAdminAccount({ ...account, teamMode: "NEW" }), "");
  assert.notEqual(validateAdminAccount({ ...account, teamMode: "EXISTING", teamId: "" }), "");
});
test("설정의 빈 값, 소수와 범위 밖 값을 저장하지 않는다", () => {
  const form = { dice_rolls_per_reset: 3, dice_reset_interval_minutes: 60, solve_deadline_minutes: 15, max_attempts: 3, lock_seconds: 30 };
  assert.equal(validateAdminSettings(form), true);
  for (const lock_seconds of ["", 0, 1.5, 3601, undefined]) assert.equal(validateAdminSettings({ ...form, lock_seconds }), false);
});
test("이전 필터 요청이 나중에 끝나도 현재 요청을 덮을 수 없고 취소 시 무효화된다", () => {
  const guard = createRequestGuard();
  const old = guard.begin();
  const current = guard.begin();
  assert.equal(old.signal.aborted, true);
  assert.equal(old.isCurrent(), false);
  assert.equal(current.isCurrent(), true);
  current.abort();
  assert.equal(current.signal.aborted, true);
  assert.equal(current.isCurrent(), true);
  guard.cancel();
  assert.equal(current.signal.aborted, true);
  assert.equal(current.isCurrent(), false);
});
test("미구현 경로와 존재하지 않는 대상의 404를 구분한다", () => {
  assert.equal(getAdminRequestError({ response: { status: 404 } }).status, "unavailable");
  assert.equal(getAdminRequestError({ response: { status: 501 } }).status, "unavailable");
  assert.equal(getAdminRequestError({ response: { status: 404, data: { code: "TEAM_NOT_FOUND", message: "팀 없음" } } }).error, "팀 없음");
  assert.equal(getAdminRequestError({ response: { status: 404, data: { code: "TEAM_NOT_FOUND" } } }).status, "error");
});

test("리소스 요약은 실제 노드 값만 평균내고 미제공 사용률을 0으로 처리하지 않는다", () => {
  const summary = summarizeAdminResources({ accounts: [{ nodes: [{ status: "HEALTHY", cpu_usage_percent: 40 }, { status: "DEGRADED", cpu_usage_percent: 80 }] }] });
  assert.equal(summary.nodesTotal, 2);
  assert.equal(summary.nodesHealthy, 1);
  assert.equal(summary.averageCpuUsagePercent, 60);
  assert.equal(summary.averageMemoryUsagePercent, null);
  assert.equal(summarizeAdminResources(null), null);
});

const challenge = { challengeSlug: "qa-challenge", title: "QA", category: "WEB", difficulty: "EASY", flag: " qa-placeholder ", initialScore: "1000", minimumScore: "600", decay: "70" };
test("문제 등록의 식별자, 필수 필드와 점수 관계를 검증한다", () => {
  assert.equal(validateAdminChallenge(challenge), "");
  for (const patch of [
    { challengeSlug: "QA-challenge" }, { challengeSlug: "a".repeat(101) }, { challengeSlug: "qa--challenge" }, { title: " " },
    { category: "UNKNOWN" }, { difficulty: "UNKNOWN" }, { flag: "" },
    { initialScore: "" }, { minimumScore: "" }, { initialScore: "500" },
    { minimumScore: "-1" }, { initialScore: "Infinity" },
    { decay: "0" }, { decay: "1.5" }, { initialScore: "1000.001" }, { initialScore: "10000000000" },
  ]) assert.notEqual(validateAdminChallenge({ ...challenge, ...patch }), "");
  assert.equal(validateAdminChallenge({ ...challenge, initialScore: "1000.25" }), "");
  assert.equal(challenge.flag, " qa-placeholder ");
});
test("미구현 문제 등록 메서드의 405를 운영 불가 상태로 표시한다", () => {
  assert.equal(getAdminRequestError({ response: { status: 405 } }).status, "unavailable");
});
