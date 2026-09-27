import assert from "node:assert/strict";
import test from "node:test";
import { getChallengeDeadline, formatRemaining } from "../../../utils/time.js";
import {
  adaptMyBoard,
  getRemainingSeconds,
} from "../../board/utils/boardData.js";
import {
  findChallengeInstance,
  findOtherInstance,
  formatFileSize,
  getAttachmentUrl,
  getInstanceControlState,
  getChallengeSubmissionState,
  mapChallengeDetail,
  mapChallengeInstance,
  getRetryDeadline,
} from "./challengeDetailMapper.js";

const openedAt = "2026-09-06T23:55:00Z";
const deadline = "2026-09-07T00:10:00.000Z";

test("개방 시각에 15분을 더하며 UTC 날짜 경계를 처리한다", () => {
  assert.equal(getChallengeDeadline(openedAt), deadline);
  assert.equal(getChallengeDeadline("2026-09-07T08:55:00+09:00"), deadline);
  for (const value of [null, undefined, "", "invalid"]) {
    assert.equal(getChallengeDeadline(value), null);
  }
});

test("15분 보너스가 만료되어도 미완료 문제에는 플래그를 제출할 수 있다", () => {
  const challenge = mapChallengeDetail({
    status: "OPENED",
    opened_at: openedAt,
    is_solved: false,
  });
  assert.equal(
    getChallengeSubmissionState(challenge, Date.parse(openedAt))
      .remainingSeconds,
    900,
  );
  const before = getChallengeSubmissionState(
    challenge,
    Date.parse(deadline) - 1,
  );
  assert.equal(before.remainingSeconds, 1);
  assert.equal(before.blocked, false);
  for (const now of [Date.parse(deadline), Date.parse(deadline) + 60_000]) {
    const state = getChallengeSubmissionState(challenge, now);
    assert.equal(state.blocked, false);
    assert.equal(state.expired, true);
    assert.equal(formatRemaining(state.remainingSeconds), "00:00");
  }
});

test("접속 정보는 RUNNING에서 외부 URL을 그대로 사용하고 내부 포트를 합성하지 않는다", () => {
  const data = {
    status: "RUNNING",
    endpoints: [
      {
        container_name: "web",
        port: 80,
        service_url: "https://challenge.example:30443/path?q=1",
      },
      {
        container_name: "shell",
        port: 9000,
        service_url: "tcp://challenge.example:30999",
      },
      { service_url: "javascript:alert(1)" },
      { service_url: "invalid" },
    ],
  };
  assert.deepEqual(
    mapChallengeInstance(data).endpoints.map(({ url, isWeb }) => ({
      url,
      isWeb,
    })),
    [
      { url: "https://challenge.example:30443/path?q=1", isWeb: true },
      { url: "tcp://challenge.example:30999", isWeb: false },
    ],
  );
  for (const status of ["REQUESTED", "STOPPING", "FAILED", "UNKNOWN"]) {
    assert.deepEqual(mapChallengeInstance({ ...data, status }).endpoints, []);
  }
});

test("서버가 반환한 재제출 대기 시간을 사용하고 잘못된 값은 타이머로 만들지 않는다", () => {
  assert.equal(
    getRetryDeadline({ data: { retry_after_seconds: 27 } }, 1000),
    28000,
  );
  for (const value of [undefined, null, -1, "27", Infinity]) {
    assert.equal(
      getRetryDeadline({ data: { retry_after_seconds: value } }, 1000),
      null,
    );
  }
});

test("CLEARED와 is_solved를 독립적으로 유지하면서 완료 문제의 제출을 막는다", () => {
  const cleared = mapChallengeDetail({
    status: "CLEARED",
    opened_at: openedAt,
    is_solved: false,
  });
  assert.equal(cleared.accessStatus, "CLEARED");
  assert.equal(cleared.solved, false);
  assert.equal(
    getChallengeSubmissionState(cleared, Date.parse(openedAt)).blocked,
    true,
  );
  const solved = mapChallengeDetail({ status: "OPENED", is_solved: true });
  assert.equal(solved.accessStatus, "OPENED");
  assert.equal(getChallengeSubmissionState(solved).isCleared, false);
  assert.equal(getChallengeSubmissionState(solved).blocked, true);
});

test("미제공 상태/시간을 목록이나 예전 deadline 필드로 추측하지 않는다", () => {
  const challenge = mapChallengeDetail({
    solve_deadline_at: deadline,
    created_at: openedAt,
  });
  assert.equal(challenge.openedAt, null);
  assert.equal(challenge.accessStatus, null);
  assert.equal(getChallengeSubmissionState(challenge).remainingSeconds, null);
  assert.equal(getChallengeSubmissionState(challenge).blocked, false);
  for (const status of ["SOLVED", "OPEN", "ACTIVE"]) {
    const state = getChallengeSubmissionState(mapChallengeDetail({ status }));
    assert.equal(state.isCleared, false);
    assert.equal(state.blocked, false);
  }
});

