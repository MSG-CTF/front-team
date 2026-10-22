import test from "node:test";
import assert from "node:assert/strict";
import { canRefund, formatMileageAmount, getMileageTypeLabel, mileageAttempt, paymentErrorMessage, validateCheckout, validateMileageAdjustment } from "./adminMileage.js";
import { MILEAGE_FILTERS, loadMileageHistory, mileageFilterQuery } from "./adminMileage.js";

test("같은 마일리지 요청의 재시도는 키를 유지하고 내용이 달라지면 새 키를 쓴다", () => {
  let count = 0;
  const createKey = () => `key-${++count}`;
  const payload = { teamId: "team-a", amount: "10", reason: "부스 참여" };
  const first = mileageAttempt(null, payload, createKey);
  assert.equal(mileageAttempt(first, { ...payload, amount: 10, reason: " 부스 참여 " }, createKey).key, first.key);
  for (const changed of [{ teamId: "team-b" }, { amount: 20 }, { reason: "문제 풀이" }]) {
    assert.notEqual(mileageAttempt(first, { ...payload, ...changed }, createKey).key, first.key);
  }
});

test("마일리지 조정은 팀, 정수 변동량, 사유를 확인한다", () => {
  const valid = { teamId: "team-a", amount: -10, reason: "오지급 회수" };
  assert.equal(validateMileageAdjustment(valid), "");
  for (const amount of ["", " ", 0, 0.1, Infinity, 2147483648]) {
    assert.ok(validateMileageAdjustment({ ...valid, amount }));
  }
  assert.ok(validateMileageAdjustment({ ...valid, teamId: "" }));
  assert.ok(validateMileageAdjustment({ ...valid, reason: "가".repeat(501) }));
});

test("결제는 토큰과 품목, 양의 정수 금액을 확인한다", () => {
  const valid = { paymentToken: "pt_local_test", itemName: "부스", amount: "30" };
  assert.equal(validateCheckout(valid), "");
  for (const amount of ["", " ", 0, -1, 1.5, Infinity, 2147483648]) assert.ok(validateCheckout({ ...valid, amount }));
  assert.ok(validateCheckout({ ...valid, paymentToken: " " }));
  assert.ok(validateCheckout({ ...valid, itemName: " " }));
  assert.equal(validateCheckout({ ...valid, itemName: "가".repeat(100) }), "");
  assert.ok(validateCheckout({ ...valid, itemName: "가".repeat(101) }));
});

test("환불은 아직 환불하지 않은 구매 내역만 허용한다", () => {
  const purchase = { history_id: "payment-1", type: "PURCHASE", amount: -30, is_refunded: false };
  assert.equal(canRefund(purchase), true);
  for (const changed of [{ is_refunded: true }, { is_refunded: undefined }, { type: "REFUND" }, { amount: 30 }, { history_id: null }]) {
    assert.equal(canRefund({ ...purchase, ...changed }), false);
  }
});

test("응답을 놓친 결제는 실패로 단정하지 않고 내역 확인을 안내한다", () => {
  assert.match(paymentErrorMessage(new Error("timeout")), /결제 내역/);
  assert.match(paymentErrorMessage({ response: { status: 500 } }), /확인하지 못했습니다/);
  assert.equal(paymentErrorMessage({ response: { status: 400, data: { message: "잔액이 부족합니다" } } }), "잔액이 부족합니다");
});

test("마일리지 내역은 유형 이름과 부호가 붙은 천 단위 금액으로 읽는다", () => {
  assert.equal(getMileageTypeLabel("ADMIN_GRANT"), "관리자 지급");
  assert.equal(getMileageTypeLabel("NEW_TYPE"), "NEW_TYPE");
  assert.equal(getMileageTypeLabel(undefined), "-");
  assert.equal(formatMileageAmount(1250), "+1,250");
  assert.equal(formatMileageAmount(-300), "-300");
  assert.equal(formatMileageAmount(0), "0");
  assert.equal(formatMileageAmount(null), "-");
});

