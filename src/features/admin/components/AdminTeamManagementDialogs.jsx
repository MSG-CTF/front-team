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
import { AdminReasonField } from "./AdminFormParts.jsx";
import { REASON_PRESETS } from "../utils/adminReasons.js";
import ui from "./AdminWorkspace.module.css";

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
      <form onSubmit={submit} className={ui.formStack}>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>팀 이름</span>
          <input className={ui.input} value={teamName} maxLength={100} disabled={busy} onChange={(event) => setTeamName(event.target.value)} />
        </label>
        <fieldset className={ui.field} disabled={busy}>
          <legend className={ui.fieldLabel}>팀에서 제외할 팀원</legend>
          <div className={ui.choiceList}>
            {(team.members ?? []).map((member) => (
              <label key={member.user_id} className={ui.check}>
                <input type="checkbox" checked={removedIds.includes(member.user_id)} onChange={(event) => {
                  setRemovedIds((current) => event.target.checked
                    ? [...current, member.user_id] : current.filter((id) => id !== member.user_id));
                  if (event.target.checked && leaderUserId === member.user_id) setLeaderUserId("");
                }} />
                <span>{member.nickname} <span className={ui.muted}>({member.login_id || member.user_id})</span>{member.is_leader ? " · 현재 팀장" : ""}{member.role === "ADMIN" ? " · 관리자" : ""}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>무소속 참가자 추가 <small>user_id</small></span>
          <textarea className={ui.textarea} rows={2} value={addUserIds} disabled={busy} onChange={(event) => setAddUserIds(event.target.value)} placeholder="UUID를 쉼표 또는 줄바꿈으로 구분" />
          <span className={ui.fieldHint}>참가자 목록 조회 API가 없어 user_id를 직접 입력합니다 다른 팀 소속 계정은 기존 팀에서 먼저 제외해야 합니다</span>
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>변경 후 팀장</span>
          <select className={ui.select} value={leaderUserId} disabled={busy} onChange={(event) => setLeaderUserId(event.target.value)}>
            <option value="">팀장 공석</option>
            {remainingMembers.map((member) => <option key={member.user_id} value={member.user_id}>{member.nickname} ({member.login_id || member.user_id})</option>)}
            {additions.map((id) => <option key={id} value={id}>추가 계정 {id}</option>)}
          </select>
        </label>
        <AdminReasonField label="변경 사유" note="필수, 1~500자" value={reason} onChange={setReason} presets={REASON_PRESETS.teamEdit}
          multiline disabled={busy} hint="소속 또는 팀장 정보가 변경된 팀원은 다시 로그인해야 변경사항이 반영됩니다" />
        {error && <p role="alert" className={ui.callout} data-tone="bad">{error}</p>}
        <div className={ui.formActions}>
          <button type="button" onClick={onClose} disabled={busy} className={ui.button}>취소</button>
          <button type="submit" disabled={busy} className={ui.primary}>변경 저장</button>
        </div>
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
    if (confirmation !== team.team_name) { setError("팀 이름을 정확히 입력하세요"); return; }
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
      <form onSubmit={submit} className={ui.formStack}>
        <div className={ui.callout} data-tone="bad">
          <strong>이 작업은 되돌릴 수 없습니다</strong> 소속 계정, 팀 풀이 기록, 마일리지, 결제 기록, 보드 기록이 함께 삭제됩니다
        </div>
        <p className={ui.dialogLead}>삭제 대상 <strong>{team.team_name}</strong> · 팀원 {team.member_count ?? team.members?.length ?? 0}명</p>
        <AdminReasonField label="삭제 사유" note="필수, 1~500자" value={reason} onChange={setReason} presets={REASON_PRESETS.teamDelete} multiline disabled={busy} />
        <label className={ui.field}>
          <span className={ui.fieldLabel}>확인을 위해 팀 이름 <strong>{team.team_name}</strong>을 입력하세요</span>
          <input className={ui.input} value={confirmation} disabled={busy} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        {error && <p role="alert" className={ui.callout} data-tone="bad">{error}</p>}
        <div className={ui.formActions}>
          <button type="button" onClick={onClose} disabled={busy} className={ui.button}>취소</button>
          <button type="submit" disabled={busy || confirmation !== team.team_name || !reason.trim()} className={ui.dangerSolid}>팀 영구 삭제</button>
        </div>
      </form>
    </AdminDialog>
  );
}
