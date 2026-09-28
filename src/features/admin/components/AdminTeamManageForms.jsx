import { useEffect, useMemo, useState } from "react";
import {
  LEADER_UNCHANGED,
  LEADER_VACANT,
  buildTeamUpdateRequest,
  getMembersAfterUpdate,
  parseUserIds,
  validateTeamDelete,
} from "../utils/adminTeam.js";

const INPUT = "rounded border border-admin-divider bg-white/60 px-2 py-1.5";

// 팀 정보 수정 - PATCH /admin/teams/{team_id}(Notion 2026-09-26, 백엔드 PR 대기).
// 이름/팀원 추가·제외/팀장 변경을 한 번에 보낼 수 있고, 바뀐 항목만 요청에 담는다.
export function TeamEditForm({ team, isMutating, onSubmit }) {
  const members = team.members ?? [];
  const currentMemberIds = useMemo(() => members.map((member) => member.user_id), [members]);
  const [teamName, setTeamName] = useState(team.team_name ?? "");
  const [removeUserIds, setRemoveUserIds] = useState([]);
  const [addUserIdsText, setAddUserIdsText] = useState("");
  const [leaderChoice, setLeaderChoice] = useState(LEADER_UNCHANGED);
  const [reason, setReason] = useState("");

  // 저장 후 최신 상세가 다시 오면 폼을 새 값으로 맞춘다
  useEffect(() => {
    setTeamName(team.team_name ?? "");
    setRemoveUserIds([]);
    setAddUserIdsText("");
    setLeaderChoice(LEADER_UNCHANGED);
  }, [team.team_name, currentMemberIds]);

  const request = buildTeamUpdateRequest({
    currentName: team.team_name,
    currentMemberIds,
    teamName,
    removeUserIds,
    addUserIdsText,
    leaderChoice,
    reason,
  });
  const addedIds = parseUserIds(addUserIdsText).filter((id) => !currentMemberIds.includes(id));
  const leaderCandidates = getMembersAfterUpdate(currentMemberIds, removeUserIds, addedIds);
  const nicknameOf = (userId) => members.find((member) => member.user_id === userId)?.nickname ?? `${userId} (추가 예정)`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isMutating || request.error) return;
        onSubmit(request.body).then((ok) => {
          if (ok) setReason("");
        });
      }}
      className="flex flex-col gap-3 font-song-myung text-sm"
    >
      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">팀 이름</span>
        <input value={teamName} maxLength={100} disabled={isMutating} onChange={(event) => setTeamName(event.target.value)} className={`${INPUT} w-56`} />
      </label>

      <fieldset className="m-0 flex flex-wrap items-start gap-2 border-0 p-0">
        <legend className="float-left w-24 pt-1 text-xs text-admin-muted">팀원 제외</legend>
        <div className="flex flex-col gap-1">
          {members.map((member) => (
            <label key={member.user_id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                disabled={isMutating}
                checked={removeUserIds.includes(member.user_id)}
                onChange={(event) =>
                  setRemoveUserIds((ids) => (event.target.checked ? [...ids, member.user_id] : ids.filter((id) => id !== member.user_id)))
                }
              />
              {member.nickname}
              {member.login_id ? ` (${member.login_id})` : ""}
              {member.is_leader ? " · 팀장" : ""}
            </label>
          ))}
          {members.length === 0 && <span className="text-xs text-admin-muted">팀원이 없습니다</span>}
        </div>
      </fieldset>

      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">팀원 추가</span>
        <input
          value={addUserIdsText}
          disabled={isMutating}
          onChange={(event) => setAddUserIdsText(event.target.value)}
          placeholder="user_id (여러 개는 쉼표로 구분)"
          className={`${INPUT} w-80 font-kode-mono text-xs`}
        />
        <span className="text-xs text-admin-muted">무소속 참가자만 추가할 수 있습니다</span>
      </label>

      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">팀장</span>
        <select value={leaderChoice} disabled={isMutating} onChange={(event) => setLeaderChoice(event.target.value)} className={INPUT}>
          <option value={LEADER_UNCHANGED}>변경 안 함</option>
          {leaderCandidates.map((userId) => (
            <option key={userId} value={userId}>{nicknameOf(userId)}</option>
          ))}
          <option value={LEADER_VACANT}>공석으로 두기</option>
        </select>
      </label>

      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">사유</span>
        <input value={reason} maxLength={500} disabled={isMutating} onChange={(event) => setReason(event.target.value)} placeholder="이벤트 로그에 남습니다 (1~500자)" className={`${INPUT} w-80`} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isMutating || Boolean(request.error)} className="rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50">
          팀 정보 저장
        </button>
        {request.error && <span className="text-xs text-admin-muted">{request.error}</span>}
      </div>
      <p className="m-0 text-xs text-admin-muted">
        소속이나 팀장 여부가 바뀐 계정은 다시 로그인해야 합니다. 이미 발급된 토큰은 최대 1시간 동안 이전 값이 남습니다.
        실행 중인 인스턴스가 있는 팀원은 제외할 수 없습니다.
      </p>
    </form>
  );
}

// 팀 삭제 - DELETE /admin/teams/{team_id}(Notion 2026-09-26, 백엔드 PR 대기). 되돌릴 수 없어
// 팀 이름을 그대로 입력해야 버튼이 열린다.
export function TeamDeleteForm({ team, isMutating, onSubmit }) {
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");
  const error = validateTeamDelete({ teamName: team.team_name, confirmName, reason });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isMutating || error) return;
        onSubmit(reason.trim());
      }}
      className="flex flex-col gap-2 rounded-lg border border-admin-failed/60 bg-[rgba(163,73,52,0.06)] p-4 font-song-myung text-sm"
    >
      <p className="m-0 text-admin-failed">
        팀을 삭제하면 되돌릴 수 없습니다. 소속 계정과 풀이·제출·마일리지·결제·보드 진행·시그니처 기록이 함께 삭제되고,
        이 팀이 푼 문제의 점수가 다시 계산됩니다. 실행 중인 인스턴스가 있으면 먼저 강제 종료하세요.
      </p>
      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">팀 이름 확인</span>
        <input value={confirmName} disabled={isMutating} onChange={(event) => setConfirmName(event.target.value)} placeholder={team.team_name} className={`${INPUT} w-56`} />
      </label>
      <label className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-xs text-admin-muted">사유</span>
        <input value={reason} maxLength={500} disabled={isMutating} onChange={(event) => setReason(event.target.value)} placeholder="1~500자" className={`${INPUT} w-80`} />
      </label>
      <div>
        <button type="submit" disabled={isMutating || Boolean(error)} className="rounded border border-admin-failed bg-admin-failed px-3 py-1.5 text-white disabled:opacity-40">
          팀 삭제
        </button>
      </div>
    </form>
  );
}
