// 관리자 팀 수정/삭제 - Notion API명세서 관리자 페이지(2026-09-26, 백엔드 PR 대기).
// PATCH /admin/teams/{team_id}: team_name / add_user_ids / remove_user_ids / leader_user_id 중
// 하나 이상 + reason(1~500자). DELETE /admin/teams/{team_id}: reason(1~500자), 되돌릴 수 없음.

// "변경 안 함"과 "팀장 공석(null)"을 구분하기 위한 선택값
export const LEADER_UNCHANGED = "__unchanged__";
export const LEADER_VACANT = "__vacant__";

export function parseUserIds(text) {
  return [...new Set(String(text ?? "").split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
}

function validReason(reason) {
  const length = Array.from(reason?.trim() ?? "").length;
  return length >= 1 && length <= 500;
}

// 변경 후 팀원 = 기존 팀원 - 제외 + 추가
export function getMembersAfterUpdate(currentMemberIds, removeUserIds, addUserIds) {
  const removed = new Set(removeUserIds);
  return [...currentMemberIds.filter((id) => !removed.has(id)), ...addUserIds.filter((id) => !currentMemberIds.includes(id))];
}

// 폼 상태 -> { body, error }. 바뀐 항목만 body에 담는다.
export function buildTeamUpdateRequest({ currentName, currentMemberIds, teamName, removeUserIds, addUserIdsText, leaderChoice, reason }) {
  const body = {};
  const trimmedName = teamName?.trim() ?? "";
  if (trimmedName && trimmedName !== currentName) {
    if (Array.from(trimmedName).length > 100) return { error: "팀 이름은 1~100자로 입력하세요" };
    body.team_name = trimmedName;
  } else if (!trimmedName) {
    return { error: "팀 이름은 비울 수 없습니다" };
  }

  const addUserIds = parseUserIds(addUserIdsText).filter((id) => !currentMemberIds.includes(id));
  const removeIds = [...new Set(removeUserIds)].filter((id) => currentMemberIds.includes(id));
  if (addUserIds.some((id) => removeIds.includes(id))) return { error: "같은 계정을 추가와 제외에 함께 넣을 수 없습니다" };
  if (addUserIds.length) body.add_user_ids = addUserIds;
  if (removeIds.length) body.remove_user_ids = removeIds;

  if (leaderChoice === LEADER_VACANT) {
    body.leader_user_id = null;
  } else if (leaderChoice && leaderChoice !== LEADER_UNCHANGED) {
    const after = getMembersAfterUpdate(currentMemberIds, removeIds, addUserIds);
    if (!after.includes(leaderChoice)) return { error: "팀장은 변경 후 팀원 중에서 골라야 합니다" };
    body.leader_user_id = leaderChoice;
  }

  if (Object.keys(body).length === 0) return { error: "바꿀 항목을 하나 이상 입력하세요" };
  if (!validReason(reason)) return { error: "사유는 1~500자로 입력하세요" };
  body.reason = reason.trim();
  return { body, error: "" };
}

export function validateTeamDelete({ teamName, confirmName, reason }) {
  if (confirmName?.trim() !== teamName) return "확인을 위해 팀 이름을 정확히 입력하세요";
  if (!validReason(reason)) return "사유는 1~500자로 입력하세요";
  return "";
}
