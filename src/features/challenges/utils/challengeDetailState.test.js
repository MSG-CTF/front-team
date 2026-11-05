import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_DETAIL_STATE,
  isInstanceChanging,
  needsInstanceLookup,
  readDetailResult,
  resolveDetailMetadata,
  resolveDetailState,
} from "./challengeDetailState.js";

const challenge = {
  challenge_id: "current",
  title: "열린 문제",
  is_solved: false,
};
const activeInstance = {
  instance_id: "instance",
  challenge_id: "current",
  status: "RUNNING",
};

test("생성·정리 중만 빠른 조회를 사용하고 실행·종료 후에는 멈춘다", () => {
  for (const status of ["REQUESTED", "SCHEDULING", "PROVISIONING", "STOPPING", "STOPPED", "CLEANUP_PENDING", "EXPIRED"]) {
    assert.equal(isInstanceChanging({ status }), true, status);
  }
  for (const status of ["RUNNING", "CLEANED", "FAILED", undefined]) {
    assert.equal(isInstanceChanging({ status }), false, status);
  }
  assert.equal(isInstanceChanging(null), false);
});

test("정적 문제와 Windows 원격 실행은 인스턴스 조회 없이 표시한다", () => {
  assert.equal(needsInstanceLookup({ requires_instance: false, instance: null }), false);
  assert.equal(needsInstanceLookup({ requires_instance: false, remote_run: { available: true } }), false);
});

test("실행형과 구버전 응답, 실행 중인 구버전 인스턴스는 조회를 유지한다", () => {
  assert.equal(needsInstanceLookup({ requires_instance: true }), true);
  assert.equal(needsInstanceLookup({}), true);
  assert.equal(needsInstanceLookup({ requires_instance: false, instance: activeInstance }), true);
});
const previous = {
  ...INITIAL_DETAIL_STATE,
  status: "success",
  challengeData: challenge,
  instanceData: activeInstance,
  refreshing: true,
};
const ok = (data) => ({ data, error: null });
const failed = (status, code = "REQUEST_FAILED") =>
  readDetailResult(
    {
      status: "rejected",
      reason: { response: { status, data: { code, message: "조회 실패" } } },
    },
    "기본 메시지",
  );

test("HTTP 200이어도 실패 코드이면 성공 데이터로 처리하지 않는다", () => {
  const result = readDetailResult(
    {
      status: "fulfilled",
      value: {
        status: 200,
        data: {
          code: "CHALLENGE_LOCKED",
          message: "개방되지 않은 문제",
          data: challenge,
        },
      },
    },
    "기본 메시지",
  );
  assert.equal(result.data, null);
  assert.equal(result.error.code, "CHALLENGE_LOCKED");
  assert.equal(result.error.recoverable, false);
});

test("일시적인 재조회 실패는 기존 문제를 보존하고 복구 시 오류를 지운다", () => {
  const stale = resolveDetailState(
    previous,
    failed(503),
    ok(activeInstance),
    "current",
  );
  assert.equal(stale.status, "success");
  assert.equal(stale.challengeData, challenge);
  assert.equal(stale.refreshError.recoverable, true);
  assert.equal(stale.refreshing, false);
  const updated = { ...challenge, score: 300 };
  const recovered = resolveDetailState(
    stale,
    ok(updated),
    ok(activeInstance),
    "current",
  );
  assert.equal(recovered.challengeData, updated);
  assert.equal(recovered.refreshError, null);
});

test("권한 회수와 잘못된 상세 응답은 이전 본문과 접속 주소를 제거한다", () => {
  for (const result of [
    failed(403, "CHALLENGE_LOCKED"),
    failed(404),
    ok(null),
    ok([]),
  ]) {
    const state = resolveDetailState(
      previous,
      result,
      ok(activeInstance),
      "current",
    );
    assert.equal(state.status, "error");
    assert.equal(state.challengeData, null);
    assert.equal(state.instanceData, null);
    assert.ok(state.pageError);
  }
});

test("최초 조회 실패에는 기존 내용 대신 전체 오류 상태를 표시한다", () => {
  const state = resolveDetailState(
    INITIAL_DETAIL_STATE,
    failed(503),
    ok(activeInstance),
    "current",
  );
  assert.equal(state.status, "error");
  assert.equal(state.challengeData, null);
  assert.equal(state.refreshError, null);
});

test("인스턴스 조회만 실패하면 문제는 유지하고 이전 접속 주소를 숨긴다", () => {
  const state = resolveDetailState(
    previous,
    ok(challenge),
    failed(503),
    "current",
  );
  assert.equal(state.status, "success");
  assert.equal(state.challengeData, challenge);
  assert.equal(state.pageError, null);
  assert.equal(state.instanceData, null);
  assert.equal(state.otherInstanceData, null);
  assert.ok(state.instanceError);
});

