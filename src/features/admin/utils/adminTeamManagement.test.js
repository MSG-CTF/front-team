import assert from "node:assert/strict";
import test from "node:test";
import { buildTeamUpdate, teamManagementError, validateTeamReason } from "./adminTeamManagement.js";

const leader = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
const newcomer = "33333333-3333-4333-8333-333333333333";
const team = {
  team_name: "가을팀",
  members: [{ user_id: leader, is_leader: true }, { user_id: member, is_leader: false }],
};
const form = { teamName: team.team_name, addUserIds: "", removedIds: [], leaderUserId: leader, reason: "운영 변경" };
const update = (patch) => buildTeamUpdate(team, { ...form, ...patch });

test("team update sends only changed fields and preserves explicit null leader", () => {
  assert.deepEqual(update({ teamName: "새 이름" }).body, { team_name: "새 이름", reason: "운영 변경" });
  assert.deepEqual(update({ leaderUserId: "" }).body, { leader_user_id: null, reason: "운영 변경" });
  assert.deepEqual(update({ leaderUserId: member }).body, { leader_user_id: member, reason: "운영 변경" });
});

test("team update supports adding, removing and promoting a new member together", () => {
  assert.deepEqual(update({ addUserIds: newcomer, removedIds: [member], leaderUserId: newcomer }).body, {
    add_user_ids: [newcomer], remove_user_ids: [member], leader_user_id: newcomer, reason: "운영 변경",
  });
});

test("team update rejects no-op, missing reason and invalid leader", () => {
  assert.match(update({}).error, /변경된 항목/);
  assert.match(update({ teamName: "새 이름", reason: "  " }).error, /변경 사유/);
  assert.match(update({ removedIds: [leader], leaderUserId: leader }).error, /변경 후 팀원/);
  assert.match(update({ addUserIds: "not-a-uuid" }).error, /UUID/);
  assert.ok(validateTeamReason("x".repeat(501)));
});

test("server conflicts have actionable administrator messages", () => {
  const failure = (code) => ({ response: { data: { code } } });
  assert.match(teamManagementError(failure("TEAM_NAME_TAKEN"), "update"), /사용 중/);
  assert.match(teamManagementError(failure("ACTIVE_INSTANCE_EXISTS"), "update"), /제외하려는 팀원/);
  assert.match(teamManagementError(failure("ACTIVE_INSTANCE_EXISTS"), "delete"), /강제 종료/);
});
