import { useRef, useState } from "react";
import { deleteAdminTeam, updateAdminTeam } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import {
  buildTeamUpdate,
  parseAddedUserIds,
  teamManagementError,
  validateTeamReason,
} from "../utils/adminTeamManagement.js";
import AdminDialog from "./AdminDialog.jsx";

const inputClass = "w-full rounded border border-admin-divider bg-white/60 px-2 py-1.5 font-song-myung text-sm";

export function AdminTeamEditDialog({ team, onClose, onSaved }) {
  const [teamName, setTeamName] = useState(team.team_name);
  const [addUserIds, setAddUserIds] = useState("");
  const [removedIds, setRemovedIds] = useState([]);
  const [leaderUserId, setLeaderUserId] = useState(
    (team.members ?? []).find((member) => member.is_leader)?.user_id ?? "",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const additions = parseAddedUserIds(addUserIds);
  const remainingMembers = (team.members ?? []).filter((member) => !removedIds.includes(member.user_id));

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const update = buildTeamUpdate(team, { teamName, addUserIds, removedIds, leaderUserId, reason });
    if (update.error) { setError(update.error); return; }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await updateAdminTeam(team.team_id, update.body);
      if (!isSuccess(response.data)) throw Object.assign(new Error(response.data?.message), { response });
      await onSaved();
    } catch (requestError) {
      setError(teamManagementError(requestError, "update"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <AdminDialog title={`${team.team_name} 수정`} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="flex flex-col gap-3 font-song-myung text-sm">
        <label className="flex flex-col gap-1">팀 이름
          <input className={inputClass} value={teamName} maxLength={100} disabled={busy} onChange={(event) => setTeamName(event.target.value)} />
        </label>
        <fieldset className="rounded border border-admin-divider p-2" disabled={busy}>
          <legend>현재 팀원</legend>
          <div className="flex flex-col gap-1">
            {(team.members ?? []).map((member) => (
              <label key={member.user_id} className="flex items-center gap-2">
                <input type="checkbox" checked={removedIds.includes(member.user_id)} onChange={(event) => {
                  setRemovedIds((current) => event.target.checked
                    ? [...current, member.user_id] : current.filter((id) => id !== member.user_id));
                  if (event.target.checked && leaderUserId === member.user_id) setLeaderUserId("");
                }} />
                {member.nickname} ({member.login_id || member.user_id}) {member.is_leader ? "- 현재 팀장" : ""} 제외
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">무소속 참가자 추가 (user_id)
          <textarea className={inputClass} rows={2} value={addUserIds} disabled={busy} onChange={(event) => setAddUserIds(event.target.value)} placeholder="UUID를 쉼표 또는 줄바꿈으로 구분" />
        </label>
        <p className="m-0 text-xs text-admin-muted">참가자 목록 조회 API가 없어 user_id를 직접 입력합니다. 다른 팀 소속 계정은 기존 팀에서 먼저 제외해야 합니다.</p>
        <label className="flex flex-col gap-1">변경 후 팀장
          <select className={inputClass} value={leaderUserId} disabled={busy} onChange={(event) => setLeaderUserId(event.target.value)}>
            <option value="">팀장 공석</option>
            {remainingMembers.map((member) => <option key={member.user_id} value={member.user_id}>{member.nickname} ({member.login_id || member.user_id})</option>)}
            {additions.map((id) => <option key={id} value={id}>추가 계정 {id}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">변경 사유 (필수, 1~500자)
          <textarea className={inputClass} rows={2} maxLength={500} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
        </label>
        <p className="m-0 text-xs text-admin-muted">소속 또는 팀장 정보가 변경된 팀원은 다시 로그인해야 변경사항이 반영됩니다.</p>
        {error && <p role="alert" className="m-0 text-admin-failed">{error}</p>}
        <button type="submit" disabled={busy} className="self-end rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50">변경 저장</button>
      </form>
    </AdminDialog>
  );
}

export function AdminTeamDeleteDialog({ team, onClose, onDeleted }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const reasonError = validateTeamReason(reason);
    if (reasonError) { setError(reasonError); return; }
    if (confirmation !== team.team_name) { setError("팀 이름을 정확히 입력하세요."); return; }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await deleteAdminTeam(team.team_id, reason.trim());
      if (!isSuccess(response.data)) throw Object.assign(new Error(response.data?.message), { response });
      onDeleted();
    } catch (requestError) {
      setError(teamManagementError(requestError, "delete"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <AdminDialog title="팀 영구 삭제" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="flex flex-col gap-3 font-song-myung text-sm">
        <p className="m-0 font-bold text-admin-failed">이 작업은 되돌릴 수 없습니다.</p>
        <p className="m-0">삭제 대상: <strong>{team.team_name}</strong> / 팀원 {team.member_count ?? team.members?.length ?? 0}명</p>
        <p className="m-0">소속 계정, 팀 풀이 기록, 마일리지, 결제 기록, 보드 기록이 함께 삭제됩니다.</p>
        <label className="flex flex-col gap-1">삭제 사유 (필수, 1~500자)
          <textarea className={inputClass} rows={2} maxLength={500} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1">확인을 위해 팀 이름 <strong>{team.team_name}</strong>을 입력하세요
          <input className={inputClass} value={confirmation} disabled={busy} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        {error && <p role="alert" className="m-0 text-admin-failed">{error}</p>}
        <button type="submit" disabled={busy || confirmation !== team.team_name || !reason.trim()} className="self-end rounded border border-admin-failed px-3 py-1.5 text-admin-failed disabled:opacity-50">팀 영구 삭제</button>
      </form>
    </AdminDialog>
  );
}
