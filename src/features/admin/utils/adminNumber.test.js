import test from "node:test";
import assert from "node:assert/strict";
import { formatAdminNumber } from "./adminNumber.js";

test("관리자 표 숫자는 천 단위 쉼표를 넣고 없는 값은 줄표로 둔다", () => {
  assert.equal(formatAdminNumber(14205), "14,205");
  assert.equal(formatAdminNumber("1480"), "1,480");
  assert.equal(formatAdminNumber(0), "0");
  assert.equal(formatAdminNumber(1000.256), "1,000.26");
  assert.equal(formatAdminNumber(null), "-");
  assert.equal(formatAdminNumber(""), "-");
  assert.equal(formatAdminNumber("미제공"), "미제공");
});

test("금액 입력은 숫자만 남기고 쉼표를 넣어 보인다", async () => {
  const { amountDigits, formatAmountDigits } = await import("./adminNumber.js");
  assert.equal(amountDigits("1,500 MI"), "1500");
  assert.equal(amountDigits("00300"), "300");
  assert.equal(amountDigits("-200"), "200");
  assert.equal(amountDigits("12345678901234"), "1234567890");
  assert.equal(amountDigits(""), "");
  assert.equal(formatAmountDigits("1500"), "1,500");
  assert.equal(formatAmountDigits(""), "");
});
