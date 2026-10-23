import test from "node:test";
import assert from "node:assert/strict";
import { createTeamQrSession, getQrTeamId } from "./teamQrSession.js";

const ok = (data) => ({ data: { code: "SUCCESS", data } });
const token = (value, team_id = "A") => ok({ team_id, payment_token: value, expires_at: "2099-01-01T00:00:00Z" });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(options = {}) {
  const states = [];
  let changes = 0;
  const session = createTeamQrSession({ getProfile: async () => ok({ team_id: "A" }), issueQr: async () => token("fresh-A"),
    remainingSeconds: () => 300, updateState: (state) => states.push(state), onMembershipChange: () => { changes += 1; }, ...options });
  session.setTeam("A");
  return { session, states, changes: () => changes };
}

test("정상 QR은 발급 전후 팀을 확인하고 현재 팀에 묶어 표시한다", async () => {
  let profiles = 0;
  const f = fixture({ getProfile: async () => { profiles += 1; return ok({ team_id: "A" }); } });
  await f.session.request();
  assert.equal(profiles, 2);
  assert.equal(f.states.at(-1).teamId, "A");
  assert.equal(f.states.at(-1).paymentToken, "fresh-A");
  assert.equal(f.states.at(-1).status, "success");
});

test("화면이 이전 팀이면 QR을 발급하지 않고 소속을 다시 조회한다", async () => {
  let issued = 0;
  const f = fixture({ getProfile: async () => ok({ team_id: "B" }), issueQr: async () => { issued += 1; return token("wrong"); } });
  await f.session.request();
  assert.equal(issued, 0);
  assert.equal(f.changes(), 1);
  assert.equal(f.states.at(-1).paymentToken, "");
});

test("발급 도중 서버에서 팀이 바뀌면 정상 발급 응답도 표시하지 않는다", async () => {
  let team = "A";
  const f = fixture({ getProfile: async () => ok({ team_id: team }), issueQr: async () => { team = "B"; return token("old-A"); } });
  await f.session.request();
  assert.equal(f.changes(), 1);
  assert.equal(f.states.some((state) => state.status === "success"), false);
});

test("이전 팀의 늦은 응답과 finally가 새 팀의 발급을 덮거나 중복 요청을 열지 않는다", async () => {
  const a = deferred(), b = deferred(), enteredA = deferred(), enteredB = deferred();
  let team = "A", calls = 0, oldSignal;
  const f = fixture({ getProfile: async () => ok({ team_id: team }), issueQr: (config) => {
    calls += 1;
    if (calls === 1) { oldSignal = config.signal; enteredA.resolve(); return a.promise; }
    enteredB.resolve(); return b.promise;
  } });
  const old = f.session.request(); await enteredA.promise;
  f.session.setTeam(null); team = "B"; f.session.setTeam("B");
  assert.equal(oldSignal.aborted, true);
  const next = f.session.request(); await enteredB.promise;
  a.resolve(token("old-A")); await old;
  await f.session.request();
  assert.equal(calls, 2);
  b.resolve(token("fresh-B", "B")); await next;
  assert.equal(f.states.at(-1).teamId, "B");
  assert.equal(f.states.at(-1).paymentToken, "fresh-B");
});

test("팀 해제 후 같은 팀으로 재배정돼도 해제 전 응답은 폐기한다", async () => {
  const response = deferred(), entered = deferred();
  const f = fixture({ issueQr: () => { entered.resolve(); return response.promise; } });
  const request = f.session.request(); await entered.promise;
  f.session.setTeam(null); f.session.setTeam("A");
  response.resolve(token("previous-assignment")); await request;
  assert.equal(f.states.at(-1).status, "idle");
  assert.equal(f.states.at(-1).paymentToken, "");
});

test("팀 없음 응답은 QR을 지우고 소속 갱신을 요청한다", async () => {
  const f = fixture({ getProfile: async () => { throw { response: { data: { code: "USER_HAS_NO_TEAM" } } }; } });
  await f.session.request();
  assert.equal(f.changes(), 1);
  assert.equal(f.states.at(-1).status, "idle");
});

test("마지막 팀 확인이 실패하면 QR을 노출하지 않고 재시도할 수 있다", async () => {
  let calls = 0;
  const f = fixture({ getProfile: async () => { if (++calls === 2) throw new Error("조회 실패"); return ok({ team_id: "A" }); } });
  await f.session.request();
  assert.equal(f.states.at(-1).status, "error");
  assert.equal(f.states.at(-1).paymentToken, "");
  await f.session.request();
  assert.equal(f.states.at(-1).status, "success");
});

test("같은 팀 갱신과 중복 클릭은 진행 중 발급을 취소하거나 복제하지 않는다", async () => {
  const response = deferred(), entered = deferred(); let calls = 0;
  const f = fixture({ issueQr: () => { calls += 1; entered.resolve(); return response.promise; } });
  const first = f.session.request(); await entered.promise;
  f.session.setTeam("A"); await f.session.request();
  assert.equal(calls, 1);
  response.resolve(token("only-one")); await first;
  assert.equal(f.states.at(-1).paymentToken, "only-one");
});

test("화면 종료 후 늦은 응답은 상태를 갱신하지 않는다", async () => {
  const response = deferred(), entered = deferred();
  const f = fixture({ issueQr: () => { entered.resolve(); return response.promise; } });
  const request = f.session.request(); await entered.promise;
  f.session.dispose(); const count = f.states.length;
  response.resolve(token("late")); await request;
  assert.equal(f.states.length, count);
});

test("발급 전후 팀이 같아도 중간에 다른 팀에서 발급된 QR은 버린다", async () => {
  const f = fixture({ issueQr: async () => token("issued-for-B", "B") });
  await f.session.request();
  assert.equal(f.changes(), 1);
  assert.equal(f.states.some((state) => state.status === "success"), false);
});

for (const owner of [{}, { teamId: "A" }]) {
  test(`발급 팀을 snake_case로 확인할 수 없는 QR은 표시하지 않는다 ${JSON.stringify(owner)}`, async () => {
    const f = fixture({ issueQr: async () => ok({ ...owner, payment_token: "unknown-owner", expires_at: "2099-01-01T00:00:00Z" }) });
    await f.session.request();
    assert.equal(f.states.at(-1).status, "error");
    assert.equal(f.states.at(-1).paymentToken, "");
  });
}

test("팀 없음·밴·이전 값 경고 상태는 QR 발급 대상으로 쓰지 않는다", () => {
  const profile = { status: "success", data: { teamId: "A" } };
  assert.equal(getQrTeamId(profile), "A");
  for (const value of [{ ...profile, error: true }, { status: "noTeam", data: null }, { ...profile, data: { teamId: "A", isBanned: true } }]) {
    assert.equal(getQrTeamId(value), null);
  }
});
