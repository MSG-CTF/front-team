import test from "node:test";
import assert from "node:assert/strict";
import {
  LEADER_UNCHANGED,
  LEADER_VACANT,
  buildTeamUpdateRequest,
  getMembersAfterUpdate,
  parseUserIds,
  validateTeamDelete,
} from "./adminTeam.js";

const base = {
  currentName: "감자전",
  currentMemberIds: ["u1", "u2"],
  teamName: "감자전",
  removeUserIds: [],
  addUserIdsText: "",
  leaderChoice: LEADER_UNCHANGED,
  reason: "팀 재편성",
};

test("user_id 입력은 쉼표/공백으로 나누고 중복을 없앤다", () => {
  assert.deepEqual(parseUserIds(" u3, u4\nu3 "), ["u3", "u4"]);
  assert.deepEqual(parseUserIds(""), []);
});

test("바뀐 항목만 body에 담고 reason은 필수다", () => {
  assert.equal(buildTeamUpdateRequest(base).error, "바꿀 항목을 하나 이상 입력하세요");
  assert.deepEqual(buildTeamUpdateRequest({ ...base, teamName: " 새 이름 " }).body, { team_name: "새 이름", reason: "팀 재편성" });
  assert.notEqual(buildTeamUpdateRequest({ ...base, teamName: "새 이름", reason: " " }).error, "");
  assert.notEqual(buildTeamUpdateRequest({ ...base, teamName: "a".repeat(101) }).error, "");
});

test("팀원 추가/제외와 팀장 지정은 변경 후 팀원 기준으로 검사한다", () => {
  const { body } = buildTeamUpdateRequest({ ...base, addUserIdsText: "u3", removeUserIds: ["u1"], leaderChoice: "u3" });
  assert.deepEqual(body, { add_user_ids: ["u3"], remove_user_ids: ["u1"], leader_user_id: "u3", reason: "팀 재편성" });
  assert.notEqual(buildTeamUpdateRequest({ ...base, removeUserIds: ["u1"], leaderChoice: "u1" }).error, "");
  assert.deepEqual(buildTeamUpdateRequest({ ...base, leaderChoice: LEADER_VACANT }).body, { leader_user_id: null, reason: "팀 재편성" });
  assert.deepEqual(getMembersAfterUpdate(["u1", "u2"], ["u1"], ["u2", "u3"]), ["u2", "u3"]);
});

test("이미 팀원인 계정 추가와 팀원이 아닌 계정 제외는 요청에서 뺀다", () => {
  assert.equal(buildTeamUpdateRequest({ ...base, addUserIdsText: "u1", removeUserIds: ["x"] }).error, "바꿀 항목을 하나 이상 입력하세요");
});

test("팀 삭제는 팀 이름 확인과 사유가 필요하다", () => {
  assert.notEqual(validateTeamDelete({ teamName: "감자전", confirmName: "감자", reason: "정리" }), "");
  assert.notEqual(validateTeamDelete({ teamName: "감자전", confirmName: "감자전", reason: "" }), "");
  assert.equal(validateTeamDelete({ teamName: "감자전", confirmName: " 감자전 ", reason: "테스트 팀 정리" }), "");
});
