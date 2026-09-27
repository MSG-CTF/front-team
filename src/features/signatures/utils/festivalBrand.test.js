import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getFestivalBrand, getBoothProgress } from "./festivalBrand.js";

test("가로형 로고와 심벌형 로고를 구분하고 알려진 SVG만 사용한다", () => {
  for (const name of ["SWING", "seKUrity"])
    assert.equal(getFestivalBrand(name).kind, "wordmark");
  for (const name of ["MJSEC", "Y-CERT", "CodeCure", "Aegis"])
    assert.equal(getFestivalBrand(name).kind, "emblem");
  assert.equal(getFestivalBrand("MJSEC").shape, "angular");
  assert.equal(getFestivalBrand("Y-CERT").shape, "shield");
  for (const name of ["CodeCure", "Aegis"])
    assert.equal(getFestivalBrand(name).shape, "round");
  for (const name of ["SWING", "seKUrity"])
    assert.equal(getFestivalBrand(name).shape, "wide");
  assert.equal(getFestivalBrand("SeKurity").name, "seKUrity");
  assert.equal(getFestivalBrand("constructor"), null);
  assert.equal(getFestivalBrand("../../other.svg"), null);
  assert.equal(getFestivalBrand(undefined), null);
});

test("여백 보정 SVG는 원본 도형, 글자, 색상을 변경하지 않는다", () => {
  const root = new URL("../../../../", import.meta.url);
  for (const key of [
    "mjsec",
    "swing",
    "ycert",
    "sekurity",
    "codecure",
    "aegis",
  ]) {
    const original = readFileSync(
      new URL(`public/assets/intro/club-${key}.svg`, root),
      "utf8",
    ).trim();
    const fitted = readFileSync(
      new URL(`public/assets/signatures/club-${key}-fitted.svg`, root),
      "utf8",
    ).trim();
    const content = (text) =>
      text.replace(/^<svg\b[^>]*>/, "").replaceAll("\r\n", "\n");
    assert.equal(content(fitted), content(original), key);
    assert.doesNotMatch(
      fitted.slice(0, fitted.indexOf(">")),
      /viewBox="0 0 50 50"/,
    );
  }
});

test("서버의 문제별 풀이 여부를 집계하고 전부 해결한 경우만 스탬프를 허용한다", () => {
  const club = {
    solvedCount: 999,
    problems: [{ is_solved: true }, { is_solved: false }],
  };
  assert.deepEqual(getBoothProgress(club), {
    total: 2,
    solved: 1,
    visited: true,
    complete: false,
  });
  assert.deepEqual(
    getBoothProgress({ problems: [{ is_solved: true }, { is_solved: true }] }),
    { total: 2, solved: 2, visited: true, complete: true },
  );
  assert.deepEqual(getBoothProgress({ problems: [{ is_solved: "true" }] }), {
    total: 1,
    solved: 0,
    visited: false,
    complete: false,
  });
});

test("빈 부스나 조회 실패를 완료한 부스로 표시하지 않는다", () => {
  for (const status of ["loading", "error"]) {
    assert.deepEqual(
      getBoothProgress({ problems: [{ is_solved: true }] }, status),
      { total: 0, solved: 0, visited: false, complete: false },
    );
  }
  assert.equal(getBoothProgress({ problems: [] }).complete, false);
  assert.equal(getBoothProgress(null).visited, false);
});
