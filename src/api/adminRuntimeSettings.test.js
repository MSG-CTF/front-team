import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { getChallengeReleases, getChallengeRuntimeSecrets, registerChallengeRuntimeSecret, registerChallengeRelease, activateChallengeRelease, deriveChallengeRelease } from "./admin.js";

test("admin runtime settings use the selected challenge and preserve cancellation and request fields", async () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { code: "SUCCESS" }, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const signal = new AbortController().signal;
    await getChallengeReleases("challenge-a", { signal });
    await getChallengeRuntimeSecrets("challenge-b", { signal });
    await registerChallengeRuntimeSecret("challenge-b", { name: "flag", value: "test-only" });
    const artifact = { schema_version: "2.1", workload: { containers: [{ secret_env: { FLAG: "flag" } }] } };
    await registerChallengeRelease("challenge-a", { artifact, note: "확인" });
    await activateChallengeRelease("challenge-a", "release-a");
    const settings = { containers: [{ name: "web", env: { APP_MODE: "ctf" }, secret_env: { FLAG: "flag" } }] };
    await deriveChallengeRelease("challenge-a", "release-a", settings);
    assert.equal(requests[0].url, "/admin/challenges/challenge-a/releases");
    assert.equal(requests[1].url, "/admin/challenges/challenge-b/runtime-secrets");
    assert.equal(requests[0].signal, signal);
    assert.equal(requests[1].signal, signal);
    assert.deepEqual(JSON.parse(requests[2].data), { name: "flag", value: "test-only" });
    assert.deepEqual(JSON.parse(requests[3].data), { artifact, note: "확인" });
    assert.deepEqual(JSON.parse(requests[4].data), {});
    assert.equal(requests[5].url, "/admin/challenges/challenge-a/releases/release-a/derive");
    assert.deepEqual(JSON.parse(requests[5].data), settings);
    for (const request of requests.slice(2)) assert.equal(request.timeout, 15000);
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
