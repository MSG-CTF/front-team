import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import apiClient from "./client.js";
import { challengeFilePath, downloadChallengeFile } from "./challenges.js";
import { readBlobError } from "./errorPayload.js";

const challengeId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const originalAdapter = apiClient.defaults.adapter;
const descriptors = Object.fromEntries(
  ["localStorage", "window"].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
let storage;
let redirects;
beforeEach(() => {
  storage = new Map([
    ["msgctf_access_token", "old-access"],
    ["msgctf_refresh_token", "local-refresh"],
  ]);
  redirects = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        pathname: "/challenges/test",
        assign: (path) => redirects.push(path),
      },
    },
  });
});
after(() => {
  apiClient.defaults.adapter = originalAdapter;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
function response(config, data, status = 200) {
  return { config, data, status, statusText: "test", headers: {} };
}
function reject(config, data, status) {
  throw new AxiosError(
    "local error",
    "ERR_BAD_REQUEST",
    config,
    null,
    response(config, data, status),
  );
}
function errorBlob(code) {
  return new Blob([JSON.stringify({ code, message: "검증용" })], {
    type: "application/json",
  });
}

test("파일은 고정된 API 경로에 Bearer와 취소 신호를 붙여 Blob으로 요청한다", async () => {
  let request;
  apiClient.defaults.adapter = async (config) => {
    request = config;
    return response(config, new Blob(["ZIP"], { type: "application/zip" }));
  };
  const controller = new AbortController();
  await downloadChallengeFile(challengeId, fileId, {
    signal: controller.signal,
    url: "https://outside.invalid",
    baseURL: "https://outside.invalid",
  });
  assert.equal(request.url, challengeFilePath(challengeId, fileId));
  assert.equal(request.baseURL, "/api/v1");
  assert.equal(request.headers.Authorization, "Bearer old-access");
  assert.equal(request.responseType, "blob");
  assert.equal(request.signal, controller.signal);
  assert.equal(request.timeout, 60000);
  for (const invalid of [
    "../other",
    "https://outside.invalid",
    "",
    undefined,
    [challengeId],
  ]) {
    assert.throws(() => challengeFilePath(invalid, fileId));
    assert.throws(() => challengeFilePath(challengeId, invalid));
  }
});

test("Blob으로 받은 토큰 만료도 한 번 갱신하고 파일 요청만 재시도한다", async () => {
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push({
      url: config.url,
      auth: config.headers.Authorization,
      type: config.responseType,
    });
    if (config.url === "/auth/refresh")
      return response(config, {
        code: "SUCCESS",
        data: { access_token: "new-access" },
      });
    if (config.headers.Authorization === "Bearer old-access")
      reject(config, errorBlob("TOKEN_EXPIRED"), 401);
    return response(config, new Blob(["ZIP"], { type: "application/zip" }));
  };
  const result = await downloadChallengeFile(challengeId, fileId);
  assert.equal(result.data.type, "application/zip");
  assert.equal(calls.length, 3);
  assert.equal(calls[1].url, "/auth/refresh");
  assert.equal(calls[1].auth, undefined);
  assert.equal(calls[2].auth, "Bearer new-access");
  assert.equal(calls[2].type, "blob");
  assert.deepEqual(redirects, []);
});

test("권한 없음과 파일 없음은 JSON 오류로 읽고 재요청하거나 로그인 정보를 지우지 않는다", async () => {
  for (const [status, code] of [
    [403, "CHALLENGE_LOCKED"],
    [404, "CHALLENGE_FILE_NOT_FOUND"],
  ]) {
    let calls = 0;
    apiClient.defaults.adapter = async (config) => {
      calls++;
      reject(config, errorBlob(code), status);
    };
    await assert.rejects(
      downloadChallengeFile(challengeId, fileId),
      (error) => error.response.data.code === code,
    );
    assert.equal(calls, 1);
    assert.equal(storage.get("msgctf_access_token"), "old-access");
  }
});

test("다운로드 중 인증 갱신이 실패하면 반복하지 않고 로그인으로 보낸다", async () => {
  let calls = 0;
  apiClient.defaults.adapter = async (config) => {
    calls++;
    if (config.url === "/auth/refresh")
      reject(config, { code: "TOKEN_INVALID" }, 401);
    reject(config, errorBlob("TOKEN_EXPIRED"), 401);
  };
  await assert.rejects(downloadChallengeFile(challengeId, fileId));
  assert.equal(calls, 2);
  assert.equal(storage.has("msgctf_access_token"), false);
  assert.ok(redirects.includes("/login"));
});

test("큰 오류 본문, HTML과 잘못된 JSON은 임의로 파싱하지 않는다", async () => {
  for (const blob of [
    new Blob(["<html>error</html>"], { type: "text/html" }),
    new Blob(["{"], { type: "application/json" }),
    new Blob([" ".repeat(70000)], { type: "application/json" }),
  ]) {
    const result = { data: blob };
    await readBlobError(result);
    assert.equal(result.data, blob);
  }
});