test("Board는 opened_at에서 마감을 계산하고 서버 시각으로 남은 시간을 보정한다", () => {
  const board = adaptMyBoard({
    active_challenge: {
      challenge_id: "test-challenge",
      opened_at: openedAt,
      solve_deadline_at: "2020-01-01T00:00:00Z",
    },
    cell_states: [
      { cell_index: 2, status: "OPENED" },
      { cell_index: 3, status: "CLEARED" },
    ],
  });
  assert.equal(board.activeChallenge.solveDeadlineAt, deadline);
  assert.deepEqual(
    board.cellStates.map((cell) => cell.status),
    ["OPENED", "CLEARED"],
  );
  const diceStatus = { serverTime: openedAt, receivedAt: 10_000 };
  assert.equal(
    getRemainingSeconds(
      board.activeChallenge.solveDeadlineAt,
      diceStatus,
      70_000,
    ),
    840,
  );
  assert.equal(
    getRemainingSeconds(
      board.activeChallenge.solveDeadlineAt,
      diceStatus,
      1_000_000,
    ),
    0,
  );
});

test("인스턴스는 문제 ID로만 선택하며 접근 상태나 열린 문제 목록에 의존하지 않는다", () => {
  const instance = {
    instance_id: "test-instance",
    challenge_id: "test-challenge",
    status: "RUNNING",
  };
  assert.equal(findChallengeInstance(instance, "test-challenge"), instance);
  assert.equal(findChallengeInstance(instance, "another-challenge"), null);
  assert.equal(findChallengeInstance(null, "test-challenge"), null);
});

test("첨부파일 크기 단위를 구분하고 실행 가능한 링크를 노출하지 않는다", () => {
  assert.equal(formatFileSize(128), "128 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(3670016), "3.5 MB");
  assert.equal(formatFileSize(1024 ** 3), "1.0 GB");
  for (const bytes of [undefined, -1, Infinity, "1024"])
    assert.equal(formatFileSize(bytes), "크기 정보 없음");
  assert.equal(getAttachmentUrl("/files/archive.zip"), "/files/archive.zip");
  assert.equal(
    getAttachmentUrl("https://files.example/archive.zip?signature=sample"),
    "https://files.example/archive.zip?signature=sample",
  );
  for (const url of [
    null,
    "",
    "javascript:void(0)",
    "data:text/plain,sample",
    "https://user:password@files.example/a",
  ])
    assert.equal(getAttachmentUrl(url), null);
});

test("외부 host만 제공된 응답은 그대로 표시하고 내부 포트를 붙이지 않는다", () => {
  const instance = mapChallengeInstance({
    status: "RUNNING",
    host: "https://challenge.example/path",
    endpoints: [],
    port: 8080,
  });
  assert.equal(instance.endpoints[0].url, "https://challenge.example/path");
  assert.deepEqual(
    mapChallengeInstance({
      status: "RUNNING",
      host: "internal-service",
      port: 8080,
    }).endpoints,
    [],
  );
});

test("다른 문제의 종료된 인스턴스에는 교체 안내를 표시하지 않는다", () => {
  const other = {
    instance_id: "another",
    challenge_id: "other",
    status: "RUNNING",
  };
  assert.equal(findOtherInstance(other, "current"), other);
  for (const status of ["STOPPED", "FAILED", "EXPIRED", "CLEANED"])
    assert.equal(findOtherInstance({ ...other, status }, "current"), null);
  assert.equal(
    findOtherInstance({ ...other, challenge_id: "current" }, "current"),
    null,
  );
});

test("생성·종료 중과 알 수 없는 상태에는 중복 생성과 제어를 막는다", () => {
  for (const status of ["REQUESTED", "PROVISIONING", "STOPPING", "UNKNOWN"]) {
    const controls = getInstanceControlState({ instanceId: "active", status });
    assert.equal(controls.canCreate, false);
    assert.equal(controls.canExtend, false);
    assert.equal(controls.canRestart, false);
    assert.equal(controls.canStop, false);
  }
  assert.equal(
    getInstanceControlState(null, { status: "STOPPING" }).canCreate,
    false,
  );
  assert.equal(
    getInstanceControlState(null, { status: "RUNNING" }).canCreate,
    true,
  );
  assert.equal(
    getInstanceControlState({ instanceId: "old", status: "EXPIRED" }).canCreate,
    true,
  );
});

test("연장 한도와 만료 시간을 반영하며 미제공 연장 횟수는 추측하지 않는다", () => {
  const instance = {
    instanceId: "active",
    status: "RUNNING",
    remainingSeconds: 60,
    hardRemainingSeconds: 180,
    extendsUsed: null,
  };
  assert.equal(getInstanceControlState(instance).canExtend, true);
  const limited = getInstanceControlState({ ...instance, extendsUsed: 3 });
  assert.equal(limited.canExtend, false);
  assert.equal(limited.extendLimitReached, true);
  for (const change of [{ remainingSeconds: 0 }, { hardRemainingSeconds: 0 }]) {
    const controls = getInstanceControlState({ ...instance, ...change });
    assert.equal(controls.canExtend, false);
    assert.equal(controls.canRestart, false);
    assert.equal(controls.canStop, true);
  }
  assert.equal(
    mapChallengeInstance({ status: "RUNNING", extend_count: "3" }).extendsUsed,
    null,
  );
});
