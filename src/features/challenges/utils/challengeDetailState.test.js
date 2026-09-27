import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_DETAIL_STATE,
  readDetailResult,
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
