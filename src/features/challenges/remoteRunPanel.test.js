import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { mapChallengeDetail, mapRemoteRunConfig } from "./utils/challengeDetailMapper.js";
import {
  checkPayloadFile,
  checkPayloadMachine,
  mapRemoteRuns,
  readPeMachine,
} from "./utils/remoteRun.js";

let server;
let Screen;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-remote-run-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  Screen = (await server.ssrLoadModule("/src/features/challenges/components/ChallengeDetailScreen.jsx")).default;
});

after(async () => server?.close());

const REMOTE = { environment: "Windows 11 25H2 x64", accept: [".exe"], executable: "pe-amd64", max_file_bytes: 10485760, timeout_seconds: 180, max_attempts: 5, used_attempts: 1 };

function render({ remoteRun, solved = false, readOnly = false, runs } = {}) {
  return renderToStaticMarkup(createElement(Screen, {
    loading: false,
    challenge: mapChallengeDetail({ title: "msgdriver", category: "PWN", description: "설명", requires_instance: true, remote_run: REMOTE, is_solved: solved }),
    submission: { remainingSeconds: null, blocked: solved },
    instance: null,
    controls: { canCreate: true },
    flagValue: "",
    retrySeconds: 0,
    readOnly,
    remoteRun: remoteRun ?? { runs: runs ?? [], usedAttempts: 1, maxAttempts: 5, onSubmit: async () => true },
  }));
}

function pe(machine) {
  const bytes = new Uint8Array(0x100);
  const view = new DataView(bytes.buffer);
  bytes.set([0x4d, 0x5a]);
  view.setUint32(0x3c, 0x80, true);
  view.setUint32(0x80, 0x00004550, true);
  view.setUint16(0x84, machine, true);
  return new File([bytes], "payload.exe");
}

test("remote_run 이 있으면 인스턴스 대신 원격 실행을 쓰고 빈 값은 문제 파일 기본값으로 채운다", () => {
  const challenge = mapChallengeDetail({ title: "msgdriver", requires_instance: true, remote_run: REMOTE });
  assert.equal(challenge.requiresInstance, false);
  assert.deepEqual(challenge.remoteRun, { environment: "Windows 11 25H2 x64", accept: [".exe"], executable: "pe-amd64", maxBytes: 10485760, timeoutSeconds: 180, maxAttempts: 5, usedAttempts: 1 });
  assert.equal(mapChallengeDetail({ title: "웹" }).remoteRun, null);
  assert.deepEqual(mapRemoteRunConfig({ accept: ["exe", ".EXE"], max_file_bytes: -1 }), { environment: "", accept: [".exe"], executable: "", maxBytes: 10485760, timeoutSeconds: 180, maxAttempts: 5, usedAttempts: 0 });
});

test("실행 기록은 최신순으로 두고 모양이 어긋난 기록은 버린다", () => {
  const { runs, usedAttempts, maxAttempts } = mapRemoteRuns({
    runs: [
      { run_id: "a", status: "COMPLETED", created_at: "2026-10-24T01:00:00Z", stdout: "ok", exit_code: 0, payload_sha256: "AB".repeat(32) },
      { status: "COMPLETED" },
      { run_id: 7, status: "QUEUED", created_at: "2026-10-24T02:00:00Z", queue_position: 2 },
    ],
    used_attempts: 1,
    max_attempts: 5,
  });
  assert.deepEqual(runs.map((run) => run.id), ["7", "a"]);
  assert.equal(runs[0].queuePosition, 2);
  assert.equal(runs[1].sha256, "ab".repeat(32));
  assert.equal(usedAttempts, 1);
  assert.equal(maxAttempts, 5);
});

test("실행 파일은 확장자, 크기, x64 PE 머리를 브라우저에서 먼저 본다", async () => {
  const config = mapRemoteRunConfig(REMOTE);
  assert.match(checkPayloadFile(new File(["x"], "notes.txt"), config), /\.exe 파일만/);
  assert.match(checkPayloadFile(new File([], "empty.exe"), config), /빈 파일/);
  assert.match(checkPayloadFile({ name: "big.exe", size: 10485761 }, config), /10\.0 MB 이하/);
  assert.equal(checkPayloadFile(pe(0x8664), config), null);
  assert.equal(await readPeMachine(pe(0x8664)), "amd64");
  assert.equal(await readPeMachine(pe(0x014c)), "other");
  assert.equal(await readPeMachine(new File([new Uint8Array(0x100)], "zero.exe")), "not-pe");
  assert.match(await checkPayloadMachine(pe(0x014c), config), /AMD64/);
  assert.equal(await checkPayloadMachine(pe(0x014c), { ...config, executable: "" }), null);
});

test("원격 실행 문제는 인스턴스 판과 같은 짜임으로 그리고 제출 횟수는 보이지 않는다", () => {
  const html = render();
  assert.match(html, /id="challenge-remote-run"/);
  assert.match(html, /href="#challenge-remote-run">원격 실행</);
  assert.doesNotMatch(html, /id="challenge-instance"|인스턴스 생성/);
  assert.doesNotMatch(html, /남은 제출|\d+ ?\/ ?5/);
  // 상태 알약, 접속 칸, 안내, 시간 값, 막대는 인스턴스 판과 같은 클래스를 쓴다
  for (const name of ["statusSlot", "connect", "endpointRow", "endpointBox", "copyButton", "instanceHint", "ttlValue", "ttlTrack"])
    assert.match(html, new RegExp(`class="[^"]*_${name}_`), name);
  assert.match(html, /<input type="file" accept="\.exe"/);
  assert.match(html, /id="remote-run-hint"[^>]*>\.exe · 10 MB 이하 · Windows 11 25H2 x64에서 180초 안에 실행</);
  assert.match(html, /aria-label="실행 시간">--:--</);
  assert.match(html, /<button(?=[^>]*aria-label="원격 실행")(?=[^>]*disabled)[^>]*>RUN<\/button>/);
  assert.match(html, /<button(?=[^>]*aria-label="최근 실행 결과 보기")(?=[^>]*disabled)[^>]*>RESULT<\/button>/);
});

