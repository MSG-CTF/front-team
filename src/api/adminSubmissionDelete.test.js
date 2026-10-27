import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { deleteAdminChallengeSubmission } from "./admin.js";

test("DELETE encodes both IDs and sends trimmed reason as JSON config.data", async () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  const adapter = apiClient.defaults.adapter;
  let calls = 0;
  apiClient.defaults.adapter = async config => {
    calls++;
    assert.equal(config.method, "delete");
    assert.equal(config.url, "/admin/challenges/a%2Fb/submissions/c%3Fd");
    assert.deepEqual(JSON.parse(config.data), { reason: "확인" });
    return { status: 200, data: { code: "SUCCESS", data: { revoked: null } }, config };
  };
  try {
    await deleteAdminChallengeSubmission("a/b", "c?d", " 확인 ");
    for (const value of ["", " ", "x".repeat(501)]) assert.throws(() => deleteAdminChallengeSubmission("a", "b", value));
    assert.equal(calls, 1);
  } finally { apiClient.defaults.adapter = adapter; globalThis.localStorage = previous; }
});
