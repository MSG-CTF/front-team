import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import * as admin from "./admin.js";

test("image preparation uses bounded authenticated Backend paths and an explicit stable key", async () => {
  assert.equal(typeof admin.getAdminImagePreparations, "function");
  assert.equal(typeof admin.createAdminImagePreparation, "function");
  assert.equal(typeof admin.getAdminImagePreparation, "function");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const adapter = apiClient.defaults.adapter;
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return { status: 200, data: { code: "SUCCESS", data: {} }, config };
  };
  try {
    const controller = new AbortController();
    await admin.getAdminImagePreparations("challenge/one", "release/two", 2, { signal: controller.signal });
    await admin.createAdminImagePreparation("challenge/one", "release/two", "same-key");
    await admin.createAdminImagePreparation("challenge/one", "release/two", "same-key");
    await admin.getAdminImagePreparation("challenge/one", "request/three");
    assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
      ["get", "/admin/challenges/challenge%2Fone/releases/release%2Ftwo/image_preparations"],
      ["post", "/admin/challenges/challenge%2Fone/releases/release%2Ftwo/image_preparations"],
      ["post", "/admin/challenges/challenge%2Fone/releases/release%2Ftwo/image_preparations"],
      ["get", "/admin/challenges/challenge%2Fone/image_preparations/request%2Fthree"],
    ]);
    assert.equal(calls[0].signal, controller.signal);
    assert.deepEqual(calls[0].params, { page: 2 });
    for (const call of calls) {
      assert.equal(call.baseURL, "/api/v1");
      assert.ok(call.timeout > 0 && call.timeout <= 15000);
    }
    for (const call of calls.slice(1, 3)) {
      assert.deepEqual(JSON.parse(call.data), {});
      assert.equal(call.headers.get("Idempotency-Key"), "same-key");
    }
    assert.throws(() => admin.createAdminImagePreparation("c", "r"), /Idempotency-Key/);
    assert.equal(calls.length, 4);
  } finally {
    apiClient.defaults.adapter = adapter;
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
