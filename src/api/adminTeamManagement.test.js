import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { deleteAdminTeam, updateAdminTeam } from "./admin.js";

test("team update and delete preserve PATCH null and DELETE request body", async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { code: "SUCCESS" }, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    await updateAdminTeam("team-id", { leader_user_id: null, reason: "공석" });
    await deleteAdminTeam("team-id", "정리");
    assert.equal(requests[0].method, "patch");
    assert.deepEqual(JSON.parse(requests[0].data), { leader_user_id: null, reason: "공석" });
    assert.equal(requests[1].method, "delete");
    assert.equal(requests[1].url, "/admin/teams/team-id");
    assert.deepEqual(JSON.parse(requests[1].data), { reason: "정리" });
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
