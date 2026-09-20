import test from "node:test";
import assert from "node:assert/strict";
import { buildFestivalBooths, groupSignatureClubs } from "./festivalBooths.js";
import { ROUTES } from "../../../routes/routePaths.js";

const entry = (id, clubId, name, solved = false) => ({
  signature_id: id,
  club_id: clubId,
  club_name: name,
  is_solved: solved,
});

test("축제장 여섯 부스 위치와 이름은 응답 정렬이나 대소문자가 달라도 유지한다", () => {
  const { booths } = buildFestivalBooths([
    entry("s1", "c2", "SeKurity"),
    entry("s2", "c1", "Y-CERT"),
  ]);
  assert.deepEqual(
    booths.map(({ name }) => name),
    ["MJSEC", "SWING", "Y-CERT", "seKUrity", "CodeCure", "Aegis"],
  );
  assert.equal(booths[2].clubId, "c1");
  assert.equal(booths[3].clubId, "c2");
  assert.deepEqual(
    booths.map(({ position }) => position),
    [0, 1, 2, 3, 4, 5],
  );
});

test("동아리에 여러 문제가 있어도 부스는 하나이며 공개 목록의 문제만 보존한다", () => {
  const rows = [
    entry("s1", "c1", "MJSEC", true),
    entry("s2", "c1", "MJSEC"),
    entry("s3", "c2", "SWING"),
  ];
  const groups = groupSignatureClubs(rows);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].problems, rows.slice(0, 2));
  assert.equal(groups[0].solvedCount, 1);
  const { booths } = buildFestivalBooths(rows);
  assert.equal(booths[0].problems.length, 2);
  assert.equal(booths[2].clubId, null);
  assert.equal(booths[2].problems.length, 0);
});

test("빈 목록은 가짜 문제나 부스 경로를 만들지 않는다", () => {
  const { booths, otherClubs } = buildFestivalBooths([]);
  assert.equal(booths.length, 6);
  assert.ok(
    booths.every((club) => club.clubId === null && club.problems.length === 0),
  );
  assert.deepEqual(otherClubs, []);
});

test("이름이 같은 다른 ID와 추가 동아리도 문제를 섞거나 숨기지 않는다", () => {
  const { booths, otherClubs } = buildFestivalBooths([
    entry("s1", "c1", "MJSEC"),
    entry("s2", "c2", "MJSEC"),
    entry("s3", "c3", "새 동아리"),
  ]);
  assert.deepEqual(
    booths[0].problems.map((row) => row.signature_id),
    ["s1"],
  );
  assert.deepEqual(
    otherClubs.map((club) => club.clubId),
    ["c2", "c3"],
  );
  assert.equal(otherClubs[1].university, "");
});

test("부스 주소는 서버 ID를 인코딩하고 문제 상세 경로와 구분한다", () => {
  assert.equal(
    ROUTES.signatureClub("club/1?name=foo"),
    "/signatures/clubs/club%2F1%3Fname%3Dfoo",
  );
  assert.equal(ROUTES.signatureDetail("id"), "/signatures/id");
});
