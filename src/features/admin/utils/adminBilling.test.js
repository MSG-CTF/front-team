import test from "node:test";
import assert from "node:assert/strict";
import { billingProjection, formatMoney, normalizeBilling, readLocalBilling, validateBillingForm, writeLocalBilling } from "./adminBilling.js";

const now = Date.parse("2026-10-23T00:00:00Z");
const endTime = "2026-10-23T10:00:00Z"; // 10시간 남음

test("남은 시간 동안 같은 속도로 쓰면 크레딧이 남는지 바닥나는지 계산한다", () => {
  const ok = billingProjection({ credit_total: 300, spent: 100, hourly_cost: 5, currency: "USD" }, { now, endTime });
  assert.equal(ok.status, "ok");
  assert.equal(ok.projected, 150);
  assert.equal(ok.left, 150);
  assert.equal(ok.remainingHours, 10);
  const low = billingProjection({ credit_total: 300, spent: 200, hourly_cost: 5 }, { now, endTime });
  assert.equal(low.status, "low");
  const over = billingProjection({ credit_total: 300, spent: 200, hourly_cost: 15 }, { now, endTime });
  assert.equal(over.status, "over");
  assert.equal(over.runOutAt, "2026-10-23T06:40:00.000Z");
  assert.equal(billingProjection(null).status, "unknown");
  assert.equal(billingProjection({ credit_total: null, spent: 1 }).status, "unknown");
});

test("금액은 통화에 맞춰 보이고 입력은 0 이상 숫자만 받는다", () => {
  assert.equal(formatMoney(12.5, "USD"), "$12.50");
  assert.equal(formatMoney(1250, "USD"), "$1,250");
  assert.equal(formatMoney(118.3, "USD"), "$118.30");
  assert.equal(formatMoney(-36.7, "USD"), "-$36.70");
  assert.equal(formatMoney(52000.4, "KRW"), "52,000원");
  assert.equal(validateBillingForm({ credit_total: "300", spent: "10", hourly_cost: "1.5" }), "");
  assert.equal(validateBillingForm({ credit_total: "", spent: "10", hourly_cost: "1" }), "크레딧 총액은 0 이상 숫자로 입력하세요");
  assert.equal(validateBillingForm({ credit_total: "300", spent: "-1", hourly_cost: "1" }), "지금까지 쓴 금액은 0 이상 숫자로 입력하세요");
  assert.equal(normalizeBilling({ plan: "X", currency: "EUR", credit_total: "300" }).currency, "USD");
});

test("요금 계획은 이 브라우저 저장소에 남기고 저장소가 막혀도 깨지지 않는다", () => {
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(writeLocalBilling("acc", { plan: "FREE_TRIAL", currency: "USD", credit_total: 300, spent: 10, hourly_cost: 1 }, storage), true);
  const saved = readLocalBilling("acc", storage);
  assert.equal(saved.source, "local");
  assert.equal(saved.credit_total, 300);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readLocalBilling("acc", broken), null);
  assert.equal(writeLocalBilling("acc", {}, broken), false);
});
