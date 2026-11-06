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

test("a lost stop response is resolved by the exact cleaned instance", () => {
  const notice = attachInstanceWriteRecovery(feedback, { response: { status: 503 } }, "stop", "challenge-1", "parent-1");
  assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-1", status: "CLEANED" }), true);
  assert.equal(isConfirmedInstanceWrite(notice, { ...instance, status: "CLEANED" }), false);
  assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-2", status: "CLEANED" }), false);
});

test("a stop error remains until cleanup finishes", () => {
  const notice = attachInstanceWriteRecovery(feedback, error, "stop", "challenge-1", "parent-1");
  for (const status of ["RUNNING", "STOPPING", "CLEANUP_PENDING", "STOPPED", "FAILED"]) {
    assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-1", status }), false);
  }
  for (const value of [null, {}, { challenge_id: "challenge-1", status: "CLEANED" }]) {
    assert.equal(isConfirmedInstanceWrite(notice, value), false);
  }
});

test("a browser network failure can resolve a stop without an operation receipt", () => {
  for (const code of ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]) {
    const notice = attachInstanceWriteRecovery(feedback, { code }, "stop", "challenge-1", "parent-1");
    assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-1", status: "CLEANED" }), true);
    assert.equal(attachInstanceWriteRecovery(feedback, { code }, "create", "challenge-1"), feedback);
  }
});

test("stop validation errors, cancellations, and missing targets retain feedback", () => {
  for (const value of [{ response: { status: 400 } }, { response: { status: 403 } }, { response: { status: 409 } }, { code: "ERR_CANCELED" }, {}]) {
    assert.equal(attachInstanceWriteRecovery(feedback, value, "stop", "challenge-1", "parent-1"), feedback);
  }
  for (const id of [undefined, null, "", 123]) {
    assert.equal(attachInstanceWriteRecovery(feedback, error, "stop", "challenge-1", id), feedback);
    assert.equal(attachInstanceWriteRecovery(feedback, error, "stop", id, "parent-1"), feedback);
  }
});

test("a newer stop failure is not cleared by the previously deleted instance", () => {
  const earlier = attachInstanceWriteRecovery(feedback, error, "stop", "challenge-1", "parent-1");
  const later = attachInstanceWriteRecovery(feedback, error, "stop", "challenge-1", "parent-2");
  const cleaned = { instance_id: "parent-1", challenge_id: "challenge-1", status: "CLEANED" };
  assert.equal(isConfirmedInstanceWrite(earlier, cleaned), true);
  assert.equal(isConfirmedInstanceWrite(later, cleaned), false);
  assert.equal(isConfirmedInstanceWrite({ type: "success", recovery: earlier.recovery }, cleaned), false);
});

test("a repeated stop rejected after the state changes resolves only after cleanup", () => {
  const duplicate = { response: { status: 400, data: { code: "INVALID_STATE_TRANSITION" } } };
  const notice = attachInstanceWriteRecovery(feedback, duplicate, "stop", "challenge-1", "parent-1");
  assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-1", status: "STOPPING" }), false);
  assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-1", challenge_id: "challenge-1", status: "CLEANED" }), true);
  assert.equal(isConfirmedInstanceWrite(notice, { instance_id: "parent-2", challenge_id: "challenge-1", status: "CLEANED" }), false);
});

const lostGatewayResponse = { response: { status: 502, data: "<html>Bad Gateway</html>" } };
const previous = { operationId: "previous-request", replacementInstanceId: null };
const fresh = { instance_id: "fresh-1", operation_id: "new-request", challenge_id: "challenge-1", status: "RUNNING", replaced_instance_id: null };

test("a restart that loses the entire create receipt clears after the new instance is running", () => {
  const notice = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "create", "challenge-1", "previous-instance", previous);
  assert.equal(isConfirmedInstanceWrite(notice, fresh), true);
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, instance_id: "previous-instance" }), false);
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, operation_id: "previous-request" }), false);
});

test("a first creation without prior history still requires a completed operation receipt", () => {
  const notice = attachInstanceWriteRecovery(feedback, { code: "ERR_NETWORK" }, "create", "challenge-1", null, { operationId: undefined, replacementInstanceId: null });
  assert.equal(isConfirmedInstanceWrite(notice, fresh), true);
  for (const operation_id of [undefined, null, ""]) {
    assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, operation_id }), false);
  }
  const { replaced_instance_id, ...withoutSource } = fresh;
  assert.equal(isConfirmedInstanceWrite(notice, withoutSource), false);
});

