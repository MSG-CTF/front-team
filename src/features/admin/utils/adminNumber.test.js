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
