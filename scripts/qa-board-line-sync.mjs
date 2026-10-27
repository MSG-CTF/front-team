// Frontend-only Chrome CDP QA. No backend server, credentials, or live mutations.
// CDP_PORT=9342 FRONTEND_PORT=5180 node scripts/qa-board-line-sync.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { PREVIEW_BOARD_CELLS } from "../src/features/board/preview/lineRailPreviewData.js";

const output = process.env.QA_OUTPUT || "/private/tmp/msgctf-line-frontend-1027";
mkdirSync(output, { recursive: true });
const tab = await (await fetch(`http://127.0.0.1:${process.env.CDP_PORT || 9342}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let serial = 0;
let mode = "pending";
let reads = 0;
let blockedWrites = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++serial, { resolve, reject });
  socket.send(JSON.stringify({ id: serial, method, params }));
});
const evaluate = async expression => {
  const reply = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (reply.result.exceptionDetails) throw Error(reply.result.exceptionDetails.text);
  return reply.result.result.value;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const wait = async expression => {
  for (let index = 0; index < 150; index++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw Error(`UI timeout: ${expression}`);
};
const response = data => ({ code: "SUCCESS", message: "Frontend mock only", data });
socket.addEventListener("message", async event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request?.reject(Error(message.error.message));
    else request?.resolve(message);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method !== "Fetch.requestPaused") return;
  const request = message.params;
  const path = new URL(request.request.url).pathname;
  if (request.request.method !== "GET") {
    blockedWrites++;
    await send("Fetch.failRequest", { requestId: request.requestId, errorReason: "BlockedByClient" });
    return;
  }
  let status = 200;
  let body = response([]);
  const awards = [
    { line_number: 1, earned_score: 0, is_category_bonus: false },
    { line_number: 2, earned_score: mode === "adjusted" ? 135.5 : 123.45, is_category_bonus: true },
    { line_number: 6, earned_score: 225, is_category_bonus: false },
  ];
  if (path === "/api/v1/auth/me") body = response({ user_id: "qa-user", team_id: "qa-team", nickname: "QA", role: "PARTICIPANT", is_leader: true });
  if (path === "/api/v1/timer") body = response({ status: "RUNNING", start_time: "2026-01-01T00:00:00Z", end_time: "2027-01-01T00:00:00Z", server_time: new Date().toISOString() });
  if (path === "/api/v1/board") body = response({ total_cell_count: 36, cells: PREVIEW_BOARD_CELLS.map(cell => ({ cell_index: cell.cellIndex, type: cell.type, line_number: cell.lineNumber, name: `칸 ${cell.cellIndex}` })) });
  if (path === "/api/v1/board/me") {
    reads++;
    body = response({ position: 1, type: "START", dice_rolls_left: 0, max_dice_rolls: 3, pending_chance_choice: null, chance_cards: [], active_challenge: null,
      cell_states: PREVIEW_BOARD_CELLS.filter(cell => [1, 2, 3, 6].includes(cell.lineNumber)).map(cell => ({ cell_index: cell.cellIndex, status: "CLEARED" })),
      line_monopolies: mode === "pending" ? [] : mode === "removed" ? awards.slice(1) : awards,
    });
    if (mode === "legacy") delete body.data.line_monopolies;
    if (mode === "error") { status = 503; body = { code: "UNAVAILABLE", data: null }; }
  }
  if (path === "/api/v1/board/dice/status") body = response({ can_roll: false, blocked_reason: "NO_ROLL_LEFT", dice_rolls_left: 0, max_dice_rolls: 3, server_time: new Date().toISOString(), pending_confirm_request_key: null, unconfirmed_roll_request_key: null });
  if (path === "/api/v1/board/cell/current") body = response({ cell_index: 1, type: "START", challenge_candidates: [] });
  if (path === "/api/v1/board/chance/catalog") body = response({ cards: [] });
  if (path === "/api/v1/board/opened_challenges") body = response({ opened_challenges: [], total_count: 0, solved_count: 0 });
  await send("Fetch.fulfillRequest", { requestId: request.requestId, responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
});

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.setItem('msgctf_access_token','frontend-mock-not-a-real-token');localStorage.removeItem('msgctf_refresh_token');" });
  const take = async name => {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${output}/${name}.png`, Buffer.from(shot.result.data, "base64"));
  };
  const railCount = count => `document.querySelectorAll('[data-line-accent]').length === ${count}`;
  const refresh = async next => {
    mode = next;
    const previous = reads;
    await evaluate("window.dispatchEvent(new Event('focus'))");
    for (let i = 0; i < 100 && reads === previous; i++) await sleep(100);
    if (reads === previous) throw Error("Focus refresh did not request board/me");
  };
  const openLines = async () => {
    await evaluate(`document.querySelector('[data-line-accent="line-2"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await wait("!!document.querySelector('[data-line-earned-score=\"line-2\"]')");
  };
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    mode = "pending";
    await send("Emulation.setDeviceMetricsOverride", { width, height, mobile: width < 600, deviceScaleFactor: 1 });
    await send("Page.navigate", { url: `http://127.0.0.1:${process.env.FRONTEND_PORT || 5180}/board` });
    await send("Page.bringToFront");
    await wait("document.querySelectorAll('[data-line-id]').length === 6");
    await wait(railCount(0));
    await take(`before-${width}`);
    await refresh("paid");
    await wait(railCount(3));
    await take(`after-${width}`);
    await openLines();
    await wait(`document.querySelector('[data-line-earned-score="line-2"]').textContent.includes('123.45')`);
    if (!(await evaluate(`document.querySelector('[data-line-earned-score="line-1"]').textContent.includes('0 pts')`))) throw Error("Zero award missing");
    if (!(await evaluate(`document.querySelector('[data-line-row="line-3"]').textContent.includes('지급 미확인')`))) throw Error("Unconfirmed 5/5 missing");
    await take(`panel-${width}`);
    await refresh("adjusted");
    await wait(`document.querySelector('[data-line-earned-score="line-2"]').textContent.includes('135.5')`);
    await refresh("removed");
    await wait(railCount(2));
    await wait(`!document.querySelector('[data-line-earned-score="line-1"]')`);
    await refresh("error");
    await wait(railCount(0));
    await refresh("legacy");
    await wait(railCount(0));
    await refresh("paid");
    await wait(railCount(3));
    const prior = reads;
    await send("Page.reload");
    for (let i = 0; i < 150 && reads <= prior; i++) await sleep(100);
    await wait(`document.querySelectorAll('[data-line-id]').length === 6 && ${railCount(3)}`);
    if (reads <= prior) throw Error("Reload did not read board/me");
    // 실제 15초 타이머가 다음 GET을 발생시키는지 확인한다.
    const periodicBefore = reads;
    for (let i = 0; i < 180 && reads === periodicBefore; i++) await sleep(100);
    if (reads === periodicBefore) throw Error("15-second refresh missing");
    await send("Page.navigate", { url: `http://127.0.0.1:${process.env.FRONTEND_PORT || 5180}/mypage` });
    await sleep(200);
    const reentryBefore = reads;
    await send("Page.navigate", { url: `http://127.0.0.1:${process.env.FRONTEND_PORT || 5180}/board` });
    for (let i = 0; i < 150 && reads <= reentryBefore; i++) await sleep(100);
    if (reads <= reentryBefore) throw Error("Board reentry did not read board/me");
    await wait(railCount(3));
    if (await evaluate("!!document.querySelector('[data-line-outline]')")) throw Error("PR #205 inner border regression");
    console.log(JSON.stringify({ width, pending: true, paid: true, zero: true, fractional: true, multiple: true, adjusted: true, removed: true, error: true, legacy: true, reload: true, reentry: true, focus: true, periodic: true, outerRailsOnly: true }));
  }
  if (errors.length || blockedWrites) throw Error(JSON.stringify({ errors, blockedWrites }));
  console.log(JSON.stringify({ reads, runtimeErrors: errors, backendRequests: 0, mutationRequests: 0, output }));
} finally {
  // Close the isolated target: a detached Fetch listener must not leave later polling unmocked.
  await send("Page.close").catch(() => {});
  socket.close();
}
