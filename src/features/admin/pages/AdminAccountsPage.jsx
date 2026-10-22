import { useRef, useState } from "react";
import { registerAdminAccount } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import AdminLayout, { AdminStatusMessage } from "../components/AdminLayout.jsx";
import useAdminTeamOptions from "../hooks/useAdminTeamOptions.js";
import { validateAdminAccount } from "../utils/adminValidation.js";
import ui from "../components/AdminWorkspace.module.css";

const INITIAL = { loginId: "", password: "", nickname: "", role: "PARTICIPANT", isLeader: false, teamMode: "NONE", teamId: "", teamName: "" };

export default function AdminAccountsPage() {
  const [form, setForm] = useState(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const pending = useRef(false);
  const teams = useAdminTeamOptions([result]);
  const validationError = validateAdminAccount(form);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (validationError) { setError(validationError); return; }
    pending.current = true;
    setIsSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await registerAdminAccount({
        loginId: form.loginId.trim(), password: form.password, nickname: form.nickname.trim(),
        role: form.role, isLeader: form.isLeader,
        teamId: form.teamMode === "EXISTING" ? form.teamId : undefined,
        teamName: form.teamMode === "NEW" ? form.teamName.trim() : undefined,
      });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "계정 등록에 실패했습니다");
      setResult(response.data.data);
      setForm(INITIAL);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "계정 등록에 실패했습니다");
    } finally { pending.current = false; setIsSubmitting(false); }
  };

  return <AdminLayout title="계정 등록">
    <form onSubmit={handleSubmit} className={`${ui.card} ${ui.formCard}`}>
      <fieldset disabled={isSubmitting} className={`${ui.cardBody} ${ui.formStack}`}>
        <div className={`${ui.formGrid} ${ui.formGrid2}`}>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>아이디</span>
            <input required maxLength={100} value={form.loginId} onChange={(event) => update("loginId", event.target.value)} autoComplete="off" className={ui.input}/>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>비밀번호 <small>8~128자</small></span>
            <input required type="password" minLength={8} maxLength={256} value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" className={ui.input}/>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>닉네임</span>
            <input required maxLength={100} value={form.nickname} onChange={(event) => update("nickname", event.target.value)} className={ui.input}/>
          </label>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>권한</span>
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value, isLeader: event.target.value === "ADMIN" ? false : current.isLeader }))} className={ui.select}>
              <option value="PARTICIPANT">PARTICIPANT</option><option value="ADMIN">ADMIN</option>
            </select>
          </label>
        </div>
        <label className={ui.check}>
          <input type="checkbox" disabled={form.role === "ADMIN"} checked={form.isLeader} onChange={(event) => update("isLeader", event.target.checked)}/>팀장으로 등록
        </label>
        <fieldset className={ui.teamModes}>
          <legend className={ui.fieldLabel}>소속 팀</legend>
          <label className={ui.check}><input type="radio" name="team-mode" checked={form.teamMode === "NONE"} onChange={() => update("teamMode", "NONE")}/> 무소속으로 등록</label>
          <label className={ui.check}><input type="radio" name="team-mode" checked={form.teamMode === "EXISTING"} onChange={() => update("teamMode", "EXISTING")}/> 기존 팀에 합류</label>
          {form.teamMode === "EXISTING" && <div className={ui.teamModeDetail}>
            <AdminStatusMessage status={teams.status} error={teams.error} onRetry={teams.retry}/>
            <select aria-label="소속 팀 선택" required value={form.teamId} onChange={(event) => update("teamId", event.target.value)} disabled={teams.status !== "success"} className={ui.select}>
              <option value="">선택</option>
              {(teams.data?.teams ?? []).map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
            </select>
          </div>}
          <label className={ui.check}><input type="radio" name="team-mode" checked={form.teamMode === "NEW"} onChange={() => update("teamMode", "NEW")}/> 새 팀 만들어서 등록</label>
          {form.teamMode === "NEW" && <div className={ui.teamModeDetail}>
            <input aria-label="새 팀 이름" required maxLength={100} placeholder="새 팀 이름 (1~100자)" value={form.teamName} onChange={(event) => update("teamName", event.target.value)} className={ui.input}/>
          </div>}
        </fieldset>
      </fieldset>
      <div className={ui.cardFooter}>
        <div className={ui.formFeedback}>
          {form.loginId && form.password && form.nickname && validationError && <p className={ui.fieldHint}>{validationError}</p>}
          {error && <p role="alert" className={ui.errorText}>{error}</p>}
          {result && <p role="status" className={ui.successText}>등록 완료: {result.login_id} ({result.nickname}) {result.team_name || "무소속"}</p>}
        </div>
        <button type="submit" disabled={isSubmitting || Boolean(validationError)} className={ui.primary}>{isSubmitting ? "등록 중" : "계정 등록"}</button>
      </div>
    </form>
  </AdminLayout>;
}
