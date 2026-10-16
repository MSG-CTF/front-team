import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { getPublishedChallenges, previewPublishedChallenge, importPublishedChallenge } from "./admin.js";

test("publication requests preserve selection, cancellation and the retry key with a bounded download timeout", async () => {
  const adapter = apiClient.defaults.adapter;
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  const requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data: { code: "SUCCESS" }, status: 200, headers: {}, config };
  };
  try {
    const signal = new AbortController().signal;
    await getPublishedChallenges(4, { signal });
    await previewPublishedChallenge(11360925900, { signal });
    const body = { preview_token: "signed-preview", difficulty: "HARD" };
    await importPublishedChallenge(body, "same-key");
    await importPublishedChallenge(body, "same-key");
    assert.equal(requests[0].url, "/admin/published_challenges");
    assert.deepEqual(requests[0].params, { page: 4 });
    assert.equal(requests[0].signal, signal);
    assert.equal(requests[1].signal, signal);
    assert.equal(requests[1].url, "/admin/published_challenges/preview");
    assert.deepEqual(JSON.parse(requests[1].data), { artifact_id: 11360925900 });
    for (const request of requests.slice(2)) {
      assert.equal(request.url, "/admin/published_challenges/import");
      assert.equal(request.headers["Idempotency-Key"], "same-key");
      assert.deepEqual(JSON.parse(request.data), body);
    }
    for (const request of requests) assert.equal(request.timeout, 120000);
  } finally {
    apiClient.defaults.adapter = adapter;
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else delete globalThis.localStorage;
  }
});
