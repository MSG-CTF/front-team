const USER_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function parseAddedUserIds(value) {
  return [...new Set(value.trim().split(/[\s,]+/).filter(Boolean))];
}

export function validateTeamReason(reason) {
  const length = Array.from(reason.trim()).length;
  return length >= 1 && length <= 500 ? "" : "변경 사유는 1~500자로 입력하세요.";
}

export function buildTeamUpdate(team, { teamName, addUserIds, removedIds, leaderUserId, reason }) {
  const reasonError = validateTeamReason(reason);
  if (reasonError) return { error: reasonError };
  const name = teamName.trim();
  if (!name || Array.from(name).length > 100) return { error: "팀 이름은 1~100자로 입력하세요." };

  const additions = parseAddedUserIds(addUserIds);
  if (additions.some((id) => !USER_ID_PATTERN.test(id))) {
    return { error: "추가할 계정의 user_id(UUID)를 확인하세요." };
  }
  const currentIds = new Set((team.members ?? []).map((member) => member.user_id));
  const removed = [...removedIds].filter((id) => currentIds.has(id));
  if (additions.some((id) => currentIds.has(id))) return { error: "이미 이 팀에 속한 계정은 다시 추가할 수 없습니다." };

  const leader = leaderUserId || null;
  const finalIds = new Set([...currentIds, ...additions]);
  removed.forEach((id) => finalIds.delete(id));
  if (leader !== null && !finalIds.has(leader)) {
    return { error: "변경 후 팀원 중에서 팀장을 선택하세요." };
  }

  const changes = {};
  if (name !== team.team_name) changes.team_name = name;
  if (additions.length) changes.add_user_ids = additions;
  if (removed.length) changes.remove_user_ids = removed;
  const currentLeader = (team.members ?? []).find((member) => member.is_leader)?.user_id ?? null;
  if (leader !== currentLeader) changes.leader_user_id = leader;
  if (!Object.keys(changes).length) return { error: "변경된 항목이 없습니다." };
  return { body: { ...changes, reason: reason.trim() }, error: "" };
}

export function teamManagementError(error, action) {
  const code = error?.response?.data?.code;
  if (code === "ACTIVE_INSTANCE_EXISTS") {
    return action === "delete"
      ? "실행 중인 인스턴스를 먼저 강제 종료해야 팀을 삭제할 수 있습니다."
      : "제외하려는 팀원의 실행 중인 인스턴스를 먼저 종료해야 합니다.";
  }
  if (code === "TEAM_NAME_TAKEN") return "이미 사용 중인 팀 이름입니다.";
  if (code === "TEAM_NOT_FOUND") return "팀을 찾을 수 없습니다. 목록을 다시 조회하세요.";
  if (code === "INVALID_REQUEST") return error.response?.data?.message || "입력한 변경 내용을 확인하세요.";
  return error?.response?.data?.message || error?.message || (action === "delete" ? "팀 삭제에 실패했습니다." : "팀 수정에 실패했습니다.");
}
