import assert from "node:assert/strict";
import test from "node:test";
import { activeTestFromFailure, deploymentTestSteps } from "./adminDeploymentTests.js";

test("provisioning never counts as a passed connection test", () => {
  assert.deepEqual(deploymentTestSteps({ status: "PROVISIONING" }).map((step) => step.state), ["done", "done", "current", "waiting"]);
  assert.deepEqual(deploymentTestSteps({ status: "RUNNING", running_at: "2026-10-14T01:00:00Z" }).map((step) => step.state), ["done", "done", "done", "manual"]);
});

test("failed deployments and missing history do not show completed checks", () => {
  for (const state of [null, { status: "FAILED" }]) assert.ok(deploymentTestSteps(state).every((step) => step.state === "waiting"));
});

test("known failure codes identify the blocked stage without claiming readiness", () => {
  assert.deepEqual(deploymentTestSteps({ status: "FAILED", error_code: "RESOURCE_UNAVAILABLE" }).map((step) => step.state), ["done", "failed", "waiting", "waiting"]);
  assert.deepEqual(deploymentTestSteps({ status: "FAILED", error_code: "RUNTIME_CREATE_FAILED" }).map((step) => step.state), ["done", "done", "failed", "waiting"]);
  assert.deepEqual(deploymentTestSteps({ status: "CLEANED", error_code: "RUNTIME_CREATE_FAILED" }).map((step) => step.state), ["done", "done", "failed", "waiting"]);
});

test("a 409 for an active test hands back that test instead of throwing", () => {
  const active = { test_id: "t-1", release_id: "r-2", status: "RUNNING" };
  assert.equal(activeTestFromFailure({ response: { status: 409, data: { code: "DEPLOYMENT_TEST_ACTIVE", data: { active_test: active } } } }), active);
  assert.equal(activeTestFromFailure({ response: { status: 409, data: { code: "IDEMPOTENCY_KEY_CONFLICT", data: null } } }), null);
  assert.equal(activeTestFromFailure(new Error("timeout")), null);
});
