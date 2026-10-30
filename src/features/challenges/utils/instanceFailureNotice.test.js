import test from "node:test";
import assert from "node:assert/strict";
import { mapChallengeInstance } from "./challengeDetailMapper.js";
import { getInstanceFailureNotice } from "./instanceFailureNotice.js";

test("생성에 실패한 정리 이력을 정상 종료로 표시하지 않는다", () => {
  for (const status of ["FAILED", "CLEANUP_PENDING", "CLEANED"]) {
    const notice = getInstanceFailureNotice(mapChallengeInstance({ status, delete_reason: "CREATE_FAILED_CLEANUP" }));
    assert.equal(notice.title, "인스턴스를 생성하지 못했습니다");
    assert.match(notice.message, status === "CLEANUP_PENDING" ? /정리/ : /운영진/);
  }
  assert.equal(getInstanceFailureNotice({ status: "CLEANED", deleteReason: "USER_REQUESTED" }), null);
  assert.equal(getInstanceFailureNotice({ status: "RUNNING", deleteReason: "CREATE_FAILED_CLEANUP" }), null);
});

test("서버가 TTL 만료로 확정한 초기화 실패는 새로고침 후에도 사유와 재생성 안내를 보여준다", () => {
  const payload = { instance_id: "replacement", status: "FAILED", replaced_instance_id: "original", delete_reason: "TTL_EXPIRED" };
  const notice = getInstanceFailureNotice(mapChallengeInstance(payload));
  assert.equal(notice.title, "초기화 중 사용 시간이 만료됐습니다");
  assert.equal(notice.message, "새 인스턴스를 생성해 주세요");
});

test("만료 시각이 지났더라도 서버 사유가 없으면 TTL 실패로 추측하지 않는다", () => {
  const instance = mapChallengeInstance({ status: "FAILED", replaced_instance_id: "original", expires_at: "2000-01-01T00:00:00Z", error_message: "private runtime details" });
  const notice = getInstanceFailureNotice(instance);
  assert.equal(notice.title, "초기화를 완료하지 못했습니다");
  assert.ok(!JSON.stringify(notice).includes("만료"));
  assert.ok(!JSON.stringify(notice).includes("private runtime"));
});

test("다른 생성 실패와 최대 사용 시간 만료를 초기화 TTL 만료로 표시하지 않는다", () => {
  assert.equal(getInstanceFailureNotice(mapChallengeInstance({ status: "FAILED", delete_reason: "TTL_EXPIRED" })).title, "생성 중 사용 시간이 만료됐습니다");
  assert.match(getInstanceFailureNotice(mapChallengeInstance({ status: "FAILED", delete_reason: "HARD_TIMEOUT" })).title, /최대 사용 시간/);
});

test("다시 생성했거나 다른 상태로 바뀌면 이전 실패 안내를 표시하지 않는다", () => {
  for (const status of ["REQUESTED", "RUNNING", "STOPPING", "CLEANED"]) {
    assert.equal(getInstanceFailureNotice({ status, replacedInstanceId: "old", deleteReason: "TTL_EXPIRED" }), null);
  }
  assert.equal(getInstanceFailureNotice(null), null);
});
