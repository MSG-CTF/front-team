import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import apiClient from "./client.js";
import { getAdminRemoteRuns, updateAdminRemoteRun } from "./admin.js";
import { remoteRunChanges, remoteRunDraft, remoteRunDraftChanged, remoteRunSummary } from "../features/admin/utils/adminRemoteRun.js";

const SAVED = { environment: "Windows 11 25H2 x64", accept: [".exe"], executable: "pe-amd64", max_file_bytes: 10485760, timeout_seconds: 180, rate_limit_seconds: 30, enabled: false };

test("원격 실행 설정은 크기와 시간, 요청 간격을 정수로 바꿔 보낸다", () => {
  assert.deepEqual(remoteRunSummary(SAVED), { environment: "Windows 11 25H2 x64", rules: ".exe (x64) · 10 MB 이하 · 180초 · 요청 간격 30초 · 총 횟수 제한 없음" });
  assert.equal(remoteRunSummary(null), null);
  const draft = remoteRunDraft(SAVED);
  assert.deepEqual(draft, { environment: "Windows 11 25H2 x64", accept: ".exe", amd64: true, maxMegabytes: "10", timeoutSeconds: "180", rateLimitSeconds: "30", enabled: false });
  assert.equal(remoteRunDraftChanged(draft, SAVED), false);
  const next = { ...draft, timeoutSeconds: "120", rateLimitSeconds: "45" };
  assert.equal(remoteRunDraftChanged(next, SAVED), true);
  assert.deepEqual(remoteRunChanges(next), {
    error: "",
    payload: { environment: "Windows 11 25H2 x64", accept: [".exe"], executable: "pe-amd64", max_file_bytes: 10485760, timeout_seconds: 120, rate_limit_seconds: 45, enabled: false },
  });
});

test("원격 실행 설정은 틀린 칸을 한 줄로 알리고 저장 값을 만들지 않는다", () => {
  const draft = remoteRunDraft(SAVED);
  assert.match(remoteRunChanges({ ...draft, environment: " " }).error, /실행 환경/);
  assert.match(remoteRunChanges({ ...draft, accept: "exe" }).error, /x64 PE/);
  assert.match(remoteRunChanges({ ...draft, maxMegabytes: "0" }).error, /1바이트에서 10 MB/);
  assert.match(remoteRunChanges({ ...draft, timeoutSeconds: "5" }).error, /10에서 180초/);
  assert.match(remoteRunChanges({ ...draft, rateLimitSeconds: "2.5" }).error, /1에서 3600초/);
  assert.equal(remoteRunChanges({ ...draft, rateLimitSeconds: "3601" }).payload, null);
});

test("원격 실행 기록과 설정은 관리자 경로로 부르고 결과 필터와 쪽수를 넘긴다", async () => {
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
    await getAdminRemoteRuns("challenge-a", { status: "TIMED_OUT", page: 2, size: 20 }, { signal });
    await updateAdminRemoteRun("challenge-a", { environment: "Windows 11 25H2 x64", rate_limit_seconds: 30 });
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ["get", "/admin/challenges/challenge-a/remote_runs"],
      ["patch", "/admin/challenges/challenge-a/remote_run"],
    ]);
    assert.deepEqual(requests[0].params, { status: "TIMED_OUT", page: 2, size: 20 });
    assert.equal(requests[0].signal, signal);
    assert.deepEqual(JSON.parse(requests[1].data), { environment: "Windows 11 25H2 x64", rate_limit_seconds: 30 });
    assert.equal(requests[1].timeout, 15000);
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});

test("관리 창은 원격 실행 문제에만 원격 실행 탭을 두고, 목록과 배포 설정은 원격 실행으로 알린다", () => {
  const dialog = readFileSync(new URL("../features/admin/components/AdminChallengeManageDialog.jsx", import.meta.url), "utf8");
  assert.match(dialog, /const remote = Boolean\(challenge\.remote_run\);/);
  assert.match(dialog, /\.\.\.\(remote \? \[\{ id: "remote", label: "원격 실행" \}\] : \[\]\)/);
  const list = readFileSync(new URL("../features/admin/pages/AdminChallengesPage.jsx", import.meta.url), "utf8");
  assert.match(list, /<DeploymentSummary deployment=\{challenge\.deployment\} remoteRun=\{challenge\.remote_run\}\/>/);
  assert.match(list, /data-state="remote"><i aria-hidden="true" \/>원격 실행<\/span>/);
  const runtime = readFileSync(new URL("../features/admin/components/AdminChallengeRuntimeDialog.jsx", import.meta.url), "utf8");
  assert.match(runtime, /\{!challenge\.remote_run && <button type="button" className=\{styles\.primary\} onClick=\{\(\) => setPanel\("image"\)\}>이미지 등록<\/button>\}/);
  const preview = readFileSync(new URL("../features/admin/pages/AdminChallengePreviewPage.jsx", import.meta.url), "utf8");
  assert.match(preview, /정답 제출, 인스턴스, 원격 실행은 비활성화됩니다/);
  const css = readFileSync(new URL("../features/admin/components/AdminWorkspace.module.css", import.meta.url), "utf8");
  assert.match(css, /\.deployPill\[data-state="remote"\] \{ background: var\(--blue-tint\); color: var\(--blue-text\); \}/);
});
