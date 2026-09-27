import test from "node:test";
import assert from "node:assert/strict";
import { canRefund, mileageAttempt, paymentErrorMessage, validateCheckout, validateMileageAdjustment } from "./adminMileage.js";

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