test("마일리지 내역 필터는 문제 풀이를 뺀 운영 내역이 기본이고 묶음은 쉼표로 보낸다", () => {
  assert.equal(MILEAGE_FILTERS[0].key, "ops");
  assert.ok(!mileageFilterQuery("ops").split(",").includes("CHALLENGE_SOLVE"));
  assert.equal(mileageFilterQuery("payment"), "PURCHASE,REFUND");
  assert.equal(mileageFilterQuery("solve"), "CHALLENGE_SOLVE");
  assert.equal(mileageFilterQuery("all"), undefined);
  assert.equal(mileageFilterQuery("missing"), undefined);
  const covered = new Set(MILEAGE_FILTERS.filter((item) => item.key !== "ops" && item.key !== "all").flatMap((item) => item.types));
  assert.equal(covered.size, 8);
});

test("최근 품목은 같은 이름을 한 번만, 환불된 결제와 환불 줄은 빼고 최신 순으로 뽑는다", async () => {
  const { recentPaymentItems } = await import("./adminMileage.js");
  const history = [
    { type: "PURCHASE", reason: "다람쥐 키링", amount: -300, is_refunded: false },
    { type: "REFUND", reason: "결제 환불", amount: 300 },
    { type: "PURCHASE", reason: "도토리 쿠키", amount: -150, is_refunded: true },
    { type: "PURCHASE", reason: "다람쥐 키링", amount: -250, is_refunded: false },
    { type: "PURCHASE", reason: " 가을 엽서 ", amount: -100, is_refunded: false },
    { type: "PURCHASE", reason: "", amount: -100 },
  ];
  assert.deepEqual(recentPaymentItems(history), [{ itemName: "다람쥐 키링", amount: 300 }, { itemName: "가을 엽서", amount: 100 }]);
  assert.deepEqual(recentPaymentItems(history, 1), [{ itemName: "다람쥐 키링", amount: 300 }]);
  assert.deepEqual(recentPaymentItems(), []);
});

test("지급과 회수는 양수 금액에 부호만 붙인다", async () => {
  const { signedMileageAmount, validateMileageAdjustment } = await import("./adminMileage.js");
  assert.equal(signedMileageAmount("grant", "300"), "300");
  assert.equal(signedMileageAmount("deduct", "300"), "-300");
  assert.equal(signedMileageAmount("deduct", ""), "");
  assert.equal(validateMileageAdjustment({ teamId: "t", amount: signedMileageAmount("deduct", "300"), reason: "정정" }), "");
});

test("백엔드가 유형 묶음을 거절하면 같은 쪽을 유형 없이 다시 받아 화면에서 거른다", async () => {
  const calls = [];
  const rows = [{ type: "PURCHASE" }, { type: "CHALLENGE_SOLVE" }, { type: "REFUND" }];
  const fetchHistory = async (params) => {
    calls.push(params.type);
    if (params.type?.includes(",")) throw Object.assign(new Error("bad"), { response: { status: 400 } });
    return { data: { code: "SUCCESS", data: { history: rows, total_count: 3, page: 1, size: 50 } } };
  };
  const result = await loadMileageHistory(fetchHistory, { filter: "payment", page: 1 });
  assert.deepEqual(calls, ["PURCHASE,REFUND", undefined]);
  assert.deepEqual(result.data.data.history.map((row) => row.type), ["PURCHASE", "REFUND"]);
  assert.equal(result.data.data.filtered_locally, true);
  // 유형 하나나 전체는 그대로 보내고, 400 이 아닌 오류는 그대로 올린다
  calls.length = 0;
  await loadMileageHistory(fetchHistory, { filter: "solve", page: 1 });
  assert.deepEqual(calls, ["CHALLENGE_SOLVE"]);
  const failing = async () => { throw Object.assign(new Error("down"), { response: { status: 503 } }); };
  await assert.rejects(loadMileageHistory(failing, { filter: "ops", page: 1 }), /down/);
});
