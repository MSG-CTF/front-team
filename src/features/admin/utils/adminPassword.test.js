import test from "node:test";
import assert from "node:assert/strict";
import { generateStrongPassword, passwordStrength, secureRandomInt } from "./adminPassword.js";
import { validateAdminAccount } from "./adminValidation.js";

test("추천 비밀번호는 여섯 글자 세 묶음이고 대문자와 숫자를 하나씩 가진다", () => {
  for (let round = 0; round < 200; round += 1) {
    const password = generateStrongPassword();
    assert.match(password, /^[a-zA-Z2-9]{6}-[a-zA-Z2-9]{6}-[a-zA-Z2-9]{6}$/);
    assert.equal(password.replace(/[^A-Z]/g, "").length, 1);
    assert.equal(password.replace(/[^0-9]/g, "").length, 1);
    assert.doesNotMatch(password, /[lIoO01]/);
    assert.equal(validateAdminAccount({ loginId: "a", password, nickname: "b", role: "PARTICIPANT", isLeader: false, teamMode: "NONE" }), "");
  }
});

test("추천 비밀번호는 매번 달라지고 고른 난수를 쓴다", () => {
  const seen = new Set(Array.from({ length: 50 }, () => generateStrongPassword()));
  assert.equal(seen.size, 50);
  const counts = new Array(8).fill(0);
  for (let round = 0; round < 8000; round += 1) counts[secureRandomInt(8)] += 1;
  assert.ok(counts.every((count) => count > 800 && count < 1200));
});

test("주입한 난수로 같은 비밀번호를 다시 만들 수 있다", () => {
  const sequence = [0, 1, 2, 3, 4, 5, 6, 7];
  let position = 0;
  const fixed = (max) => sequence[position++ % sequence.length] % max;
  position = 0;
  const first = generateStrongPassword(fixed);
  position = 0;
  assert.equal(generateStrongPassword(fixed), first);
});

test("직접 입력한 비밀번호의 세기를 길이와 글자 종류로 알려준다", () => {
  assert.equal(passwordStrength("short").level, 0);
  assert.equal(passwordStrength("abcdefgh").level, 1);
  assert.equal(passwordStrength("abcdefgh1234").level, 2);
  assert.equal(passwordStrength("abcdef-Ghijkl-mn3pqr").level, 3);
});
