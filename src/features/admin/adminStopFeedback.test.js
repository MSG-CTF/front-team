import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACTIVE_INSTANCE_STATUSES, INSTANCE_STATUS } from "../../constants/enums.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("관리자 인스턴스 목록은 생성·재시작·종료가 도는 상태 앞에 링을 달고 실행 중에는 달지 않는다", () => {
  const page = source("./pages/AdminChallengesPage.jsx");
  assert.match(page, /const MOVING_STATUSES = ACTIVE_INSTANCE_STATUSES\.filter\(\(status\) => status !== INSTANCE_STATUS\.RUNNING\)/);
  const moving = ACTIVE_INSTANCE_STATUSES.filter((status) => status !== INSTANCE_STATUS.RUNNING);
  assert.ok(moving.includes(INSTANCE_STATUS.STOPPING) && moving.includes(INSTANCE_STATUS.RESTARTING));
  assert.ok(!moving.includes(INSTANCE_STATUS.RUNNING) && !moving.includes(INSTANCE_STATUS.CLEANUP_PENDING));
  assert.match(page, /MOVING_STATUSES\.includes\(instance\.status\) \? <LoadingRing>/);
});

test("강제 종료·재시작·정리 확인 단추는 요청을 기다리는 동안 링과 요청 중 문구로 바뀐다", () => {
  const page = source("./pages/AdminChallengesPage.jsx");
  assert.match(page, /const ACTION_PENDING = \{ stop: "종료 요청 중", reset: "재시작 요청 중", cleanup: "정리 요청 중" \}/);
  assert.match(page, /\{busy \? <LoadingRing>\{ACTION_PENDING\[confirmation\.kind\]\}<\/LoadingRing>/);
  const dashboard = source("./pages/AdminDashboardPage.jsx");
  assert.match(dashboard, /<LoadingRing>\{canRetryCleanup\(confirm\) \? "정리 요청 중" : "종료 요청 중"\}<\/LoadingRing>/);
});

test("배포 테스트는 누른 종료 단추에만 요청 중을 달고 종료·정리 중 상태 앞에 링을 단다", () => {
  const panel = source("./components/AdminDeploymentTestPanel.jsx");
  assert.match(panel, /const STOPPING_STATES = \["STOPPING", "STOPPED", "EXPIRED"\]/);
  assert.equal(panel.match(/stoppingId === (active|latest)\.test_id \? <LoadingRing>종료 요청 중<\/LoadingRing>/g).length, 2);
  assert.match(panel, /STOPPING_STATES\.includes\(latest\.status\) \? <LoadingRing>/);
  // 종료를 기다리는 동안 테스트 실행 단추가 요청 중으로 바뀌지 않는다
  assert.match(panel, /\{busy && !stoppingId \? "요청 중" : "테스트 실행"\}/);
});
