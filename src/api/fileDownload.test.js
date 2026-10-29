import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CanceledError } from "axios";
import apiClient from "./client.js";
import { downloadAdminKothFiles } from "./admin.js";
import { downloadFile, FILE_DOWNLOAD_IDLE_TIMEOUT_MS } from "./fileDownload.js";

const originalAdapter = apiClient.defaults.adapter;
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "qa-access" },
  });
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
  else delete globalThis.localStorage;
});

async function pending(options) {
  let config;
  let complete;
  apiClient.defaults.adapter = (request) => new Promise((resolve, reject) => {
    config = request;
    request.signal.addEventListener("abort", () => reject(new CanceledError("cancelled", request)), { once: true });
    complete = () => resolve({ data: new Blob(["ZIP"]), status: 200, statusText: "OK", headers: {}, config: request });
  });
  const promise = downloadFile("/challenges/owned/files/owned/download", options);
  await new Promise((resolve) => setImmediate(resolve));
  return { config, promise, complete };
}

test("데이터가 계속 들어오면 60초를 넘어도 파일을 끝까지 받는다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const progress = [];
  const request = await pending({ onDownloadProgress: (event) => progress.push(event.loaded) });
  t.mock.timers.tick(60000);
  request.config.onDownloadProgress({ loaded: 1024 });
  t.mock.timers.tick(60000);
  request.config.onDownloadProgress({ loaded: 2048 });
  t.mock.timers.tick(60000);
  assert.equal(request.config.signal.aborted, false);
  request.complete();
  assert.equal((await request.promise).status, 200);
  assert.deepEqual(progress, [1024, 2048]);
});

test("전송이 90초 동안 멈추면 대기 요청을 취소하고 재시도 가능한 오류를 돌려준다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const request = await pending();
  const rejected = assert.rejects(request.promise, (error) => error.code === "DOWNLOAD_STALLED");
  t.mock.timers.tick(FILE_DOWNLOAD_IDLE_TIMEOUT_MS);
  await rejected;
  assert.equal(request.config.signal.aborted, true);
});

test("인증 갱신으로 전송 바이트가 처음부터 다시 올라가도 계속 받는다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const request = await pending();
  request.config.onDownloadProgress({ loaded: 50000 });
  t.mock.timers.tick(60000);
  request.config.onDownloadProgress({ loaded: 128 });
  t.mock.timers.tick(60000);
  request.config.onDownloadProgress({ loaded: 256 });
  t.mock.timers.tick(60000);
  assert.equal(request.config.signal.aborted, false);
  request.complete();
  assert.equal((await request.promise).status, 200);
});

test("관리자가 고른 KOTH 발행본을 파일 요청에도 전달하고 임의 주소로 바꾸지 않는다", async () => {
  let config;
  apiClient.defaults.adapter = async (request) => {
    config = request;
    return { data: new Blob(["ZIP"]), status: 200, statusText: "OK", headers: {}, config: request };
  };
  await downloadAdminKothFiles("owned", {
    params: { publication_id: "selected-publication" },
    url: "https://outside.invalid", baseURL: "https://outside.invalid", timeout: 1,
  });
  assert.equal(config.url, "/admin/koth/challenges/owned/files/download");
  assert.equal(config.baseURL, "/api/v1");
  assert.deepEqual(config.params, { publication_id: "selected-publication" });
  assert.equal(config.timeout, 0);
  assert.equal(config.headers.Authorization, "Bearer qa-access");
});

test("바이트 증가가 없는 알림만으로 멈춘 다운로드의 대기를 연장할 수 없다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const request = await pending();
  const rejected = assert.rejects(request.promise, (error) => error.code === "DOWNLOAD_STALLED");
  request.config.onDownloadProgress({ loaded: 1024 });
  t.mock.timers.tick(60000);
  request.config.onDownloadProgress({ loaded: 1024 });
  t.mock.timers.tick(30000);
  await rejected;
});

test("사용자 취소는 즉시 전달하며 시간 초과 오류로 바꾸지 않는다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = new AbortController();
  const request = await pending({ signal: controller.signal });
  const rejected = assert.rejects(request.promise, (error) => error.code === "ERR_CANCELED");
  controller.abort();
  await rejected;
  t.mock.timers.tick(FILE_DOWNLOAD_IDLE_TIMEOUT_MS * 2);
  assert.equal(request.config.signal.aborted, true);
});

test("완료 뒤 늦게 도착한 알림은 진행 상태나 취소 타이머를 다시 만들지 않는다", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const request = await pending({ onDownloadProgress: () => calls++ });
  request.complete();
  await request.promise;
  request.config.onDownloadProgress({ loaded: 999 });
  t.mock.timers.tick(FILE_DOWNLOAD_IDLE_TIMEOUT_MS * 2);
  assert.equal(calls, 0);
  assert.equal(request.config.signal.aborted, false);
});

test("이미 취소된 요청은 전송을 시작하지 않는다", async () => {
  let calls = 0;
  apiClient.defaults.adapter = async () => { calls++; };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(downloadFile("/owned/download", { signal: controller.signal }), (error) => error.code === "ERR_CANCELED");
  assert.equal(calls, 0);
});
