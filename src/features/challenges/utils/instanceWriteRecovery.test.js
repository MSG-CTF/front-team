import test from "node:test";
import assert from "node:assert/strict";
import { attachInstanceWriteRecovery, isConfirmedInstanceWrite } from "./instanceWriteRecovery.js";

const feedback = { type: "error", code: "SCHEDULER_UNAVAILABLE", message: "연결 실패" };
const error = { response: { status: 503, data: { data: { operation_id: "request-1" } } } };
const instance = { instance_id: "child-1", challenge_id: "challenge-1", operation_id: "request-1", status: "RUNNING" };

test("a recovered create or reset dismisses only its own transport failure", () => {
  for (const action of ["create", "restart"]) {
    const notice = attachInstanceWriteRecovery(feedback, error, action, "challenge-1");
    assert.equal(isConfirmedInstanceWrite(notice, instance), true);
    assert.equal(isConfirmedInstanceWrite(notice, { ...instance, operation_id: "request-2" }), false);
    assert.equal(isConfirmedInstanceWrite(notice, { ...instance, challenge_id: "challenge-2" }), false);
  }
});

test("an unchanged instance or an unrelated response does not establish recovery", () => {
  const notice = attachInstanceWriteRecovery(feedback, error, "restart", "challenge-1");
  for (const value of [null, {}, { ...instance, operation_id: undefined }, { ...instance, instance_id: null }]) {
    assert.equal(isConfirmedInstanceWrite(notice, value), false);
  }
});

test("validation, extension, stop, and legacy errors keep their feedback", () => {
  for (const action of ["extend", "stop"]) {
    assert.equal(attachInstanceWriteRecovery(feedback, error, action, "challenge-1"), feedback);
  }
  for (const value of [{ response: { status: 409 } }, { response: { status: 403 } }, {}, { response: { status: 503, data: {} } }]) {
    assert.equal(attachInstanceWriteRecovery(feedback, value, "restart", "challenge-1"), feedback);
  }
});

test("a later failure is not cleared by an earlier operation receipt", () => {
  const earlier = attachInstanceWriteRecovery(feedback, error, "restart", "challenge-1");
  const later = attachInstanceWriteRecovery(feedback, {
    response: { status: 503, data: { data: { operation_id: "request-2" } } },
  }, "restart", "challenge-1");
  assert.equal(isConfirmedInstanceWrite(earlier, instance), true);
  assert.equal(isConfirmedInstanceWrite(later, instance), false);
  assert.equal(isConfirmedInstanceWrite({ type: "success", recovery: earlier.recovery }, instance), false);
});
