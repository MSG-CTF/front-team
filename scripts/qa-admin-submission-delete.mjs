// Isolated real React mount in Chrome. All /api/v1 traffic is intercepted;
// DELETE is fulfilled locally and never reaches a backend.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const output = process.env.QA_OUTPUT || "/private/tmp/msgctf-admin-delete-1027";
mkdirSync(output, { recursive: true });
const base = `http://127.0.0.1:${process.env.FRONTEND_PORT || 5181}`;
const tab = await (await fetch(`http://127.0.0.1:${process.env.CDP_PORT || 9343}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0, deletes = 0, reads = 0, otherReads = 0;
let result = "INCORRECT", failure = 0, refreshFailure = false, delay = false, total = 1;
let revoked = null;
const pending = new Map(), errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++sequence, { resolve, reject }); socket.send(JSON.stringify({ id: sequence, method, params }));
});
const intercept = (method, params) => send(method, params).catch(error => {
  // useAdminResource deliberately aborts superseded reads.
  if (!error.message.includes("Invalid InterceptionId")) throw error;
});
const evaluate = async expression => {
  const { result: reply } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (reply.exceptionDetails) throw Error(JSON.stringify(reply.exceptionDetails));
  return reply.result.value;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const wait = async expression => {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(50); }
  throw Error(`Timeout: ${expression}; ${JSON.stringify({errors,reads})}; ${await evaluate("document.body.innerText.slice(0,1200)")}`);
};
const row = () => ({ submission_id: "submission-1", team_name: "mock-team", user: { nickname: "검증 참가자" }, result, created_at: "2026-10-27T00:00:00Z", flag_hash: "abcdef123456" });
const envelope = data => ({ code: "SUCCESS", data });
socket.addEventListener("message", async event => {
  const message = JSON.parse(event.data);
  if (message.id) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item?.reject(Error(message.error.message)); else item?.resolve(message); return; }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method !== "Fetch.requestPaused") return;
  const { requestId, request } = message.params;
  let status = 200, body = envelope([]);
  const path = new URL(request.url).pathname;
  if (path === "/src/main.jsx") {
    await intercept("Fetch.fulfillRequest", { requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/javascript" }], body: Buffer.from("// isolated React QA host").toString("base64") });
    return;
  }
  if (request.method === "DELETE") {
    assert.match(path, /^\/api\/v1\/admin\/challenges\/mock-challenge\/submissions\/submission-1$/);
    assert.equal(JSON.parse(request.postData).reason, "확인 사유");
    deletes++;
    if (delay) await sleep(400);
    if (failure === -1) { await intercept("Fetch.failRequest", { requestId, errorReason: "TimedOut" }); return; }
    if (failure) { status = failure; body = { code: failure === 404 ? "SUBMISSION_NOT_FOUND" : "INVALID_REQUEST", message: "mock error" }; }
    else { body = envelope({ submission_id: "submission-1", result, revoked }); total--; }
  } else if (request.method !== "GET") {
    await intercept("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); return;
  } else if (path.endsWith("/submissions")) {
    reads++;
    if (refreshFailure) { status = 503; body = { code: "UNAVAILABLE" }; }
    else body = envelope({ submissions: total > (Number(new URL(request.url).searchParams.get("page") || 1) - 1) * 20 ? [row()] : [], total_count: Math.max(0, total), summary: { total: Math.max(0, total), incorrect: 1, locked: 0, teams: 1, correct: 0 } });
  } else if (path.endsWith("/teams")) { otherReads++; body = envelope({ teams: [], total_count: 0 }); }
  else if (path.endsWith("/auth/me")) body = envelope({ role: "ADMIN", nickname: "Frontend Mock", user_id: "mock-admin" });
  await intercept("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
});
const click = text => evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
const reason = value => evaluate(`(() => {const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const take = async name => { const shot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${output}/${name}.png`, Buffer.from(shot.result.data, "base64")); };
try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }, { urlPattern: "*/src/main.jsx*" }] });
  await send("Page.navigate", { url: `${base}/` });
  await wait("!!document.getElementById('root')");
  const entry = await (await fetch(`${base}/src/main.jsx`)).text();
  const reactPath = entry.match(/from "([^"\n]*\/react\.js[^"\n]*)"/)[1];
  const domPath = entry.match(/from "([^"\n]*\/react-dom_client\.js[^"\n]*)"/)[1];
  // Unmount normal router first, then mount the actual production panel/dialog.
  await evaluate(`(async()=>{
    const {default:React}=await import(${JSON.stringify(reactPath)});
    const {default:DOM}=await import(${JSON.stringify(domPath)});
    await import('/src/index.css');
    const {default:Panel}=await import('/src/features/admin/components/AdminChallengeSubmissionsPanel.jsx');
    const {default:useResource}=await import('/src/features/admin/hooks/useAdminResource.js');
    const {default:api}=await import('/src/api/client.js');
    const {default:styles}=await import('/src/features/admin/components/AdminWorkspace.module.css');
    document.getElementById('root').remove();const host=document.createElement('div');document.body.append(host);
    host.className=styles.workspace;host.style.padding='16px';
    window.qaRoot=DOM.createRoot(host);window.qaKey=0;
    function OtherResource(){useResource(config=>api.get('/admin/teams',config),[],'조회 실패');return null;}
    window.qaMount=async()=>{window.qaRoot.render(React.createElement(React.Fragment,null,
      React.createElement(OtherResource,{key:'other'+window.qaKey}),
      React.createElement(Panel,{key:++window.qaKey,challengeId:'mock-challenge',challengeTitle:'프론트엔드 모킹 문제'})));
      await new Promise(resolve=>setTimeout(resolve,100));};
    await window.qaMount();
  })()`);
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    total = 1; result = "CORRECT"; failure = 0; refreshFailure = false;
    await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='삭제')");
    await click("삭제");
    for (const value of ["", "   ", "x".repeat(501)]) {
      await reason(value);
      assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='정답 회수 경고 확인').disabled"), true);
    }
    await reason(" 확인 사유 "); await click("정답 회수 경고 확인");
    await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='정답 회수 확정')");
    await take(`warning-${width}`);
    assert.ok(await evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"));
    const before = deletes; await click("취소"); assert.equal(deletes, before);
    await click("삭제"); await reason(" 확인 사유 "); await click("정답 회수 경고 확인");
    revoked = { score: 0, mileage: 0, line_monopoly: { line_number: 1, earned_score: 123.45 } }; delay = true;
    const priorReads = reads, priorOther = otherReads;
    await evaluate("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='정답 회수 확정');b.click();b.click()})()");
    await wait("document.body.textContent.includes('회수 점수: 0점')");
    for (let i=0; i<100 && (reads<=priorReads || otherReads<=priorOther); i++) await sleep(50);
    assert.equal(deletes, before + 1); assert.ok(reads > priorReads); assert.ok(otherReads > priorOther);
    assert.ok(await evaluate("document.body.textContent.includes('123.45점') && document.body.textContent.includes('회수 마일리지: 0')"));
    await take(`success-${width}`); delay = false;
    console.log(JSON.stringify({ width, correctWarning: true, cancelNoRequest: true, validation: true, duplicateBlocked: true, zero: true, fractionalLine: true, summaryRefresh: true, adminResourceRefresh: true }));
  }
  total = 21; result = "INCORRECT"; revoked = null; failure = 0;
  await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='다음'&&!b.disabled)");
  await click("다음"); await wait("document.querySelector('[aria-label=\"목록 페이지\"]').textContent.includes('2 / 2')");
  await click("삭제"); await reason("확인 사유"); await click("삭제 확정");
  await wait("document.querySelector('[aria-label=\"목록 페이지\"]').textContent.includes('1 / 1')");
  // ESC closes the existing accessible dialog without a mutation.
  await click("삭제"); const beforeEscape = deletes;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await wait("!document.querySelector('[role=dialog]')"); assert.equal(deletes, beforeEscape);
  for (const outcome of ["INCORRECT", "TOO_MANY_ATTEMPTS", "CORRECT"]) {
    total = 1; result = outcome; revoked = outcome === "CORRECT" ? { score: 450, mileage: 30, line_monopoly: null } : null;
    await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='삭제')");
    await click("삭제"); await reason("확인 사유");
    if (outcome === "CORRECT") await click("정답 회수 경고 확인");
    await click(outcome === "CORRECT" ? "정답 회수 확정" : "삭제 확정");
    await wait("document.body.textContent.includes('완료되었습니다.') || document.body.textContent.includes('삭제되었습니다.')");
    assert.equal(await evaluate("document.body.textContent.includes('취소된 라인 독점')"), false);
  }
  for (const status of [400, 404, 401, 403, -1]) {
    total = 1; result = "INCORRECT"; failure = status;
    await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='삭제')");
    await click("삭제"); await reason("확인 사유"); await click("삭제 확정");
    await wait("!!document.querySelector('[role=alert]')");
    const expected = ({400:"사유",404:"존재하지 않는",401:"로그인",403:"권한","-1":"상태를 확인"})[status];
    assert.ok((await evaluate("document.querySelector('[role=alert]').textContent")).includes(expected));
    await click("취소");
  }
  failure = 0; total = 1; result = "INCORRECT";
  await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='삭제')");
  await click("삭제"); await reason("확인 사유"); refreshFailure = true; const count = deletes;
  await click("삭제 확정"); await wait("document.body.textContent.includes('삭제는 완료됐지만')");
  assert.equal(deletes, count + 1);
  // Navigation/unmount while DELETE is pending must not publish its notice into
  // the next mounted panel or issue a second DELETE.
  refreshFailure = false; total = 1; delay = true;
  await evaluate("window.qaMount()"); await wait("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='삭제')");
  await click("삭제"); await reason("확인 사유"); const beforeNavigation = deletes;
  await click("삭제 확정");
  for (let i=0; i<100 && deletes===beforeNavigation; i++) await sleep(20);
  await evaluate("window.qaMount()"); await sleep(600);
  assert.equal(deletes, beforeNavigation + 1);
  assert.equal(await evaluate("document.body.textContent.includes('삭제되었습니다.')"), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ordinary: true, locked: true, lineNull: true, lastPageCorrection: true, escape: true, pendingUnmount: true, errors: [400,404,401,403,"network"], refreshFailureNotDeletionFailure: true, deletes, reads, backendRequests: 0, runtimeErrors: errors, output }));
} finally { await send("Page.close").catch(()=>{}); socket.close(); }