test("끝난 실행은 실행 시간과 최근 실행을 보이고 RESULT 로 결과 창을 연다 풀었거나 미리보기면 실행을 막는다", () => {
  const { runs } = mapRemoteRuns({ runs: [{ run_id: "r1", status: "TIMED_OUT", created_at: "2026-10-24T01:00:00Z", finished_at: "2026-10-24T01:03:00Z", duration_ms: 180000, stdout: "[*] start\n" }] });
  const done = render({ runs });
  assert.match(done, /aria-label="실행 시간">3:00</);
  assert.match(done, /data-tone="bad"/);
  assert.match(done, />1회차 · 시간 초과</);
  assert.match(done, /KST<\/time>/);
  assert.match(done, /<span class="[^"]*statusBadge[^"]*"[^>]*data-run="TIMED_OUT"[^>]*>.*시간 초과/);
  assert.match(done, /<button(?=[^>]*aria-label="최근 실행 결과 보기")(?![^>]*disabled)[^>]*>RESULT<\/button>/);
  assert.match(render({ solved: true, runs }), /이미 해결한 문제입니다/);
  const preview = render({ readOnly: true });
  assert.match(preview, /<input type="file"[^>]*disabled/);
  assert.match(preview, /미리보기에서는 실행할 수 없습니다/);
});

test("실행 결과 창은 원격 실행 판과 같은 어두운 판에 결과, 회차, 출력과 나무 단추를 둔다", async () => {
  const { default: Modal } = await server.ssrLoadModule("/src/features/challenges/components/RemoteRunResultModal.jsx");
  const [run] = mapRemoteRuns({ runs: [{ run_id: "r2", status: "TIMED_OUT", duration_ms: 180000, stdout: "[*] start\nC:\flag.txt\n", stderr: "error 5\n" }] }).runs;
  const html = renderToStaticMarkup(createElement(Modal, { run, number: 2, onClose() {} }));
  assert.match(html, /class="[^"]*_runResult_[^"]*"[^>]*data-status="TIMED_OUT"/);
  assert.match(html, /<h2 id="remote-run-result-title"[^>]*>시간 초과<\/h2>/);
  assert.match(html, /data-run="TIMED_OUT"><i aria-hidden="true"><\/i>2회차<\/span>/);
  assert.match(html, />180초<\/p>/);
  assert.match(html, /제한 시간 안에 끝나지 않아 멈췄습니다 멈추기 전까지의 출력입니다/);
  assert.match(html, /<pre[^>]*aria-label="실행 2 출력"[^>]*>\[\*\] start\nC:\flag\.txt/);
  assert.match(html, /<summary>오류 출력<\/summary>/);
  assert.match(html, /aria-label="출력 복사"[^>]*>COPY<\/button>/);
  assert.match(html, /aria-label="확인"[^>]*>OK<\/button>/);
  const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
  assert.match(css, /border-image: url\("\/assets\/challenge-detail\/panel-run-result\.png"\) 92 0 18 fill \/ calc\(100cqw \* 92 \/ 640\) 0 calc\(100cqw \* 18 \/ 640\) stretch;/);
});

test("원격 실행 칸은 데스크톱에서 인스턴스 판과 단추 줄 자리를 그대로 쓰고 휴대폰에서는 한글 제목을 보인다", () => {
  const css = readFileSync(new URL("./components/ChallengeDetailScene.module.css", import.meta.url), "utf8");
  assert.match(css, /\.runPanel \{\s*position: absolute;\s*left: calc\(var\(--u\) \* 1146\);\s*top: calc\(var\(--u\) \* 333\);\s*width: calc\(var\(--u\) \* 640\);\s*height: calc\(var\(--u\) \* 300\);/);
  assert.match(css, /\.runControls \{\s*position: absolute;\s*left: calc\(var\(--u\) \* 1146\);\s*top: calc\(var\(--u\) \* 653\);\s*width: calc\(var\(--u\) \* 640\);\s*height: calc\(var\(--u\) \* 62\);/);
  assert.match(css, /background: url\("\/assets\/challenge-detail\/panel-run-base\.png"\)/);
  // 단추 판은 양 끝 장식을 늘이지 않고 가운데만 늘인다
  assert.match(css, /border-image: url\("\/assets\/challenge-detail\/button-instance-extend-blank\.webp"\) 0 46 fill \/ 0 40px \/ 0 stretch;/);
  assert.match(css, /\.runRow \{\s*display: contents;\s*\}/);
  assert.match(css, /^\.runEn \{\s*display: none;\s*\}/m);
  assert.match(css, /\.instancePanel, \.runPanel \{ isolation: isolate;/);
  assert.doesNotMatch(css, /runAttempts|runConsole/);
});

test("원격 실행 미리보기는 개발 서버에서만 열리고 API 를 부르지 않는다", () => {
  const page = readFileSync(new URL("./preview/RemoteRunPreviewPage.jsx", import.meta.url), "utf8");
  assert.match(page, /<ChallengeDetailScreen/);
  assert.doesNotMatch(page, /from ["'].*\/api\//);
  const routes = readFileSync(new URL("../../routes/AppRoutes.jsx", import.meta.url), "utf8");
  assert.match(routes, /import.meta.env.DEV && <Route path="\/dev\/remote-run-preview"/);
});
