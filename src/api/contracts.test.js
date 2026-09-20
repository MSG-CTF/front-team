import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import apiClient from "./client.js";
import { getChallengeDetail, submitFlag } from "./challenges.js";
import { createInstance, extendInstance, getMyInstances, resetInstance, stopInstance } from "./instances.js";
import { getLeaderboard, getRankings, getMyMemberRanking } from "./leaderboard.js";
import { getMyProfile, getMyMileageHistory, getMySolves, issueMyQrToken } from "./mypage.js";
import { getKothClub, getKothClubs, getKothLeaderboard, getKothTeamToken, getMyKothProgress } from "./koth.js";
import { getSignatures, getSignature, submitSignatureFlag } from "./signatures.js";
import { adjustMileage, checkoutPayment, createAdminSignature, getAdminSignatures, getAdminMileageHistory, getAdminTeamDetail, getPaymentHistory, publishAdminSignature, refundPayment, updateAdminSignature } from "./admin.js";

let calls;
const originalAdapter = apiClient.defaults.adapter;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
before(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "local-contract-token" } });
  calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    return { data: { code: "SUCCESS", data: null }, status: 200, statusText: "OK", headers: {}, config };
  };
});
after(() => {
  apiClient.defaults.adapter = originalAdapter;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

test("다섯 화면의 조회는 /api/v1과 최신 경로, Bearer 계약을 쓴다", async () => {
  const controller = new AbortController();
  const config = { signal: controller.signal, timeout: 10000 };
  const cases = [
    [() => getChallengeDetail("challenge-1", config), "/challenges/challenge-1"],
    [() => getMyInstances(config), "/teams/me/instances"],
    [() => getLeaderboard(config), "/leaderboard"],
    [() => getMyProfile(config), "/teams/me"],
    [() => getMyMileageHistory(config), "/teams/me/mileage_history"],
    [() => getMySolves(config), "/teams/me/solves"],
    [() => getKothClubs(config), "/koth/clubs"],
    [() => getKothClub("club-1", config), "/koth/clubs/club-1"],
    [() => getMyMemberRanking(config), "/ranking/member"],
    [() => getSignatures(config), "/signatures"],
    [() => getSignature("signature-1", config), "/signatures/signature-1"],
    [() => getMyKothProgress(config), "/koth/me"],
    [() => getKothTeamToken(config), "/koth/team_token"],
    [() => getAdminTeamDetail("team-1", {}, config), "/admin/teams/team-1"],
    [() => getAdminSignatures(config), "/admin/signatures"],
  ];
  for (const [call, path] of cases) {
    await call();
    const request = calls.at(-1);
    assert.equal(request.url, path);
    assert.equal(request.baseURL, "/api/v1");
    assert.equal(request.method, "get");
    assert.equal(request.headers.Authorization, "Bearer local-contract-token");
    assert.equal(request.signal, controller.signal);
  }
});

test("참가자 시그니처 제출은 flag만 보내며 공백, 취소 신호와 제한 시간을 유지한다", async () => {
  const controller = new AbortController();
  await submitSignatureFlag("signature-1", { flag: " LOCAL ", team_id: "ignored", teamId: "ignored" }, { signal: controller.signal });
  const request = calls.at(-1);
  assert.equal(request.url, "/signatures/signature-1/submit");
  assert.equal(request.method, "post");
  assert.equal(request.timeout, 15000);
  assert.equal(request.signal, controller.signal);
  assert.deepEqual(JSON.parse(request.data), { flag: " LOCAL " });
  await getKothClub("club/a?b");
  assert.equal(calls.at(-1).url, "/koth/clubs/club%2Fa%3Fb");
  await getSignature("signature/a?b");
  assert.equal(calls.at(-1).url, "/signatures/signature%2Fa%3Fb");
});

test("랭킹과 관리자 내역은 페이지와 snake_case 필터를 그대로 전달한다", async () => {
  await getRankings({ page: 2, size: 6 });
  assert.deepEqual(calls.at(-1).params, { page: 2, size: 6 });
  await getKothLeaderboard("koth-1");
  assert.deepEqual(calls.at(-1).params, { koth_challenge_id: "koth-1" });
  const controller = new AbortController();
  for (const getHistory of [getAdminMileageHistory, getPaymentHistory]) {
    await getHistory({ teamId: "team-2", page: 2, size: 50 }, { signal: controller.signal, timeout: 10000 });
    const request = calls.at(-1);
    assert.equal(request.params.team_id, "team-2");
    assert.equal(request.params.teamId, undefined);
    assert.equal(request.params.page, 2);
    assert.equal(request.signal, controller.signal);
  }
});

test("인스턴스 생성은 challenge_id만 보내고 제어 요청은 서버 계약을 따른다", async () => {
  await createInstance({ challengeId: "challenge-1" });
  assert.deepEqual(JSON.parse(calls.at(-1).data), { challenge_id: "challenge-1" });
  for (const operation of [resetInstance, extendInstance]) {
    await operation("instance-1");
    const request = calls.at(-1);
    assert.deepEqual(JSON.parse(request.data), {});
    assert.ok(request.headers["Idempotency-Key"]);
    assert.equal(request.timeout, 15000);
  }
  await stopInstance("instance-1");
  assert.equal(calls.at(-1).method, "delete");
  assert.ok(calls.at(-1).headers["Idempotency-Key"]);
  await submitFlag("challenge-1", { flag: " LOCAL " });
  assert.deepEqual(JSON.parse(calls.at(-1).data), { flag: " LOCAL " });
});

test("QR 발급과 결제, 환불은 사용자 ID나 토큰을 URL에 붙이지 않는다", async () => {
  await issueMyQrToken();
  assert.equal(calls.at(-1).url, "/teams/me/qr_token");
  assert.equal(calls.at(-1).data, undefined);
  await checkoutPayment({ paymentToken: "pt_local", amount: 30, itemName: "부스" });
  assert.equal(calls.at(-1).url, "/admin/payment/checkout");
  assert.deepEqual(JSON.parse(calls.at(-1).data), { payment_token: "pt_local", amount: 30, item_name: "부스" });
  await refundPayment("history-1");
  assert.equal(calls.at(-1).url, "/admin/payment/history-1/refund");
  assert.equal(calls.at(-1).method, "delete");
  assert.equal(calls.at(-1).data, undefined);
  await adjustMileage("team-1", { amount: 30, reason: "부스", idempotencyKey: "same-attempt" });
  assert.equal(calls.at(-1).headers["Idempotency-Key"], "same-attempt");
});

test("시그니처 등록과 수정, 공개는 별도 API 계약을 사용한다", async () => {
  await createAdminSignature({ clubId: "club-1", title: "제목", description: "설명", flag: " LOCAL ", score: 300 });
  assert.equal(calls.at(-1).url, "/admin/signatures");
  assert.deepEqual(JSON.parse(calls.at(-1).data), { club_id: "club-1", title: "제목", description: "설명", flag: " LOCAL ", score: 300 });
  await updateAdminSignature("signature-1", { title: "수정", description: "설명", score: 350 });
  assert.equal(calls.at(-1).method, "patch");
  assert.deepEqual(JSON.parse(calls.at(-1).data), { title: "수정", description: "설명", score: 350 });
  await publishAdminSignature("signature-1", true);
  assert.equal(calls.at(-1).url, "/admin/signatures/signature-1/publish");
  assert.deepEqual(JSON.parse(calls.at(-1).data), { is_published: true });
  assert.equal(calls.at(-1).timeout, 15000);
});
