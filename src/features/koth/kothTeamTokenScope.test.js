import test from "node:test";
import assert from "node:assert/strict";
import apiClient from "../../api/client.js";
import { getKothTeamToken } from "../../api/koth.js";

test("KOTH token request identifies the selected challenge and retains request controls", async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const calls = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "local-contract-token" },
  });
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return { data: { code: "SUCCESS", data: null }, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const controller = new AbortController();
    await getKothTeamToken("challenge-a", { signal: controller.signal, timeout: 10000 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/koth/team_token");
    assert.deepEqual(calls[0].params, { koth_challenge_id: "challenge-a" });
    assert.equal(calls[0].signal, controller.signal);
    assert.equal(calls[0].timeout, 10000);
    assert.throws(() => getKothTeamToken(null), /challenge/i);
    assert.equal(calls.length, 1);
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
