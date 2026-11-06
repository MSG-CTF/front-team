import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { getAdminTeams } from "./admin.js";

test("team scope defaults to official and sends snake_case queries for each scope", async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { code: "SUCCESS", data: { teams: [], total_count: 0 } }, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    await getAdminTeams();
    assert.equal(requests[0].params.team_scope, "official");
    const controller = new AbortController();
    for (const teamScope of ["official", "test", "archived", "all"]) {
      await getAdminTeams({ teamScope, search: "검색", sort: "name", page: 3, size: 100 }, { signal: controller.signal });
      const request = requests.at(-1);
      assert.equal(request.url, "/admin/teams");
      assert.equal(request.method, "get");
      assert.deepEqual(request.params, { team_scope: teamScope, search: "검색", sort: "name", page: 3, size: 100 });
      assert.equal(request.signal, controller.signal);
      assert.ok(!Object.hasOwn(request.params, "teamScope"));
    }
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
