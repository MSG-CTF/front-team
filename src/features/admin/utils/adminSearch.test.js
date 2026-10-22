import test from "node:test";
import assert from "node:assert/strict";
import { initialsOf, matchesSearch, searchItems, searchRank } from "./adminSearch.js";

test("팀 검색은 대소문자와 띄어쓰기를 무시하고 초성만으로도 찾는다", () => {
  assert.ok(matchesSearch("도토리묵사발", "도토리"));
  assert.ok(matchesSearch("도토리묵사발", "ㄷㅌㄹ"));
  assert.ok(matchesSearch("새벽세시의 버퍼오버플로우 연구소 A팀", "버퍼 오버"));
  assert.ok(matchesSearch("0xDEADBEEF", "deadbeef"));
  assert.ok(!matchesSearch("도토리묵사발", "ㅎㅋ"));
  assert.ok(matchesSearch("아무 팀", ""));
  assert.equal(initialsOf("냥냥 펀치"), "ㄴㄴㅍㅊ");
});

test("검색 결과는 앞부분 일치, 중간 일치, 초성 일치 순서로 선다", () => {
  const teams = ["묵사발 도토리", "도토리묵사발", "다람쥐 탐험대", "Segfault"];
  assert.deepEqual(searchItems(teams, "도토리", (team) => team), ["도토리묵사발", "묵사발 도토리"]);
  assert.deepEqual(searchItems(teams, "ㄷㄹ", (team) => team), ["다람쥐 탐험대"]);
  assert.deepEqual(searchItems(teams, "", (team) => team), teams);
  assert.ok(searchRank("도토리묵사발", "도토") < searchRank("묵사발 도토리", "도토"));
});