test("reset recovery without the HTTP receipt must point back to the exact source", () => {
  const notice = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "restart", "challenge-1", "source-1", { operationId: "old-request", replacementInstanceId: "source-1" });
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, replaced_instance_id: "source-1" }), true);
  for (const replaced_instance_id of [null, undefined, "different-source"]) {
    assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, replaced_instance_id }), false);
  }
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, instance_id: "source-1", replaced_instance_id: "source-1" }), false);
});

test("creating by replacing another challenge requires the confirmed replacement source", () => {
  const notice = attachInstanceWriteRecovery(feedback, { code: "ETIMEDOUT" }, "create", "challenge-1", "old-history", { operationId: "old-request", replacementInstanceId: "other-challenge-source" });
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, replaced_instance_id: "other-challenge-source" }), true);
  assert.equal(isConfirmedInstanceWrite(notice, fresh), false);
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, replaced_instance_id: "unrelated-source" }), false);
});

test("pending, failed, and cleaned operations keep an error when the receipt was lost", () => {
  const notice = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "create", "challenge-1", "old-history", previous);
  for (const status of ["CREATING", "SCHEDULING", "PROVISIONING", "RUNNING_ERROR", "FAILED", "STOPPING", "CLEANUP_PENDING", "CLEANED"]) {
    assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, status }), false);
  }
});

test("a different challenge or malformed instance cannot dismiss the error", () => {
  const notice = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "create", "challenge-1", null, previous);
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, challenge_id: "challenge-2" }), false);
  for (const value of [null, {}, { ...fresh, instance_id: "" }, { ...fresh, instance_id: 123 }, { ...fresh, operation_id: 123 }]) {
    assert.equal(isConfirmedInstanceWrite(notice, value), false);
  }
});

test("validation, permission, cancellation, and unclassified errors retain their feedback", () => {
  for (const error of [{ response: { status: 400 } }, { response: { status: 401 } }, { response: { status: 403 } }, { response: { status: 409 } }, { response: { status: 500 } }, { code: "ERR_CANCELED" }, {}]) {
    assert.equal(attachInstanceWriteRecovery(feedback, error, "create", "challenge-1", "old-history", previous), feedback);
  }
});

test("a missing snapshot or uncertain reset source cannot establish transport recovery", () => {
  for (const snapshot of [undefined, {}, { replacementInstanceId: undefined }, { replacementInstanceId: "" }, { replacementInstanceId: 12 }]) {
    assert.equal(attachInstanceWriteRecovery(feedback, lostGatewayResponse, "create", "challenge-1", "old-history", snapshot), feedback);
  }
  assert.equal(attachInstanceWriteRecovery(feedback, lostGatewayResponse, "restart", "challenge-1", "source-1", { replacementInstanceId: "source-2" }), feedback);
  assert.equal(attachInstanceWriteRecovery(feedback, lostGatewayResponse, "restart", "challenge-1", null, { replacementInstanceId: null }), feedback);
});

test("a later reset failure is not cleared by an earlier replacement", () => {
  const earlier = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "restart", "challenge-1", "source-1", { operationId: "old-request", replacementInstanceId: "source-1" });
  const later = attachInstanceWriteRecovery(feedback, lostGatewayResponse, "restart", "challenge-1", "fresh-1", { operationId: "new-request", replacementInstanceId: "fresh-1" });
  assert.equal(isConfirmedInstanceWrite(earlier, { ...fresh, replaced_instance_id: "source-1" }), true);
  assert.equal(isConfirmedInstanceWrite(later, { ...fresh, replaced_instance_id: "source-1" }), false);
});

test("an explicit receipt remains authoritative even before a recovered instance is running", () => {
  const notice = attachInstanceWriteRecovery(feedback, error, "restart", "challenge-1", "source-1", { operationId: "old-request", replacementInstanceId: "source-1" });
  assert.equal(isConfirmedInstanceWrite(notice, { ...instance, status: "PROVISIONING" }), true);
  assert.equal(isConfirmedInstanceWrite(notice, { ...fresh, replaced_instance_id: "source-1" }), false);
});