test("다른 문제의 활성 인스턴스를 현재 문제 접속 정보와 구분한다", () => {
  const other = { ...activeInstance, challenge_id: "other" };
  const state = resolveDetailState(
    previous,
    ok(challenge),
    ok(other),
    "current",
  );
  assert.equal(state.instanceData, null);
  assert.equal(state.otherInstanceData, other);
});

test("응답 없는 네트워크 오류도 재시도 가능한 상태로 처리한다", () => {
  const result = readDetailResult(
    { status: "rejected", reason: new Error("Network Error") },
    "연결 확인",
  );
  assert.equal(result.error.message, "연결 확인");
  assert.equal(result.error.recoverable, true);
});

test("본문을 먼저 표시하고 최초 인스턴스 확인이 끝날 때까지 작업을 보류한다", () => {
  const state = resolveDetailMetadata(INITIAL_DETAIL_STATE, ok(challenge), "current");
  assert.equal(state.status, "success");
  assert.equal(state.challengeData, challenge);
  assert.equal(state.instanceLookupPending, true);
  assert.equal(state.instanceChecked, false);
  assert.equal(state.instanceData, null);
  const ready = resolveDetailState(state, ok(challenge), ok(activeInstance), "current");
  assert.equal(ready.instanceLookupPending, false);
  assert.equal(ready.instanceChecked, true);
  assert.equal(ready.instanceData, activeInstance);
});

test("인스턴스 확인 실패 후 다시 읽는 동안은 생성 전 상태로 오인하지 않는다", () => {
  const failedState = resolveDetailState(previous, ok(challenge), failed(503), "current");
  assert.equal(failedState.instanceChecked, false);
  const retrying = resolveDetailMetadata(failedState, ok(challenge), "current");
  assert.equal(retrying.instanceError, null);
  assert.equal(retrying.instanceLookupPending, true);
  const empty = resolveDetailState(retrying, ok(challenge), ok(null), "current");
  assert.equal(empty.instanceChecked, true);
  assert.equal(empty.instanceLookupPending, false);
  assert.equal(empty.instanceData, null);
});

test("확인된 인스턴스는 정기 본문 조회마다 다시 대기 상태로 바꾸지 않는다", () => {
  const checked = { ...previous, instanceChecked: true };
  const state = resolveDetailMetadata(checked, ok(challenge), "current");
  assert.equal(state.instanceLookupPending, false);
  assert.equal(state.instanceData, activeInstance);
});

test("본문 재조회 실패는 확인된 상태를 보존하고 권한 회수는 즉시 지운다", () => {
  const checked = { ...previous, instanceChecked: true, teammateInstanceData: { instance: activeInstance } };
  const stale = resolveDetailMetadata(checked, failed(503), "current");
  assert.equal(stale.challengeData, challenge);
  assert.equal(stale.instanceData, activeInstance);
  assert.equal(stale.refreshing, false);
  assert.ok(stale.refreshError);
  const denied = resolveDetailMetadata(checked, failed(403, "CHALLENGE_LOCKED"), "current");
  assert.equal(denied.status, "error");
  assert.equal(denied.challengeData, null);
  assert.equal(denied.instanceData, null);
  assert.equal(denied.teammateInstanceData, null);
  assert.equal(denied.instanceLookupPending, false);
});

test("정적 문제로 바뀌면 이전 인스턴스와 팀원 주소를 남기지 않는다", () => {
  const state = resolveDetailMetadata(
    { ...previous, teammateInstanceData: { instance: activeInstance } },
    ok({ ...challenge, requires_instance: false }), "current",
  );
  assert.equal(state.instanceLookupPending, false);
  assert.equal(state.instanceChecked, true);
  assert.equal(state.instanceData, null);
  assert.equal(state.teammateInstanceData, null);
});

test("본문 오류에서 복구할 때는 이전 인스턴스 확인 결과만으로 작업을 열지 않는다", () => {
  const checked = { ...previous, instanceChecked: true };
  const stale = resolveDetailMetadata(checked, failed(503), "current");
  const recovering = resolveDetailMetadata(stale, ok(challenge), "current");
  assert.equal(recovering.instanceLookupPending, true);
  assert.equal(recovering.instanceChecked, false);
});

test("정적 문제에서 실행형으로 전환되면 현재 인스턴스를 새로 확인한다", () => {
  const staticState = resolveDetailMetadata(INITIAL_DETAIL_STATE, ok({ ...challenge, requires_instance: false }), "current");
  const runtimeState = resolveDetailMetadata(staticState, ok({ ...challenge, requires_instance: true }), "current");
  assert.equal(runtimeState.instanceLookupPending, true);
  assert.equal(runtimeState.instanceChecked, false);
});
