import test from "node:test";
import assert from "node:assert/strict";
import { changeProductQuantity, MAX_PAYMENT_QUANTITY, PAYMENT_CATALOG, productCheckout } from "./paymentCatalog.js";
import { validateCheckout } from "./adminMileage.js";

test("확정 상품 8개의 가격과 팝콘 판매 단위를 사용한다", () => {
  assert.deepEqual(PAYMENT_CATALOG.map(({ name, price }) => [name, price]), [
    ["칠성사이다", 400], ["하리토스", 800], ["진저에일", 800], ["코제", 400],
    ["조마난과자", 500], ["팝콘", 150], ["MSG 스티커", 150], ["키캡", 1500],
  ]);
  assert.equal(PAYMENT_CATALOG.find((item) => item.id === "popcorn").note, "200ml 종이컵");
  assert.equal(PAYMENT_CATALOG.find((item) => item.id === "popcorn").unit, "컵");
});

test("여러 상품을 담으면 가격과 수량을 합치고 결제 내역에 남길 이름을 만든다", () => {
  let cart = changeProductQuantity({}, "chilsung-cider", 2);
  cart = changeProductQuantity(cart, "msg-sticker", 3);
  cart = changeProductQuantity(cart, "popcorn", 1);
  const checkout = productCheckout(cart);
  assert.equal(checkout.amount, "1400");
  assert.equal(checkout.itemName, "칠성사이다 2개, 팝콘 1컵, MSG 스티커 3개");
  assert.equal(validateCheckout({ ...checkout, paymentToken: "pt_qa" }), "");
});

test("수량을 줄여 0이 되면 상품과 금액을 제거하고 빈 주문은 결제하지 않는다", () => {
  const original = { keycap: 1 };
  const cart = changeProductQuantity(original, "keycap", -1);
  assert.deepEqual(original, { keycap: 1 });
  assert.deepEqual(cart, {});
  assert.equal(productCheckout(cart).amount, "");
  assert.ok(validateCheckout({ ...productCheckout(cart), paymentToken: "pt_qa" }));
});

test("전체 상품을 최대 수량으로 담아도 기존 API의 금액·품목명 제한에 맞는다", () => {
  const cart = Object.fromEntries(PAYMENT_CATALOG.map(({ id }) => [id, MAX_PAYMENT_QUANTITY]));
  const checkout = productCheckout(cart);
  assert.equal(checkout.amount, "465300");
  assert.equal(validateCheckout({ ...checkout, paymentToken: "pt_qa" }), "");
  assert.equal(changeProductQuantity(cart, "keycap", 1).keycap, MAX_PAYMENT_QUANTITY);
});

test("없는 상품·음수·소수·범위 밖 수량으로 임의 합계를 만들지 않는다", () => {
  assert.deepEqual(changeProductQuantity({}, "unknown", 1), {});
  assert.deepEqual(changeProductQuantity({}, "keycap", .5), {});
  assert.deepEqual(changeProductQuantity({}, "keycap", -1), {});
  for (const cart of [{ keycap: -1 }, { keycap: .5 }, { keycap: 100 }, { keycap: NaN }, { unknown: 1 }]) {
    assert.equal(productCheckout(cart).amount, "");
  }
});
